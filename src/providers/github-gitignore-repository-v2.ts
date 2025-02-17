import * as https from 'https';
import * as fs from 'fs';
import * as url from 'url';
import { WriteStream } from 'fs';

import { getAgent, getDefaultHeaders } from '../http-client';
import { Cache, CacheItem } from '../cache';
import { GitignoreProvider, GitignoreTemplate } from '../interfaces';
import { GithubSession } from '../github/session';


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

	constructor(private cache: Cache, private githubSession: GithubSession) {
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
			headers: {...await this.getHeaders(), 'Accept': 'application/vnd.github.v3+json'},
		};

		const responseBody = await this.requestString(fullUrl, options);

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
			headers: {...await this.getHeaders(), 'Accept': 'application/vnd.github.v3.raw'}
		};


		await this.requestWriteStream(fullUrl, options, writeStream);
	}

	private async getHeaders() {
		// Get default HTTP client headers
		let headers = getDefaultHeaders();

		// Get GitHub session headers
		headers = {...headers, ...await this.githubSession.getHeaders()};

		return headers;
	}

	private requestString(url: string | url.URL, options: https.RequestOptions) : Promise<string> {
		return new Promise((resolve, reject) => {
			const req = https.request(url, options, res => {

				try {
					this.githubSession.checkRateLimit(res.headers);
				}
				catch(error) {
					return reject(error);
				}

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const data : any[] = [];

				res.on('data', chunk => {
					data.push(chunk);
				});

				res.on('end', () => {
					const responseBody: string = Buffer.concat(data).toString();

					if(res.statusCode !== 200) {
						return reject(responseBody);
					}

					resolve(responseBody);
				});
			})
			.on('error', err => {
				return reject(err.message);
			});

			req.end();
		});
	}

	private requestWriteStream(url: string | url.URL, options: https.RequestOptions, stream: fs.WriteStream) : Promise<void> {
		return new Promise((resolve, reject) => {
			const req = https.request(url, options, res => {
				try {
					this.githubSession.checkRateLimit(res.headers);
				}
				catch(error) {
					return reject(error);
				}

				if(res.statusCode !== 200) {
					return reject(new Error(`Download failed with status code ${res.statusCode}`));
				}

				res.pipe(stream);

				stream.on('finish', () => {
					stream.close();
					resolve();
				});
			})
			.on('error', err => {
				return reject(err.message);
			});

			req.end();
		});
	}
}
