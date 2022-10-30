import * as fs from 'fs';

import { Uri } from "vscode";
import { FileProvider } from "../interfaces";

export class FsFileProvider implements FileProvider {
    checkIfFileExists(uri: Uri): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            fs.stat(uri.fsPath, (err) => {
                if (err) {
                    // File does not exists
                    return resolve(false);
                }
                return resolve(true);
            });
        });
    }
}