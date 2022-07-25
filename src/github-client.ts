import { IncomingHttpHeaders } from 'http';
import * as vscode from 'vscode';

import * as httpClient from './http-client';


const AnswerYes = 'Yes';
const AnswerNo = 'No';

const GitHubRateLimitHeader = 'x-ratelimit-remaining';


export class GithubApiRateLimitReached extends Error {
	constructor(message: string) {
		super(message);
	}
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
let useAuthenticationProvider = false;

// TODO: do not store session, request it every time.
// This avoids weird behavior when logging in/out without restarting vscode.
let session: vscode.AuthenticationSession | null = null;

export function isAuthenticated() {
	return !!session;
}

export function getAccessToken() {
	return session ? session.accessToken : null;
}

export async function tryGetGithubToken() {
	// prompt for authenticate?
	const answer = await vscode.window.showInformationMessage(
		'GitHub API rate limit reached. Do you want to authenticate with GitHub?',
		// { modal: true },
		AnswerYes,
		AnswerNo);
	if (answer !== AnswerYes) {
		return null;
	}

	useAuthenticationProvider = true;

	// request github credentials
	const newSession = await vscode.authentication.getSession('github', [], { createIfNone: true });
	if (newSession === null) {
		return null;
	}

	session = newSession;
	return session.accessToken;
}

export function checkRateLimit(headers: IncomingHttpHeaders) {
	const rateLimitRemainingRaw = headers[GitHubRateLimitHeader];

	if (rateLimitRemainingRaw === undefined) {
		return undefined;
	}

	const rateLimitRemaining = Number.parseInt(rateLimitRemainingRaw as string);
	console.log(`vscode-gitignore: GitHub API rate limit remaining: ${rateLimitRemaining}`);

	// eslint-disable-next-line no-constant-condition
	if (true /*ratelimitRemaining < 1*/) {
		throw new GithubApiRateLimitReached('GitHub API rate limit reached');
	}

	return rateLimitRemaining;
}

function getAuthorizationHeaderValue() {
	// Use vscode authentication provider
	const accessToken = getAccessToken();
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

export function getDefaultHeaders() {
	let headers = httpClient.getDefaultHeaders();

	// Add authorization header if authorization is available
	const authorizationHeaderValue = getAuthorizationHeaderValue();
	if (authorizationHeaderValue) {
		console.log('vscode-gitignore: setting authorization header');
		headers = { ...headers, 'Authorization': authorizationHeaderValue };
	}

	return headers;
}
