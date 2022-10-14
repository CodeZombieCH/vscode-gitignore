// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

    context.subscriptions.push(vscode.commands.registerCommand('gitignore.addgitignore', async () => {
        const folder = await getFolder();
        if (!folder) {
            return;
        }

        const newUri = vscode.Uri.joinPath(folder.uri, ".gitignore");

        if (!vscode.workspace.fs.isWritableFileSystem(newUri.scheme)) {
            vscode.window.showErrorMessage("Couldn't create the file.");
            return;
        }

        const chosenTemplate = await getChosenTemplate();

        const doesGitignoreFileExist = await doesFileExist(newUri);
        console.log(doesGitignoreFileExist);

        if (doesGitignoreFileExist) {
            // Overwrite or append
            const operation = await vscode.window.showQuickPick(['Append', 'Overwrite']);
            if (operation === "Overwrite") {
                await replaceFile(newUri, chosenTemplate);
            }
            else if (operation == 'Append') {
                await appendTo(newUri, chosenTemplate);
            }
            return;
        }
        else {
            await replaceFile(newUri, chosenTemplate);
        }
    }));
}

async function appendTo(uri: vscode.Uri, chosenTemplate: string | undefined) {
    const currentContent = await vscode.workspace.fs.readFile(uri);
    const newContent = await getGitignoreFile(chosenTemplate);
    const textEncoder = new TextEncoder();
    const newLine = textEncoder.encode('\n');
    const result = mergeDocuments(currentContent, newLine, newContent)
    await vscode.workspace.fs.writeFile(uri, result);
}

function mergeDocuments(first: Uint8Array, second: Uint8Array, third: Uint8Array) {
    var mergedArray = new Uint8Array(first.length + second.length + third.length);
    mergedArray.set(first);
    mergedArray.set(second, first.length);
    mergedArray.set(third, first.length + second.length);
    return mergedArray;
}

async function replaceFile(uri: vscode.Uri, chosenTemplate: string | undefined) {
    const file = await getGitignoreFile(chosenTemplate);
    await vscode.workspace.fs.writeFile(uri, file);
}

async function doesFileExist(uri: vscode.Uri): Promise<boolean> {
    return vscode.workspace.fs.stat(uri).then(_x => true, _err => false);
}

async function getFolder() {
    const folders = vscode.workspace.workspaceFolders
    if (!folders) {
        vscode.window.showErrorMessage("No folders.");
        return;
    }
    else if (folders.length === 1) {
        return folders[0];
    }
    else {
        const folder = await vscode.window.showWorkspaceFolderPick();
        if (!folder) {
            vscode.window.showErrorMessage("No folder selected.");
            return;
        }
        return folder;
    }
}

async function getChosenTemplate() {
    const templatesResponse = await fetch('https://api.github.com/gitignore/templates');
    const templates = <Array<string>>await templatesResponse.json();
    const chosenTemplate = await vscode.window.showQuickPick(templates, { canPickMany: false });
    return chosenTemplate;
}

async function getGitignoreFile(templateName: string | undefined) {
    const response = await fetch(`https://api.github.com/gitignore/templates/${templateName}`,
        { headers: { 'Accept': 'application/vnd.github.v3.raw' } });

    const template = await response.blob();
    const arrayBuffer = await template.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    return uint8Array;
}