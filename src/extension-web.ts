// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    const scheme = 'gitignore';
    const contentProvider = new class implements vscode.TextDocumentContentProvider {
        // emitter and its event
        onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
        onDidChange = this.onDidChangeEmitter.event;

        async provideTextDocumentContent(): Promise<string> {
            const chosenTemplate = await getChosenTemplate();
            return await getGitignore(chosenTemplate);
        }
    };

    context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(scheme, contentProvider));

    context.subscriptions.push(vscode.commands.registerCommand('gitignore.addgitignore', async () => {
        const uri = vscode.Uri.parse(`${scheme}:.gitignore`);
        const doc = await vscode.workspace.openTextDocument(uri); // calls back into the provider

        await vscode.window.showTextDocument(doc, { preview: false });
    }));
}

async function getChosenTemplate() {
    const request: RequestInfo = 'https://api.github.com/gitignore/templates';
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const templatesResponse: Response = await fetch(request);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const templates = <Array<string>>await templatesResponse.json();
    const chosenTemplate  = await vscode.window.showQuickPick(templates, { canPickMany: false });
    return chosenTemplate;
}

async function getGitignore(templateName: string | undefined): Promise<string> {
    const request: RequestInfo = `https://api.github.com/gitignore/templates/${templateName}`;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const response: Response = await fetch(request);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const json = await response.json();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    return json.source;
}

