import { WriteStream } from "fs";
import * as vscode from 'vscode';

export interface GitignoreTemplate {
	name: string;
	path: string;
	download_url: string;
	type: string;
}

export interface GitignoreQuickPickItem extends vscode.QuickPickItem {
	template: GitignoreTemplate;
}


export interface GitignoreProvider extends WebGitignoreProvider{
	downloadToStream(operation: GitignoreOperation, stream: WriteStream): Promise<void>;
}

export interface WebGitignoreProvider {
	getTemplates(): Promise<GitignoreTemplate[]>;
	download(operation: GitignoreOperation): Promise<void>;
}

export enum GitignoreOperationType {
	Append,
	Overwrite
}

export interface GitignoreOperation {
	type: GitignoreOperationType;
	/**
	 * Uri to the .gitignore file to write to
	 */
	uri: vscode.Uri;
	/**
	 * gitignore template file to use
	 */
	template: GitignoreTemplate;
}

