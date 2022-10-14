import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';
import { Writable } from 'stream';

import { Cache } from '../../../cache';
import { StreamGitignoreProvider, GitignoreOperation, GitignoreTemplate, GitignoreOperationType } from '../../../interfaces';
import { GithubGitignoreApiProvider } from '../../../providers/github-gitignore-api';
import { GithubGitignoreRepositoryProvider } from '../../../providers/github-gitignore-repository';


function fileExits(uri: vscode.Uri): Promise<boolean> {
	return new Promise((resolve) => {
		fs.stat(uri.fsPath, (err) => {
			if(err) {
				return resolve(false);
			}
			return resolve(true);
		});
	});
}

function createTmpTestDir(prefix: string): Promise<string> {
	return new Promise((resolve, reject) => {
		fs.mkdtemp(path.join(os.tmpdir(), prefix), (err, directory) => {
			if (err) {
				reject(err);
			}
			return resolve(directory);
		});
	});
}


const providers: StreamGitignoreProvider[] = [
	new GithubGitignoreRepositoryProvider(new Cache(0)),
	new GithubGitignoreApiProvider(new Cache(0)),
];

/**
 * An implementation of a stream.Writable that writes to a string member.
 * This class is designed for unit test purposes only.
 */
class MemoryWritable extends Writable {
	bytesWritten = 0;
	path: string | Buffer = '<memory>';
	pending = false;

	private data = '';

	constructor() {
		super();
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	_write(chunk: any, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		this.data += chunk.toString();
		callback();
	}

	close(): void {
		// Do nothing
	}

	public get content() : string {
		return this.data;
	}
}

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
			// TODO: Check content of file
			const testBaseDir = await createTmpTestDir(provider.constructor.name);
			const path = `${testBaseDir}/.gitignore`;

			// Cleanup
			if(fs.existsSync(path)) {
				fs.unlinkSync(path);
			}

			const operation = <GitignoreOperation>{
				template: templates.find(t => t.name === 'C'),
				uri: vscode.Uri.parse(path),
				type: GitignoreOperationType.Overwrite
			};

			await provider.download(operation);

			// Assert
			const fileExists = await fileExits(operation.uri);
			assert(fileExists);

			const content = fs.readFileSync(operation.uri.fsPath, {encoding: 'utf8'});
			const lines = content.split(/\r?\n/);

			assert(lines[0] === '# Prerequisites');
			assert(lines[1] === '*.d');
			assert(lines[2] === '');

			// Cleanup
			if(fs.existsSync(path)) {
				fs.unlinkSync(path);
			}
		});

		test('can download a root template (regular) to a writable stream', async () => {
			const memoryStream = new MemoryWritable();

			const path = provider.constructor.name + '.gitignore';

			const operation = <GitignoreOperation>{
				template: templates.find(t => t.name === 'Python'),
				uri: vscode.Uri.parse(path),
				type: GitignoreOperationType.Overwrite
			};

			// Act
			await provider.downloadToStream(operation, memoryStream);

			// Assert
			const content = memoryStream.content;
			const lines = content.split(/\r?\n/);

			assert(lines[0] === '# Byte-compiled / optimized / DLL files');
			assert(lines[1] === '__pycache__/');
			assert(lines[2] === '*.py[cod]');
		});

		// Test for bug #21
		// https://github.com/CodeZombieCH/vscode-gitignore/issues/21
		test('can download a root template (symlink) to a writable stream', async () => {
			const memoryStream = new MemoryWritable();

			const path = provider.constructor.name + '.gitignore';

			const operation = <GitignoreOperation>{
				template: templates.find(t => t.name === 'Clojure'),
				uri: vscode.Uri.parse(path),
				type: GitignoreOperationType.Overwrite
			};

			// Act
			await provider.downloadToStream(operation, memoryStream);

			// Assert
			const content = memoryStream.content;
			const lines = content.split(/\r?\n/);

			// Ensure the content is not the name of the linked file
			assert(lines[0] !== 'Leiningen.gitignore');

			assert(lines[0] === 'pom.xml');
			assert(lines[1] === 'pom.xml.asc');
			assert(lines[2] === '*.jar');
		});

		test('can download global a template to a writable stream', async () => {
			if(provider.constructor.name === GithubGitignoreApiProvider.name) {
				// Skip test for GithubGitignoreApiProvider
				// Not supported by the API
				return;
			}

			const memoryStream = new MemoryWritable();

			const path = provider.constructor.name + '.gitignore';

			const operation = <GitignoreOperation>{
				template: templates.find(t => t.name === 'VisualStudioCode'),
				uri: vscode.Uri.parse(path),
				type: GitignoreOperationType.Overwrite
			};

			// Act
			await provider.downloadToStream(operation, memoryStream);

			// Assert
			const content = memoryStream.content;
			const lines = content.split(/\r?\n/);

			assert(lines[0] === '.vscode/*');
			assert(lines[1] === '!.vscode/settings.json');
			assert(lines[2] === '!.vscode/tasks.json');
		});

		// Test for bug #21
		// https://github.com/CodeZombieCH/vscode-gitignore/issues/21
		test('can download a global template (symlink) to a writable stream', async () => {
			if(provider.constructor.name === GithubGitignoreApiProvider.name) {
				// Skip test for GithubGitignoreApiProvider
				// Not supported by the API
				return;
			}

			const memoryStream = new MemoryWritable();

			const path = provider.constructor.name + '.gitignore';

			const operation = <GitignoreOperation>{
				template: templates.find(t => t.name === 'Octave'),
				uri: vscode.Uri.parse(path),
				type: GitignoreOperationType.Overwrite
			};

			// Act
			await provider.downloadToStream(operation, memoryStream);

			// Assert
			const content = memoryStream.content;
			const lines = content.split(/\r?\n/);

			// Ensure the content is not the name of the linked file
			assert(lines[0] !== 'MATLAB.gitignore');

			assert(lines[0] === '# Windows default autosave extension');
			assert(lines[1] === '*.asv');
			assert(lines[2] === '');
		});
	});

});
