import * as vscode from 'vscode';

import { Cache } from '../cache';
import { GitignoreCreationWorker } from '../gitignore-creation-worker';
import { GitignoreProvider } from '../interfaces';
import { WebFileProvider } from '../providers/file-provider-web';
import { GithubGitignoreApiWebProvider } from '../providers/github-gitignore-api-web';

// Initialize
const config = vscode.workspace.getConfiguration('gitignore');
const cache = new Cache(config.get('cacheExpirationInterval', 3600));

const gitignoreProvider: GitignoreProvider = new GithubGitignoreApiWebProvider(cache);

const gitignoreCreationWorker = new GitignoreCreationWorker({
    gitignoreProvider: gitignoreProvider,
    fileProvider: new WebFileProvider(),
});

export function activate(context: vscode.ExtensionContext) {
    console.log('vscode-gitignore: extension is now active!');

    const disposable = vscode.commands.registerCommand('gitignore.addgitignore', async () => {
        gitignoreCreationWorker.createGitignore();
    });

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
    console.log('vscode-gitignore: extension is now deactivated!');
}