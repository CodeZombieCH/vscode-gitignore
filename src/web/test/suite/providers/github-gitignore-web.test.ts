import * as assert from 'assert';
import * as vscode from 'vscode';

import { Cache } from '../../../../cache';
import { GithubGitignoreApiWebProvider } from '../../../../providers/github-gitignore-api-web';
import { GitignoreOperation, GitignoreOperationType, GitignoreProvider, GitignoreTemplate } from '../../../../interfaces';


async function fileExits(uri: vscode.Uri): Promise<boolean> {
    return vscode.workspace.fs.stat(uri).then(_x => true, _err => false);
}

const providers: GitignoreProvider[] = [
    new GithubGitignoreApiWebProvider(new Cache(0)),
];

providers.forEach(provider => {

    suite(provider.constructor.name, () => {
        let templates: GitignoreTemplate[] = [];

        test('can retrieve a list of templates', async () => {
            templates = await provider.getTemplates();

            console.log(templates.length);

            assert(templates.length > 0);
            assert(templates.find(t => t.name === 'Clojure') !== undefined);
        });

        test('can download a template to a file', async () => {
            const path = `test/.gitignore`;

            const operation = <GitignoreOperation>{
                template: templates.find(t => t.name === 'C'),
                uri: vscode.Uri.parse(path),
                type: GitignoreOperationType.Overwrite
            };

            await provider.download(operation);

            // Assert
            const fileExists = await fileExits(operation.uri);
            assert(fileExists);

            const file = await vscode.workspace.fs.readFile(operation.uri);
            const content = new TextDecoder().decode(file);
            const lines = content.split(/\r?\n/);

            assert(lines[0] === '# Prerequisites');
            assert(lines[1] === '*.d');
            assert(lines[2] === '');
        });
    })
});
