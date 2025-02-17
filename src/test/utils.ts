import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';


export function createTmpTestDir(prefix: string): Promise<string> {
	return new Promise((resolve, reject) => {
		fs.mkdtemp(path.join(os.tmpdir(), prefix), (err, directory) => {
			if (err) {
				reject(err);
			}
			return resolve(directory);
		});
	});
}
