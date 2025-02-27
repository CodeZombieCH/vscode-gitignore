import * as vscode from 'vscode';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { Agent } from 'http';


export const userAgent = 'vscode-gitignore-extension (https://github.com/CodeZombieCH/vscode-gitignore)';

function getProxyConfig(): string | undefined {
	// Read proxy configuration
	const httpConfig = vscode.workspace.getConfiguration('http');

	// Read proxy url in following order: vscode settings, environment variables
	const proxy = httpConfig.get<string | undefined>('proxy', undefined) || process.env.HTTPS_PROXY || process.env.HTTP_PROXY;

	if (proxy) {
		console.log(`vscode-gitignore: using proxy ${proxy}`);
	}

	return proxy;
}

let agent: Agent | undefined;

export function getAgent() {
	if (agent) {
		return agent;
	}

	const proxy = getProxyConfig();
	if (proxy) {
		agent = new HttpsProxyAgent(proxy);
	}

	return agent;
}

export function getDefaultHeaders() {
	const headers: Record<string, string> = {
		'User-Agent': userAgent
	};

	return headers;
}
