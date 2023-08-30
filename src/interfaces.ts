import * as fs from 'fs';

export interface GitignoreTemplate {
	name: string;
	path: string;
	download_url: string;
	type: string;
}

export interface GitignoreProvider {
	getTemplates(): Promise<GitignoreTemplate[]>;
	download(operation: GitignoreOperation): Promise<void>;
	downloadToStream(operation: GitignoreOperation, stream: fs.WriteStream): Promise<void>;
}

export enum GitignoreOperationType {
	Append,
	Overwrite
}

export interface GitignoreOperation {
	type: GitignoreOperationType;
	/**
	 * Path to the .gitignore file to write to
	 */
	path: string;
	/**
	 * gitignore template file to use
	 */
	template: GitignoreTemplate;
	/**
	 * If the file already exists, then the stats of the file.
	 */
	stats?: fs.Stats;
}
