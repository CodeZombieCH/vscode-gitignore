import * as vscode from 'vscode';

const AnswerYes = 'Yes';
const AnswerNo = 'No';

/**
 * Error thrown when a user cancels the request to authenticate with GitHub
 */
export class AuthenticationCancellationError extends Error {

}


/**
 * A context for the interaction of the user with GitHub
 *
 * Designed to live as long as the extension is active
 */
export class GithubContext {
	/**
	 * Flag indicating if we run into the rate limit and should use an authenticated client
	 */
	useAuthenticationProvider = false; /* Start unauthenticated */

	/**
	 * Flag indicating if user agreed to use the GitHub authentication provider.
	 * 
	 * As the GithubContext instance lives as long as the extension is active, the flag
	 * is kept only for the lifetime of a single vscode instance.
	 * This could be considered inconvenient, as the user would have to agree to use
	 * the GitHub authentication provider every time he opens a vscode instance and
	 * uses the extension.
	 * 
	 * TODO: Consider storing this flag using vscode settings.
	 */
	hasUserAgreed = false;
}

/**
 * A class representing a Github session with it's corresponding vscode.AuthenticationSession (access token).
 * At the beginning, the session will be unauthenticated.
 * When it reaches the ratelimit, it will prompt for authentication and continue to use the access token from the authenticated session.
 *
 * In normal scenarios, the session should always stay unauthenticated. In scenarios where a lot of user access GitHub from the same IP,
 * it is likely the rate limit will be hit. Authenticating with GitHub will switch from a per IP context to a per user context,
 * with considerable higher rate limit (50 vs 5000 at the time of writing).
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

	constructor(context: GithubContext) {
		this.context = context;
	}

	/**
	 * Try to acquire a GitHub access token
	 * @returns
	 */
	async tryGetGithubToken() {
		this.context.useAuthenticationProvider = true;

		if(!this.context.hasUserAgreed) {
			// Ask user if he wants to use authentication providers
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
		}

		// Request GitHub credentials
		try {
			// We always create a new session promise as this call to getSession() has `createIfNone: true` set
			// and the user agreed to create a session
			// DO NOT AWAIT HERE!
			this._sessionPromise = vscode.authentication.getSession('github', [], { createIfNone: true });
			console.info('vscode-gitignore: acquiring session from authentication provider');

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
