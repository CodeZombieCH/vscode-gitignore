import * as https from 'https';
import * as url from 'url';
import { WriteStream } from 'fs';

import { getAgent } from '../http-client';
import { Cache, CacheItem } from '../cache';
import { GitignoreProvider, GitignoreTemplate } from '../interfaces';
import { GithubSession } from '../github/session';
import { GitHubClient } from '../github/client';


interface GithubRepositoryItem {
	name: string;
	path: string;
	download_url: string;
	type: string;
}

/**
 * Github gitignore template provider based on the "/repos" endpoint of the Github REST API
 * https://docs.github.com/en/rest/repos/contents
 */
export class GithubGitignoreRepositoryProviderV2 implements GitignoreProvider {
	private client: GitHubClient;

	constructor(private cache: Cache, githubSession: GithubSession) {
		this.client = new GitHubClient(githubSession);
	}

	/**
	 * Get all .gitignore templates
	 */
	public async getTemplates(): Promise<GitignoreTemplate[]> {
		// Get lists of .gitignore files from Github
		const result = await Promise.all([
			this.getFiles(),
			this.getFiles('Global')
		]);
		const files = (Array.prototype.concat.apply([], result) as GitignoreTemplate[])
			.sort((a: GitignoreTemplate, b: GitignoreTemplate) => a.name.localeCompare(b.name));
		return files;
	}

	/**
	 * Get all .gitignore files in a directory of the repository
	 */
	private async getFiles(path = ''): Promise<GitignoreTemplate[]> {
		// If cached, return cached content
		const item = this.cache.get('gitignore/' + path) as GitignoreTemplate[];
		if(typeof item !== 'undefined') {
			return item;
		}

		/*
		curl \
			-H "Accept: application/vnd.github.v3+json" \
			https://api.github.com/gitignore/templates
		*/
		const fullUrl = new url.URL(path, 'https://api.github.com/repos/github/gitignore/contents/');

		// =====> Now we would be able to retrieve headers via async/await
		const options: https.RequestOptions = {
			agent: getAgent(),
			method: 'GET',
			headers: {...await this.client.getHeaders(), 'Accept': 'application/vnd.github.v3+json'},
		};

		const responseBody = await this.client.requestString(fullUrl, options);

		const items = JSON.parse(responseBody) as GithubRepositoryItem[];

		const templates = items
			.filter(item => {
				return (item.type === 'file' && item.name.endsWith('.gitignore'));
			})
			.map(item => {
				return <GitignoreTemplate>{
					name: item.name.replace(/\.gitignore/, ''),
					path: item.path
				};
			});

		// Cache the retrieved gitignore templates
		this.cache.add(new CacheItem('gitignore/' + path, templates));

		return templates;
	}

	/**
	 * Downloads a .gitignore from the repository to the path passed
	 */
	public async downloadToStream(templatePath: string, writeStream: WriteStream): Promise<void> {
		/*
		curl \
			-H "Accept: application/vnd.github.v3.raw" \
			https://api.github.com/repos/github/gitignore/contents/<path>
		*/
		const fullUrl = new url.URL(templatePath, 'https://api.github.com/repos/github/gitignore/contents/');
		const options: https.RequestOptions = {
			agent: getAgent(),
			method: 'GET',
			headers: {...await this.client.getHeaders(), 'Accept': 'application/vnd.github.v3.raw'}
		};


		await this.client.requestWriteStream(fullUrl, options, writeStream);
	}
}
