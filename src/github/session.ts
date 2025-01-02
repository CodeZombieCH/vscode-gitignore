import { IncomingHttpHeaders } from 'http';
import * as vscode from 'vscode';

const AnswerYes = 'Yes';
const AnswerNo = 'No';

const GitHubRateLimitHeader = 'x-ratelimit-remaining';


export class GithubApiRateLimitReached extends Error {
	constructor(message: string) {
		super(message);
	}
}

/**
 *
 * Designed to live as long as vscode is open
 */
export class GithubContext {

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

	/**
	 * Flag indicating if we run into the rate limit and should use an authenticated client
	 */
	useAuthenticationProvider = false; /* Start unauthenticated */

	/**
	 * Flag indicating if user agreed to use the GitHub authentication provider
	 */
	hasUserAgreed = false;

	session: vscode.AuthenticationSession | null = null;

	/**
	 * Try to acquire a GitHub access token
	 * @returns
	 */
	async tryGetGithubToken() {
		// prompt for authenticate?
		const answer = await vscode.window.showInformationMessage(
			'GitHub API rate limit reached. Do you want to authenticate with GitHub?',
			// { modal: true },
			AnswerYes,
			AnswerNo);
		if (answer !== AnswerYes) {
			return null;
		}

		console.log('user agreed to use GitHub authentication provider');
		this.hasUserAgreed = true;
		this.useAuthenticationProvider = true;

		// request github credentials
		const newSession = await vscode.authentication.getSession('github', [], { createIfNone: true });
		if (newSession === null) {
			return null;
		}

		this.session = newSession;
		return this.session.accessToken;
	}

	isAuthenticated() {
		return this.hasUserAgreed && !!this.session;
	}

	private getAccessToken() {
		return this.session ? this.session.accessToken : null;
	}

	private async getAccessTokenAsync() {
		if(this.useAuthenticationProvider && this.hasUserAgreed) {
			if(this.session) {
				// If we already have a vscode session, return access token from it
				return this.session.accessToken;
			}
			else {
				// If we do not have a vscode session, acquire session and return token from it
				const newSession = await vscode.authentication.getSession('github', [], { createIfNone: true });
				if (newSession === null) {
					return null;
				}

				this.session = newSession;
				return this.session.accessToken;
			}
		}
		else {
			return null;
		}
	}


	checkRateLimit(headers: IncomingHttpHeaders) {
		const rateLimitRemainingRaw = headers[GitHubRateLimitHeader];

		if (rateLimitRemainingRaw === undefined) {
			return undefined;
		}

		const rateLimitRemaining = Number.parseInt(rateLimitRemainingRaw as string);
		console.log(`vscode-gitignore: GitHub API rate limit remaining: ${rateLimitRemaining}`);

		// if (rateLimitRemaining < 1) {
		// 	throw new GithubApiRateLimitReached('GitHub API rate limit reached');
		// }

		if (rateLimitRemaining < 55) {
			throw new GithubApiRateLimitReached('GitHub API rate limit reached');
		}

		return rateLimitRemaining;
	}

	private getAuthorizationHeaderValue() {
		// Use vscode authentication provider
		const accessToken = this.getAccessToken();
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

	private async getAuthorizationHeaderValueAsync() {
		// Use vscode authentication provider
		const accessToken = await this.getAccessTokenAsync();
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

	getHeaders() : Record<string, string> {
		let headers = {};

		// Add authorization header if authorization is available
		const authorizationHeaderValue = this.getAuthorizationHeaderValue();
		if (authorizationHeaderValue) {
			console.log('vscode-gitignore: setting authorization header');
			headers = { ...headers, 'Authorization': authorizationHeaderValue };
		}

		return headers;
	}

	async getHeadersAsync() : Promise<Record<string, string>> {
		let headers = {};

		// Add authorization header if authorization is available
		const authorizationHeaderValue = await this.getAuthorizationHeaderValueAsync();
		if (authorizationHeaderValue) {
			console.log('vscode-gitignore: setting authorization header');
			headers = { ...headers, 'Authorization': authorizationHeaderValue };
		}

		return headers;
	}
}
