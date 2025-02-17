import * as https from 'https';
import * as url from 'url';
import { WriteStream } from 'fs';


import { Cache, CacheItem } from '../cache';
import { GitignoreProvider, GitignoreTemplate} from '../interfaces';
import { getAgent, getDefaultHeaders } from '../http-client';
import { GithubSession } from '../github/session';

/**
 * Github gitignore template provider based on "/gitignore/templates" endpoint of the Github REST API
 * https://docs.github.com/en/rest/gitignore
 */
export class GithubGitignoreApiProvider implements GitignoreProvider {

	constructor(private cache: Cache, private githubSession: GithubSession) {
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
				headers: {...this.getHeaders(), 'Accept': 'application/vnd.github.v3+json'},
			};
			const req = https.request(options, res => {
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

	public downloadToStream(templatePath: string, stream: WriteStream): Promise<void> {
		return new Promise((resolve, reject) => {
			/*
			curl \
				-H "Accept: application/vnd.github.v3.raw" \
				https://api.github.com/gitignore/templates/Clojure
			*/
			const fullUrl = new url.URL(templatePath, 'https://api.github.com/gitignore/templates/');
			const options: https.RequestOptions = {
				agent: getAgent(),
				method: 'GET',
				hostname: fullUrl.hostname,
				path: fullUrl.pathname,
				headers: {...this.getHeaders(), 'Accept': 'application/vnd.github.v3.raw'}
			};

			const req = https.request(options, response => {
				try {
					this.githubSession.checkRateLimit(response.headers);
				}
				catch(error) {
					return reject(error);
				}

				if(response.statusCode !== 200) {
					return reject(new Error(`Download failed with status code ${response.statusCode}`));
				}

				response.pipe(stream);

				stream.on('finish', () => {
					stream.close();
					return resolve();
				});
			}).on('error', (err) => {
				return reject(err.message);
			});

			req.end();
		});
	}

	private getHeaders() {
		// Get default HTTP client headers
		let headers = getDefaultHeaders();

		// Get GitHub session headers
		headers = {...headers, ...this.githubSession.getHeadersSync()};

		return headers;
	}
}
