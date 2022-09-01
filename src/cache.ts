/**
 * Simple in-memory cache
 *
 * There are probably a lot of existing and much more advanced packages in npm,
 * but I had too much fun in implementing it on my own.
 */

type CacheItemStore = Map<string, CacheItem>;

export class CacheItem {
	private readonly storeDate: Date = new Date();

	constructor(readonly key: string, readonly value: unknown) {
	}

	public isExpired(expirationInterval: number) {
		return this.storeDate.getTime() + expirationInterval * 1000 < Date.now();
	}
}

export class Cache {
	private store: CacheItemStore = new Map();

	constructor(readonly cacheExpirationInterval: number) {
	}

	public add(item: CacheItem): void {
		this.store.set(item.key, item);
	}

	public get(key: string): CacheItem | undefined {
		const item = this.store.get(key);

		return typeof item === "undefined" ||
			item.isExpired(this.cacheExpirationInterval)
			? undefined
			: item;
	}
}
