import * as https from 'https';
import * as fs from 'fs';
import * as url from 'url';
import { WriteStream } from 'fs';


import { Cache, CacheItem } from '../cache';
import { GitignoreProvider, GitignoreTemplate, GitignoreOperation, GitignoreOperationType } from '../interfaces';
import { getAgent, getDefaultHeaders } from '../http-client';

/**
 * Github gitignore template provider based on "/gitignore/templates" endpoint of the Github REST API
 * https://docs.github.com/en/rest/gitignore
 */
export class GithubGitignoreApiProvider implements GitignoreProvider {

	constructor(private cache: Cache) {
	}

	/**
	 * Get all .gitignore templates
	 */
	public getTemplates(): Promise<GitignoreTemplate[]> {
		// If cached, return cached content
		const item = this.cache.get('gitignore') as GitignoreTemplate[];
		if(typeof item !== 'undefined') {
			return Promise.resolve<GitignoreTemplate[]>(item);
		}

		return new Promise((resolve, reject) => {
			/*
			curl \
				-H "Accept: application/vnd.github.v3+json" \
				https://api.github.com/gitignore/templates
			*/
			const options: https.RequestOptions = {
				agent: getAgent(),
				method: 'GET',
				hostname: 'api.github.com',
				path: '/gitignore/templates',
				headers: {...getDefaultHeaders(), 'Accept': 'application/vnd.github.v3+json'},
			};
			const req = https.request(options, res => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const data : any[] = [];

				console.log(`vscode-gitignore: Github API ratelimit remaining: ${res.headers['x-ratelimit-remaining']}`);

				res.on('data', chunk => {
					data.push(chunk);
				});
				res.on('end', () => {
					const responseBody: string = Buffer.concat(data).toString();

					if(res.statusCode !== 200) {
						return reject(responseBody);
					}

					const templatesRaw = JSON.parse(responseBody) as string[];
					const templates = templatesRaw.map(t => <GitignoreTemplate>{ name: t, path: t});

					// Cache the retrieved gitignore files
					this.cache.add(new CacheItem('gitignore', templates));

					return resolve(templates);
				});
			})
			.on('error', err => {
				return reject(err.message);
			});

			req.end();
		});
	}

	/**
	 * Downloads a .gitignore from the repository to the path passed
	 */
	public download(operation: GitignoreOperation): Promise<void> {
		return new Promise((resolve, reject) => {
			const flags = operation.type === GitignoreOperationType.Overwrite ? 'w' : 'a';
			const file = fs.createWriteStream(operation.path, { flags: flags });

			// If appending to the existing .gitignore file, write a NEWLINE as separator
			if(flags === 'a') {
				file.write('\n');
			}

			/*
			curl \
				-H "Accept: application/vnd.github.v3.raw" \
				https://api.github.com/gitignore/templates/Clojure
			*/
			const fullUrl = new url.URL(operation.template.path, 'https://api.github.com/gitignore/templates/');
			const options: https.RequestOptions = {
				agent: getAgent(),
				method: 'GET',
				hostname: fullUrl.hostname,
				path: fullUrl.pathname,
				headers: {...getDefaultHeaders(), 'Accept': 'application/vnd.github.v3.raw'}
			};

			const req = https.request(options, response => {
				console.log(`vscode-gitignore: Github API ratelimit remaining: ${response.headers['x-ratelimit-remaining']}`);

				if(response.statusCode !== 200) {
					return reject(new Error(`Download failed with status code ${response.statusCode}`));
				}

				response.pipe(file);

				file.on('finish', () => {
					file.close();
					return resolve();
				});
			}).on('error', (err) => {
				// Delete the .gitignore file if we created it
				if(flags === 'w') {
					fs.unlink(operation.path, err => {
						if(err) {
							console.error(err.message);
						}
					});
				}
				return reject(err.message);
			});

			req.end();
		});
	}

	public downloadToStream(operation: GitignoreOperation, stream: WriteStream): Promise<void> {
		if(operation.template === null) {
			throw new Error('Template cannot be null');
		}

		return new Promise((resolve, reject) => {
			/*
			curl \
				-H "Accept: application/vnd.github.v3.raw" \
				https://api.github.com/gitignore/templates/Clojure
			*/
			const fullUrl = new url.URL(operation.template.path, 'https://api.github.com/gitignore/templates/');
			const options: https.RequestOptions = {
				agent: getAgent(),
				method: 'GET',
				hostname: fullUrl.hostname,
				path: fullUrl.pathname,
				headers: {...getDefaultHeaders(), 'Accept': 'application/vnd.github.v3.raw'}
			};

			const req = https.request(options, response => {
				console.log(`vscode-gitignore: Github API ratelimit remaining: ${response.headers['x-ratelimit-remaining']}`);

				if(response.statusCode !== 200) {
					return reject(new Error(`Download failed with status code ${response.statusCode}`));
				}

				response.pipe(stream);

				stream.on('finish', () => {
					stream.close();
					return resolve();
				});
			}).on('error', (err) => {
				// Delete the .gitignore file if we created it
				if(operation.type === GitignoreOperationType.Overwrite) {
					fs.unlink(operation.path, err => {
						if(err) {
							console.error(err.message);
						}
					});
				}
				return reject(err.message);
			});

			req.end();
		});
	}
}
