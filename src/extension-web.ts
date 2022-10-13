// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand('gitignore.addgitignore', async () => {
        await vscode.window.showInformationMessage("Hello gitignore");
    }));
}
