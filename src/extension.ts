import * as vscode from 'vscode';

import { Cache } from './cache';
import { StreamGitignoreProvider } from './interfaces';
import { GithubGitignoreRepositoryProvider } from './providers/github-gitignore-repository';
import { GitignoreCreationWorker } from './gitignore-creation-worker';
import { FsFileProvider } from './providers/file-provider-fs';

// Initialize
const config = vscode.workspace.getConfiguration('gitignore');
const cache = new Cache(config.get('cacheExpirationInterval', 3600));

// Create gitignore repository provider
const gitignoreRepository: StreamGitignoreProvider = new GithubGitignoreRepositoryProvider(cache);
//const gitignoreRepository : GitignoreProvider = new GithubGitignoreApiProvider(cache);

const gitignoreCreationWorker = new GitignoreCreationWorker({
	gitignoreProvider: gitignoreRepository,
	fileProvider: new FsFileProvider(),
});

export function activate(context: vscode.ExtensionContext) {
	console.log('vscode-gitignore: extension is now active!');

	const disposable = vscode.commands.registerCommand('gitignore.addgitignore', async () => {
		await gitignoreCreationWorker.createGitignore();
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
	console.log('vscode-gitignore: extension is now deactivated!');
}
