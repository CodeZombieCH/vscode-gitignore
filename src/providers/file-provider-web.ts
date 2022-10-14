import * as vscode from 'vscode';

import { Uri } from "vscode";
import { FileProvider } from "../interfaces";

export class WebFileProvider implements FileProvider {
    public async checkIfFileExists(uri: Uri){
        return vscode.workspace.fs.stat(uri).then(_x => true, _err => false);
    }

}