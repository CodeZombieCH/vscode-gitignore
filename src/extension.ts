import * as vscode from 'vscode';
import * as fs from 'fs';
import { join as joinPath } from 'path';

import { Cache } from './cache';
import { GitignoreTemplate, GitignoreOperation, GitignoreOperationType, GitignoreProvider } from './interfaces';
import { GithubGitignoreRepositoryProviderV2 } from './providers/github-gitignore-repository-v2';
import { AuthenticationCancellationError, GithubApiRateLimitReached, GithubContext, GithubSession } from './github/session';


class CancellationError extends Error {

}

interface GitignoreQuickPickItem extends vscode.QuickPickItem {
	template: GitignoreTemplate;
}


// Initialize cache
// The cache is the only instance shared across the whole lifetime of the extension
// Everything else should be scoped to the invocation of a command
const cache = createCache();


function createCache() : Cache {
	const config = vscode.workspace.getConfiguration('gitignore');

	const cacheExpirationInterval = config.get('cacheExpirationInterval', 3600);
	console.log(`vscode-gitignore: creating cache with cacheExpirationInterval: ${cacheExpirationInterval}`);

	return new Cache(cacheExpirationInterval);
}

/**
 * Create a cache that never caches, used for testing only
 * @returns
 */
function createNeverUsedCache() : Cache {
	const cacheExpirationInterval = 0;
	console.log(`vscode-gitignore: creating cache with cacheExpirationInterval: ${cacheExpirationInterval}`);

	return new Cache(cacheExpirationInterval);
}

/**
 * Resolves the workspace folder by
 * - using the single opened workspace
 * - prompting for the workspace to use when multiple workspaces are open
 */
async function resolveWorkspaceFolder(gitIgnoreTemplate: GitignoreTemplate) {
	const folders = vscode.workspace.workspaceFolders;
	// folders being falsy can have two reasons:
	// 1. no folder (workspace) open
	//    --> should never be the case as already handled before
	// 2. the version of vscode does not support the workspaces
	//    --> should never be the case as we require a vscode with support for it
	if (!folders) {
		throw new CancellationError();
	}
	else if (folders.length === 1) {
		return { template: gitIgnoreTemplate, path: folders[0].uri.fsPath };
	}
	else {
		const folder = await vscode.window.showWorkspaceFolderPick();
		if (!folder) {
			throw new CancellationError();
		}
		return { template: gitIgnoreTemplate, path: folder.uri.fsPath };
	}
}

function checkIfFileExists(path: string) {
	return new Promise<boolean>((resolve) => {
		fs.stat(path, (err) => {
			if (err) {
				// File does not exists
				return resolve(false);
			}
			return resolve(true);
		});
	});
}

async function checkExistenceAndPromptForOperation(path: string, template: GitignoreTemplate): Promise<GitignoreOperation> {
	path = joinPath(path, '.gitignore');

	const exists = await checkIfFileExists(path);
	if (!exists) {
		// File does not exists -> we are fine to create it
		return { path, template, type: GitignoreOperationType.Overwrite };
	}

	const operation = await promptForOperation();
	if (!operation) {
		throw new CancellationError();
	}
	const typedString = <keyof typeof GitignoreOperationType>operation.label;
	const type = GitignoreOperationType[typedString];

	return { path, template, type };
}

export async function downloadGitignoreFile(gitignoreRepository: GitignoreProvider, operation: GitignoreOperation) {
	const flags = operation.type === GitignoreOperationType.Overwrite ? 'w' : 'a';
	const fileStream = fs.createWriteStream(operation.path, { flags: flags });

	// If appending to the existing .gitignore file, write a NEWLINE as separator
	if(flags === 'a') {
		fileStream.write('\n');
	}

	try {
		// Store the file on file system
		await gitignoreRepository.downloadToStream(operation.template.path, fileStream);
	}
	catch(error) {
		// Delete the .gitignore file if we created it
		if(flags === 'w') {
			fs.unlink(operation.path, err => {
				if(err) {
					console.error(`vscode-gitignore: ${err.message}`);
				}
			});
		}
		throw error;
	}
}

function promptForOperation() {
	return vscode.window.showQuickPick([
		{
			label: 'Append',
			description: 'Append to existing .gitignore file'
		},
		{
			label: 'Overwrite',
			description: 'Overwrite existing .gitignore file'
		}
	]);
}

function showSuccessMessage(operation: GitignoreOperation) {
	switch (operation.type) {
		case GitignoreOperationType.Append:
			return vscode.window.showInformationMessage(`Appended ${operation.template.path} to the existing .gitignore in the project root`);
		case GitignoreOperationType.Overwrite:
			return vscode.window.showInformationMessage(`Created .gitignore file in the project root based on ${operation.template.path}`);
		default:
			throw new Error('Unsupported operation');
	}
}

export function activate(context: vscode.ExtensionContext) {
	console.log('vscode-gitignore: extension activated');

	const githubContext = new GithubContext();

	const disposable = vscode.commands.registerCommand('gitignore.addgitignore', async () => {
		const githubSession = new GithubSession(githubContext);

		try {
			// Check if workspace open
			if (!vscode.workspace.workspaceFolders) {
				await vscode.window.showErrorMessage('No workspace/directory open');
				return;
			}

			// Create gitignore repository provider
			const gitignoreRepository: GitignoreProvider = new GithubGitignoreRepositoryProviderV2(cache, githubSession);

			// Load templates
			const templates = await gitignoreRepository.getTemplates();

			// Let the user pick a gitignore file
			const items = templates.map(t => <GitignoreQuickPickItem>{
				label: t.name,
				description: t.path,
				url: t.download_url,
				template: t
			});
			// TODO: use thenable for items
			const selectedItem = await vscode.window.showQuickPick(items);

			// Check if the user picked up a gitignore file fetched from Github
			if (!selectedItem) {
				throw new CancellationError();
			}

			// Resolve the path to the folder where we should write the gitignore file
			const { template, path } = await resolveWorkspaceFolder(selectedItem.template);

			// Calculate operation
			console.log(`vscode-gitignore: add/append gitignore for directory: ${path}`);
			const operation = await checkExistenceAndPromptForOperation(path, template);

			// Store the file on file system
			await downloadGitignoreFile(gitignoreRepository, operation);

			// Show success message
			await showSuccessMessage(operation);
		}
		catch (error) {
			if (error instanceof CancellationError) {
				console.info('vscode-gitignore: command cancelled');
				return;
			}
			else if (error instanceof GithubApiRateLimitReached) {
				console.error('vscode-gitignore: GitHub API rate limit reached');

				// In case we are already authenticated, there is no other way to continue
				// => fail with error message
				if (await githubSession.isAuthenticated()) {
					await vscode.window.showErrorMessage('GitHub API rate limit reached');
					return;
				}

				// In case we are not authenticated yet, we can continue by trying to authenticate
				try {
					const token = await githubSession.tryGetGithubToken();
					if(token) {
						console.info('vscode-gitignore: acquiring GitHub access token succeeded');
						await vscode.window.showInformationMessage('Acquired GitHub access token. Please try again.');
					}
					else {
						console.error('vscode-gitignore: acquiring GitHub access token failed');
						await vscode.window.showErrorMessage('Acquiring GitHub access token failed');
					}
				}
				catch(error) {
					if (error instanceof CancellationError) {
						console.info('vscode-gitignore: command cancelled');
					}
					else if (error instanceof AuthenticationCancellationError) {
						console.info('vscode-gitignore: acquiring GitHub access token cancelled');
					}
					else {
						console.error('vscode-gitignore: ', error);
						await vscode.window.showErrorMessage(String(error));
					}
				}
			}
			else {
				console.error('vscode-gitignore: ', error);
				await vscode.window.showErrorMessage(String(error));
			}
		}
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
	console.log('vscode-gitignore: extension is now deactivated!');
}
