// import * as assert from 'assert';

// import * as vscode from 'vscode';
import { downloadGitignoreFile } from '../../extension';
import { GitignoreOperation, GitignoreOperationType, GitignoreProvider, GitignoreTemplate } from '../../interfaces';
import * as fs from 'fs';
import { createTmpTestDir } from '../utils';
import * as assert from 'assert';

class GitignoreProviderMock implements GitignoreProvider {
	getTemplates(): Promise<GitignoreTemplate[]> {
		return Promise.resolve([<GitignoreTemplate>{
			download_url :'',
			name: 'example',
			path: 'example',
			type: 'foo'
		}]);
	}
	download(operation: GitignoreOperation): Promise<void> {
		console.log(operation);
		throw new Error('Method not implemented.');
	}
	downloadToStream(templatePath: string, writeStream: fs.WriteStream): Promise<void> {
		return new Promise((resolve) => {
			writeStream.write(templatePath + "\n");

			writeStream.on('finish', () => {
				writeStream.close();
				resolve();
			});

			writeStream.end();
		});
	}

}

function assertLines(path: string, ...expectedLines: string[]) {
	const content = fs.readFileSync(path, {encoding: 'utf8'});
	const lines = content.split(/\r?\n/);

	for (let i = 0; i < lines.length; ++i) {
		const expected = expectedLines[i];
		const got = lines[i];
		console.log(`excepted: "${expected}", got: "${got}"`);
		assert(expected === got);
	}
}

suite('Extension Test Suite', () => {

	// test('Sample test', async () => {
	// 	//await vscode.commands.executeCommand('gitignore.addgitignore');
	// });


	test('can write a new gitignore file', async () => {
		const testBaseDir = await createTmpTestDir('download');
		const path = `${testBaseDir}/.gitignore`;


		const gitignoreProvider = new GitignoreProviderMock();
		const templates = await gitignoreProvider.getTemplates();

		const operation = <GitignoreOperation>{
			template: templates[0],
			path: path,
			type: GitignoreOperationType.Overwrite
		};

		await downloadGitignoreFile(gitignoreProvider, operation);

		const content = fs.readFileSync(path, {encoding: 'utf8'});
		console.log(content);

		assertLines(path, 'example', '');

		// Cleanup
		// if(fs.existsSync(path)) {
		// 	fs.unlinkSync(path);
		// }
	});

	test('can overwrite a gitignore file', async () => {
		const testBaseDir = await createTmpTestDir('download');
		const path = `${testBaseDir}/.gitignore`;
		fs.writeFileSync(path, "existing line");


		const gitignoreProvider = new GitignoreProviderMock();
		const templates = await gitignoreProvider.getTemplates();

		const operation = <GitignoreOperation>{
			template: templates[0],
			path: path,
			type: GitignoreOperationType.Overwrite
		};

		await downloadGitignoreFile(gitignoreProvider, operation);

		assertLines(path, 'example', '');

		// Cleanup
		if(fs.existsSync(path)) {
			fs.unlinkSync(path);
		}
	});

	test('can append to a gitignore file', async () => {
		const testBaseDir = await createTmpTestDir('download');
		const path = `${testBaseDir}/.gitignore`;
		fs.writeFileSync(path, "existing line\n");

		const gitignoreProvider = new GitignoreProviderMock();
		const templates = await gitignoreProvider.getTemplates();

		const operation = <GitignoreOperation>{
			template: templates[0],
			path: path,
			type: GitignoreOperationType.Append
		};

		await downloadGitignoreFile(gitignoreProvider, operation);

		assertLines(path, 'existing line', '', 'example','');

		// Cleanup
		if(fs.existsSync(path)) {
			fs.unlinkSync(path);
		}
	});

});
