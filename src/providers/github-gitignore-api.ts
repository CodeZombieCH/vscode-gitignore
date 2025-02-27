import * as https from 'https';
import * as url from 'url';
import { WriteStream } from 'fs';


import { Cache, CacheItem } from '../cache';
import { GitignoreProvider, GitignoreTemplate} from '../interfaces';
import { getAgent } from '../http-client';
import { GithubSession } from '../github/session';
import { GitHubClient } from '../github/client';

/**
 * Github gitignore template provider based on "/gitignore/templates" endpoint of the Github REST API
 * https://docs.github.com/en/rest/gitignore
 */
export class GithubGitignoreApiProvider implements GitignoreProvider {
	private client: GitHubClient;

	constructor(private cache: Cache, githubSession: GithubSession) {
		this.client = new GitHubClient(githubSession);
	}

	/**
	 * Get all .gitignore templates
	 */
	public async getTemplates(): Promise<GitignoreTemplate[]> {
		// If cached, return cached content
		const item = this.cache.get('gitignore') as GitignoreTemplate[];
		if(typeof item !== 'undefined') {
			return item;
		}

		/*
		curl \
			-H "Accept: application/vnd.github.v3+json" \
			https://api.github.com/gitignore/templates
		*/
		const url = 'https://api.github.com/gitignore/templates';
		const options: https.RequestOptions = {
			agent: getAgent(),
			method: 'GET',
			headers: {...await this.client.getHeaders(), 'Accept': 'application/vnd.github.v3+json'},
		};

		const responseBody = await this.client.requestString(url, options);
		const templatesRaw = JSON.parse(responseBody) as string[];
		const templates = templatesRaw.map(t => <GitignoreTemplate>{ name: t, path: t});

		// Cache the retrieved gitignore files
		this.cache.add(new CacheItem('gitignore', templates));

		return templates;
	}

	public async downloadToStream(templatePath: string, writeStream: WriteStream): Promise<void> {
		/*
		curl \
			-H "Accept: application/vnd.github.v3.raw" \
			https://api.github.com/gitignore/templates/Clojure
		*/
		const fullUrl = new url.URL(templatePath, 'https://api.github.com/gitignore/templates/');
		const options: https.RequestOptions = {
			agent: getAgent(),
			method: 'GET',
			headers: {...await this.client.getHeaders(), 'Accept': 'application/vnd.github.v3.raw'}
		};

		await this.client.requestWriteStream(fullUrl, options, writeStream);
	}
}
