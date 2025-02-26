import * as assert from 'assert';

import {Cache, CacheItem} from '../cache';


suite('Cache', () => {

	test('is correctly storing an item', () => {
		const cache = new Cache(1);
		cache.add(new CacheItem('foo', {foo: 'bar'}));

		const cachedItem = cache.get('foo');
		assert.deepStrictEqual(cachedItem, {foo: 'bar'});
	});

	test('is correctly expiring an item', (done) => {
		const cache = new Cache(1);
		cache.add(new CacheItem('foo', {foo: 'bar'}));

		setTimeout(() => {
			assert.deepStrictEqual(cache.get('foo'), {foo: 'bar'});
		}, 900);

		setTimeout(() => {
			assert.strictEqual(cache.get('foo'), undefined);
		}, 1100);

		setTimeout(done, 1200);
	});
});

suite('CacheItem', () => {

	test('is correctly setting properties', () => {
		const cacheItem = new CacheItem('foo', 'bar');
		assert.strictEqual(cacheItem.key, 'foo');
		assert.strictEqual(cacheItem.value, 'bar');
	});

});
