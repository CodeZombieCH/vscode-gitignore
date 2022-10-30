import * as vscode from 'vscode';

import { GitignoreQuickPickItem, GitignoreTemplate, GitignoreOperation, GitignoreOperationType, IGitignoreCreationWorkerContext, FileProvider, GitignoreProvider } from './interfaces';

class CancellationError extends Error {

}

export class GitignoreCreationWorker {

    private readonly fileProvider: FileProvider;
    private readonly gitignoreProvider: GitignoreProvider;

    constructor(context: IGitignoreCreationWorkerContext) {
        this.fileProvider = context.fileProvider;
        this.gitignoreProvider = context.gitignoreProvider;
    }

    public async createGitignore() {
        try {
            // Check if workspace open
            if (!vscode.workspace.workspaceFolders) {
                await vscode.window.showErrorMessage('No workspace/directory open');
                return;
            }

            // Load templates
            const templates = await this.gitignoreProvider.getTemplates();

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
            const { template, uri } = await this.resolveWorkspaceFolder(selectedItem.template);

            // Calculate operation
            console.log(`vscode-gitignore: add/append gitignore for directory: ${uri.path}`);
            const operation = await this.checkExistenceAndPromptForOperation(uri, template);

            // Store the file on file system
            await this.gitignoreProvider.download(operation);

			// Refresh file explorer
			await vscode.commands.executeCommand('workbench.files.action.refreshFilesExplorer');

            // Show success message
            await this.showSuccessMessage(operation);
        }
        catch (error) {
            if (error instanceof CancellationError) {
                return;
            }

            await vscode.window.showErrorMessage(String(error));
        }
    }

    /**
     * Resolves the workspace folder by
     * - using the single opened workspace
     * - prompting for the workspace to use when multiple workspaces are open
     */
    private async resolveWorkspaceFolder(gitIgnoreTemplate: GitignoreTemplate) {
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
            return { template: gitIgnoreTemplate, uri: folders[0].uri };
        }
        else {
            const folder = await vscode.window.showWorkspaceFolderPick();
            if (!folder) {
                throw new CancellationError();
            }
            return { template: gitIgnoreTemplate, uri: folder.uri };
        }
    }

    private async checkExistenceAndPromptForOperation(uri: vscode.Uri, template: GitignoreTemplate): Promise<GitignoreOperation> {
        uri = vscode.Uri.joinPath(uri, ".gitignore");

        const exists = await this.fileProvider.checkIfFileExists(uri);
        if (!exists) {
            // File does not exists -> we are fine to create it
            return { uri, template, type: GitignoreOperationType.Overwrite };
        }

        const operation = await this.promptForOperation();
        if (!operation) {
            throw new CancellationError();
        }
        const typedString = <keyof typeof GitignoreOperationType>operation.label;
        const type = GitignoreOperationType[typedString];

        return { uri, template, type };
    }

    private async promptForOperation() {
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

    private async showSuccessMessage(operation: GitignoreOperation) {
        switch (operation.type) {
            case GitignoreOperationType.Append:
                return vscode.window.showInformationMessage(`Appended ${operation.template.path} to the existing .gitignore in the project root`);
            case GitignoreOperationType.Overwrite:
                return vscode.window.showInformationMessage(`Created .gitignore file in the project root based on ${operation.template.path}`);
            default:
                throw new Error('Unsupported operation');
        }
    }

}

