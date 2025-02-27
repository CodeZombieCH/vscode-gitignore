import * as https from 'https';
import * as fs from 'fs';
import * as url from 'url';

import { getDefaultHeaders } from "../http-client";
import { GithubSession } from './session';
import { IncomingMessage } from 'http';

const GitHubRateLimitHeader = 'x-ratelimit-remaining';

/**
 * Error thrown when a HTTP response indicates failure
 */
export class HttpError extends Error {
	statusCode?: number;
	responseBody?: string;

	constructor(statusCode?: number, responseBody?: string) {
		super();
		this.statusCode = statusCode;
		this.responseBody = responseBody;
	}
}

/**
 * Error thrown when the GitHub API rate limit has been reached
 */
export class GithubApiRateLimitReachedError extends Error {
	constructor(message: string) {
		super(message);
	}
}

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
					this.checkRateLimit(res);
				}
				catch(error) {
					if (error instanceof Error) {
						return reject(error);
					}
					else {
						return reject(new Error('Shit hit the fan, we are not using proper errors'));
					}
				}

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const data : any[] = [];

				res.on('data', chunk => {
					data.push(chunk);
				});

				res.on('end', () => {
					const responseBody: string = Buffer.concat(data).toString();

					if(res.statusCode !== 200) {
						return reject(new HttpError(res.statusCode, responseBody));
					}

					resolve(responseBody);
				});
			})
			.on('error', err => {
				return reject(err);
			});

			req.end();
		});
	}

	requestWriteStream(url: string | url.URL, options: https.RequestOptions, stream: fs.WriteStream) : Promise<void> {
		return new Promise((resolve, reject) => {
			const req = https.request(url, options, res => {
				try {
					this.checkRateLimit(res);
				}
				catch(error) {
					if (error instanceof Error) {
						return reject(error);
					}
					else {
						return reject(new Error('Shit hit the fan, we are not using proper errors'));
					}
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
				return reject(err);
			});

			req.end();
		});
	}

	/**
	 * Checks the current GitHub API rate limit by parsing the corresponding response header.
	 * Throws a GithubApiRateLimitReached error if the request failed and the rate limit was reached.
	 * @returns Rate limit (if any)
	 */
	checkRateLimit(response: IncomingMessage) {
		const rateLimitRemainingRaw = response.headers[GitHubRateLimitHeader];

		if (rateLimitRemainingRaw === undefined) {
			return undefined;
		}

		const rateLimitRemaining = Number.parseInt(rateLimitRemainingRaw as string);
		console.info(`vscode-gitignore: GitHub API rate limit remaining: ${rateLimitRemaining}`);

		if (response.statusCode && response.statusCode >= 400 && rateLimitRemaining < 1) {
			throw new GithubApiRateLimitReachedError('GitHub API rate limit reached');
		}

		// DEBUGGING
		// if (rateLimitRemaining < 60) {
		// 	throw new GithubApiRateLimitReached('GitHub API rate limit reached');
		// }

		return rateLimitRemaining;
	}
}
