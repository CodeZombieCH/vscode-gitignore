import { IncomingHttpHeaders } from 'http';
import * as vscode from 'vscode';

const AnswerYes = 'Yes';
const AnswerNo = 'No';

const GitHubRateLimitHeader = 'x-ratelimit-remaining';

/**
 * Thrown when the GitHub API rate limit has been reached
 */
export class GithubApiRateLimitReached extends Error {
	constructor(message: string) {
		super(message);
	}
}

/**
 * Thrown when a user cancels the request to authenticate with GitHub
 */
export class AuthenticationCancellationError extends Error {

}


/**
 * A context for the interaction of the user with GitHub
 *
 * Designed to live as long as vscode is open
 */
export class GithubContext {
	/**
	 * Flag indicating if we run into the rate limit and should use an authenticated client
	 */
	useAuthenticationProvider = false; /* Start unauthenticated */

	/**
	 * Flag indicating if user agreed to use the GitHub authentication provider
	 */
	hasUserAgreed = false;
}

/**
 * A class representing a Github session with it's corresponding vscode.AuthenticationSession (access token).
 * At the beginning, the session will be unauthenticated.
 * When it reaches the ratelimit, it will prompt for authentication and continue to use the access token from the authenticated session.
 *
 * I normal scenarios, the session should always stay unauthenticated. In scenarios where a lot of user access GitHub from the same IP,
 * it is likely the rate limit will be hit. Authenticating with GitHub will switch from a per IP context to a per user context,
 * with much higher rate limit (50 vs 5000 at the time of writing).
 *
 * Designed to live during the execution of a command.
 */
export class GithubSession {

	readonly context: GithubContext;

	/**
	 * The promise that eventually resolves to a session.
	 *
	 * MOTIVATION:
	 * Instead of caching the session, which acquisition might take some time, resulting it being called multiple times,
	 * we cache the promise/thenable to get the session. Once it is resolved, it will return the same result immediately
	 * to all callers.
	 * In other words, we can "race" multiple calls for the promise to be resolved without triggering the execution multiple times.
	 */
	private _sessionPromise: Thenable<vscode.AuthenticationSession | undefined> | null  = null;

	/**
	 * Authentication session (lazy loaded)
	 * @deprecated
	 */
	private session: vscode.AuthenticationSession | null = null;

	constructor(context: GithubContext) {
		this.context = context;
	}

	/**
	 * Try to acquire a GitHub access token
	 * @returns
	 */
	async tryGetGithubToken() {
		this.context.useAuthenticationProvider = true;

		// prompt for authenticate?
		const answer = await vscode.window.showInformationMessage(
			'GitHub API rate limit reached. Do you want to authenticate with GitHub?',
			// { modal: true },
			AnswerYes,
			AnswerNo);
		if (answer !== AnswerYes) {
			this.context.hasUserAgreed = false;
			console.log('vscode-gitignore: user disagreed to use GitHub authentication provider');
			throw new AuthenticationCancellationError();
		}

		this.context.hasUserAgreed = true;
		console.log('vscode-gitignore: user agreed to use GitHub authentication provider');

		// request github credentials
		try {
			// Lazy load
			if(this._sessionPromise === null) {
				// DO NOT AWAIT HERE!
				this._sessionPromise = vscode.authentication.getSession('github', [], { createIfNone: true });
				console.info('vscode-gitignore: acquiring session from authentication provider');
			}

			const session = await this._sessionPromise;
			if (session) {
				return session.accessToken;
			}
			return null;
		}
		catch(error) {
			if(error instanceof Error && error.message === 'Cancelled') {
				throw new AuthenticationCancellationError();
			} else {
				throw error;
			}
		}
	}

	async isAuthenticated() {
		return this.context.hasUserAgreed && !!(await this.getAccessToken());
	}

	/**
	 *
	 * @deprecated
	 */
	private getAccessTokenSync() {
		console.log(this.session ? this.session.accessToken : null);
		return this.session ? this.session.accessToken : null;
	}

	/**
	 * Gets an access token silently, assuming the user is already signed in
	 * @returns
	 */
	private async getAccessToken() {
		if(this.context.useAuthenticationProvider && this.context.hasUserAgreed) {
			// Lazy load
			if(this._sessionPromise === null) {
				// DO NOT AWAIT HERE!
				this._sessionPromise = vscode.authentication.getSession('github', [], { createIfNone: false });
				console.info('vscode-gitignore: acquiring session from authentication provider');
			}

			const session = await this._sessionPromise;
			if (session) {
				console.info('vscode-gitignore: session acquired from authentication provider');
				return session.accessToken;
			}
		}

		return null;
	}

	/**
	 *
	 * @param headers Check the current GitHub API rate limit by parsing the corresponding response header
	 * @returns Rate limit
	 */
	checkRateLimit(headers: IncomingHttpHeaders) {
		const rateLimitRemainingRaw = headers[GitHubRateLimitHeader];

		if (rateLimitRemainingRaw === undefined) {
			return undefined;
		}

		const rateLimitRemaining = Number.parseInt(rateLimitRemainingRaw as string);
		console.info(`vscode-gitignore: GitHub API rate limit remaining: ${rateLimitRemaining}`);

		if (rateLimitRemaining < 1) {
			throw new GithubApiRateLimitReached('GitHub API rate limit reached');
		}

		// if (rateLimitRemaining < 60) {
		// 	throw new GithubApiRateLimitReached('GitHub API rate limit reached');
		// }

		return rateLimitRemaining;
	}

	/**
	 *
	 * @deprecated
	 */
	private getAuthorizationHeaderValueSync() {
		// Use vscode authentication provider
		const accessToken = this.getAccessTokenSync();
		if (accessToken) {
			return 'Token ' + accessToken;
		}

		// Use env var
		if (process.env.GITHUB_AUTHORIZATION) {
			return process.env.GITHUB_AUTHORIZATION;
		}
		else {
			return null;
		}
	}

	private async getAuthorizationHeaderValue() {
		// Use vscode authentication provider
		const accessToken = await this.getAccessToken();
		if (accessToken) {
			return 'Token ' + accessToken;
		}

		// Use env var
		if (process.env.GITHUB_AUTHORIZATION) {
			return process.env.GITHUB_AUTHORIZATION;
		}
		else {
			return null;
		}
	}

	/**
	 *
	 * @deprecated
	 */
	getHeadersSync() : Record<string, string> {
		let headers = {};

		// Add authorization header if authorization is available
		const authorizationHeaderValue = this.getAuthorizationHeaderValueSync();
		if (authorizationHeaderValue) {
			console.log('vscode-gitignore: setting authorization header');
			headers = { ...headers, 'Authorization': authorizationHeaderValue };
		}

		return headers;
	}

	async getHeaders() : Promise<Record<string, string>> {
		let headers = {};

		// Add authorization header if authorization is available
		const authorizationHeaderValue = await this.getAuthorizationHeaderValue();
		if (authorizationHeaderValue) {
			console.log('vscode-gitignore: setting authorization header');
			headers = { ...headers, 'Authorization': authorizationHeaderValue };
		}

		return headers;
	}
}
