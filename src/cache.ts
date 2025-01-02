/**
 * Simple in-memory cache
 *
 * There are probably a lot of existing and much more advanced packages in npm,
 * but I had too much fun in implementing it on my own.
 */

export interface CacheItemStore {
	[key: string]: CacheItem;
}

export class CacheItem {
	private _key: string;
	private _value: unknown;
	private storeDate: Date;

	get key() {
		return this._key;
	}

	get value() {
		return this._value;
	}

	constructor(key: string, value: unknown) {
		this._key = key;
		this._value = value;
		this.storeDate = new Date();
	}

	public isExpired(expirationInterval: number) {
		return this.storeDate.getTime() + expirationInterval * 1000 < Date.now();
	}
}

export class Cache {
	/**
	 * The key value store (a simple JavaScript object)
	 */
	private _store: CacheItemStore;
	/**
	 * Cache expiration interval in seconds
	 */
	private _cacheExpirationInterval: number;

	constructor(cacheExpirationInterval: number) {
		this._store = {};
		this._cacheExpirationInterval = cacheExpirationInterval;
	}

	public add(item: CacheItem) {
		this._store[item.key] = item;
	}

	public get(key: string) {
		const item = this._store[key];

		// Check expiration
		if(typeof item === 'undefined' || item.isExpired(this._cacheExpirationInterval)) {
			return undefined;
		}
		else {
			return item.value;
		}
	}

	public getCacheItem(key: string) {
		const item = this._store[key];

		// Check expiration
		if(typeof item === 'undefined' || item.isExpired(this._cacheExpirationInterval)) {
			return undefined;
		}
		else {
			return item;
		}
	}
}
