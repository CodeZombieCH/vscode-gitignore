import * as vscode from 'vscode';

import { Cache, CacheItem } from '../cache';
import { WebGitignoreProvider, GitignoreTemplate, GitignoreOperation, GitignoreOperationType } from '../interfaces';
/**
 * Github gitignore template provider based on "/gitignore/templates" endpoint of the Github REST API
 * https://docs.github.com/en/rest/gitignore
 */
export class GithubGitignoreApiWebProvider implements WebGitignoreProvider {

    constructor(private cache: Cache) {
    }

    /**
     * Get all .gitignore templates
     */
    public async getTemplates(): Promise<GitignoreTemplate[]> {
        console.log("getTemplates");

        // If cached, return cached content
        const item = this.cache.get('gitignore') as GitignoreTemplate[];
        if (typeof item !== 'undefined') {
            return Promise.resolve<GitignoreTemplate[]>(item);
        }

        /*
        curl \
            -H "Accept: application/vnd.github.v3+json" \
            https://api.github.com/gitignore/templates
        */
        const res = await fetch('https://api.github.com/gitignore/templates');

        console.log(`vscode-gitignore: Github API ratelimit remaining: ${res.headers.get('x-ratelimit-remaining')}`);

        if (res.status !== 200) {
            console.log(res.status);
            return Promise.reject(res.status);
        }

        const templatesRaw = <Array<string>>await res.json();
        const templates = templatesRaw.map(t => <GitignoreTemplate>{ name: t, path: t });

        // Cache the retrieved gitignore files
        this.cache.add(new CacheItem('gitignore', templates));

        return templates;
    }

    /**
     * Downloads a .gitignore from the repository to the path passed
     */
    public async download(operation: GitignoreOperation): Promise<void> {
        try {
            console.log("downloading file");
            const newGitIgnoreFile = await this.getGitignoreFile(operation.template.name);
            const uri = operation.uri;

            let finalFile: Uint8Array;
            if (operation.type === GitignoreOperationType.Append) {
                finalFile = await this.getAppendedFile(uri, newGitIgnoreFile);
            }
            else if (operation.type === GitignoreOperationType.Overwrite) {
                finalFile = newGitIgnoreFile;
            }
            else {
                throw Error("Unknown option");
            }
            console.log("before replacing file");
            console.log("URI:" + uri)
            await this.replaceFile(uri, finalFile);
        }
        catch (err) {
            // TODO
        };

    }

    private async getAppendedFile(uri: vscode.Uri, newContent: Uint8Array) {
        const currentContent = await vscode.workspace.fs.readFile(uri);
        const textEncoder = new TextEncoder();
        const newLine = textEncoder.encode('\n');
        return this.mergeDocuments(currentContent, newLine, newContent)
    }

    private mergeDocuments(first: Uint8Array, second: Uint8Array, third: Uint8Array) {
        var mergedArray = new Uint8Array(first.length + second.length + third.length);
        mergedArray.set(first);
        mergedArray.set(second, first.length);
        mergedArray.set(third, first.length + second.length);
        return mergedArray;
    }

    private async replaceFile(uri: vscode.Uri, file: Uint8Array) {
        await vscode.workspace.fs.writeFile(uri, file);
    }

    private async getGitignoreFile(templateName: string | undefined) {
        /*
        curl \
            -H "Accept: application/vnd.github.v3.raw" \
            https://api.github.com/gitignore/templates/Clojure
        */
        const response = await fetch(`https://api.github.com/gitignore/templates/${templateName}`,
            { headers: { 'Accept': 'application/vnd.github.v3.raw' } });

        console.log(`vscode-gitignore: Github API ratelimit remaining: ${response.headers.get('x-ratelimit-remaining')}`);

        if (response.status !== 200) {
            throw new Error(`Download failed with status code ${response.status}`);
        }

        const template = await response.blob();
        const arrayBuffer = await template.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        return uint8Array;
    }
}