import * as https from 'https';
import * as fs from 'fs';
import * as url from 'url';

import { getDefaultHeaders } from "../http-client";
import { GithubSession } from './session';

export class GitHubClient {
	constructor(private githubSession: GithubSession) {
		}

	async getHeaders() {
		// Get default HTTP client headers
		let headers = getDefaultHeaders();

		// Get GitHub session headers
		headers = {...headers, ...await this.githubSession.getHeaders()};

		return headers;
	}

	requestString(url: string | url.URL, options: https.RequestOptions) : Promise<string> {
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

	requestWriteStream(url: string | url.URL, options: https.RequestOptions, stream: fs.WriteStream) : Promise<void> {
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
