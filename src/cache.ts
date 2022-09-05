/**
 * Simple in-memory cache
 *
 * There are probably a lot of existing and much more advanced packages in npm,
 * but I had too much fun in implementing it on my own.
 */

export class CacheItem {
	readonly storeDate: Date = new Date();

	constructor(readonly key: string, readonly value: unknown) {
	}

	isExpired(expirationInterval: number) {
		return this.storeDate.getTime() + expirationInterval * 1000 < Date.now();
	}
}

export class Cache {
	private store = new Map<string, CacheItem>();

	constructor(readonly cacheExpirationInterval: number) {
	}

	add(item: CacheItem): void {
		this.store.set(item.key, item);
	}

	get(key: string): CacheItem | undefined {
		const item = this.store.get(key);

		return typeof item === "undefined" ||
			item.isExpired(this.cacheExpirationInterval)
			? undefined
			: item;
	}
}
