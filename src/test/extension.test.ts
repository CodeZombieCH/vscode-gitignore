import * as assert from 'assert';
import * as GitHubApi from 'github';

import * as gitignoreExtension from '../extension';


suite('GitignoreRepository', () => {

	test('is getting all .gitignore files', function () {
		// increase slow and timeout value, because network request are sometimes slowly
		this.slow(5000);
		this.timeout(5000);

		// Create a Github API client
		let client = new GitHubApi({
			protocol: 'https',
			host: 'api.github.com',
			//debug: true,
			pathPrefix: '',
			timeout: 5000,
			headers: {
				'user-agent': 'vscode-gitignore-extension'
			}
		});

		// Create gitignore repository
		let gitignoreRepository = new gitignoreExtension.GitignoreRepository(client);

		return Promise.all([
			gitignoreRepository.getFiles(),
			gitignoreRepository.getFiles('Global')
		])
		.then((result) => {
			let files: gitignoreExtension.GitignoreFile[] = Array.prototype.concat.apply([], result);

			// From .
			let rootItem = files.find(f => f.label === 'VisualStudio');
			assert.deepEqual(rootItem, {
				description: 'VisualStudio.gitignore',
				label: 'VisualStudio',
				url: 'https://raw.githubusercontent.com/github/gitignore/master/VisualStudio.gitignore',
			});

			// From ./Global
			let globalItem = files.find(f => f.label === 'VisualStudioCode');
			assert.deepEqual(globalItem, {
				label: 'VisualStudioCode',
				description: 'Global/VisualStudioCode.gitignore',
				url: 'https://raw.githubusercontent.com/github/gitignore/master/Global/VisualStudioCode.gitignore'
			});
		}).catch(error => {
			const message: String = error.message || String(error);
			if (message.startsWith('403') && message.match(/API rate limit exceeded/i)) {
				// It is just ok
				// But if you don't like it, you can get reference from:
				// 	https://docs.travis-ci.com/user/encryption-keys/
				return;
			}
			throw error;
		});
	});
});
