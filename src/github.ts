import * as vscode from 'vscode';

const AnswerYes = 'Yes';
const AnswerNo = 'No';

let session: vscode.AuthenticationSession | null = null;

export function isAuthenticated() {
	return !!session;
}


export function getAccessToken() {
	return session ? session.accessToken : null;
}

export async function tryGetGithubSession() {

	// prompt for authenticate?
	const answer = await vscode.window.showInformationMessage(
		'gitignore extension: GitHub API rate limit reached. Do you want to authenticate with GitHub?',
		// { modal: true },
		AnswerYes,
		AnswerNo);
	if (answer !== AnswerYes) {
		return null;
	}

	// request github credentials
	const newSession = await vscode.authentication.getSession('github', [], { createIfNone: true });
	if (newSession === null) {
		return null;
	}

	session = newSession;
	return session.accessToken;
}
