import * as vscode from 'vscode';
import * as HttpsProxyAgent from 'https-proxy-agent';
import { Agent } from 'http';
import { getAccessToken } from './github';


export const userAgent = 'vscode-gitignore-extension';

export function getProxyConfig() : string | undefined {
	// Read proxy configuration
	const httpConfig = vscode.workspace.getConfiguration('http');

	// Read proxy url in following order: vscode settings, environment variables
	const proxy = httpConfig.get<string | undefined>('proxy', undefined) || process.env.HTTPS_PROXY || process.env.HTTP_PROXY;

	if(proxy)
	{
		console.log(`vscode-gitignore: using proxy ${proxy}`);
	}

	return proxy;
}


let agent: Agent | undefined;

export function getAgent() {
	if(agent) {
		return agent;
	}

	const proxy = getProxyConfig();
	if(proxy) {
		agent = new HttpsProxyAgent(proxy);
	}

	return agent;
}

export function getAuthorizationHeaderValue() {
	// Use vscode authentication provider
	const accessToken = getAccessToken();
	if(accessToken) {
		return 'Token ' + accessToken;
	}

	// Use env var
	if(process.env.GITHUB_AUTHORIZATION) {
		return process.env.GITHUB_AUTHORIZATION;
	}
	else
	{
		return null;
	}
}

export function getDefaultHeaders() {
	let headers: Record<string, string> = {
		'User-Agent': userAgent
	};

	// Add authorization header if authorization is available
	const authorizationHeaderValue = getAuthorizationHeaderValue();
	if(authorizationHeaderValue) {
		console.debug('vscode-gitignore: setting authorization header');
		headers = {...headers, 'Authorization': authorizationHeaderValue};
	}

	return headers;
}
