import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Field } from './data.js';
import { ensure, meta, recs, scen } from './state.svelte.js';

const field: Field = { id: 'P1', name: 'P1', crop: 'Blé', ha: 4.2, center: [1.61, 48.2], ring: [] };

const ok = (body: unknown) =>
	new Response(JSON.stringify({ results: [body] }), { status: 200 });

beforeEach(() => {
	for (const id of Object.keys(recs)) delete recs[id];
	meta.scenarios = [];
});

afterEach(() => vi.unstubAllGlobals());

describe('scen', () => {
	it('falls back to baseline while metadata is empty', () => {
		expect(scen()).toEqual(['baseline']);
	});

	it('returns the scenario list once loaded', () => {
		meta.scenarios = ['baseline', 'warm', 'dry'];
		expect(scen()).toEqual(['baseline', 'warm', 'dry']);
	});
});

describe('ensure', () => {
	it('fetches and caches the scenario result under the field id', async () => {
		const site = { status: 'ok', top: [] };
		const spy = vi.fn().mockResolvedValue(ok(site));
		vi.stubGlobal('fetch', spy);
		await ensure(field, 'warm');
		expect(recs.P1.warm).toEqual(site);
		expect(spy).toHaveBeenCalledTimes(1);
	});

	it('serves cached results without refetching', async () => {
		const spy = vi.fn().mockResolvedValue(ok({ status: 'ok' }));
		vi.stubGlobal('fetch', spy);
		await ensure(field, 'baseline');
		expect(await ensure(field, 'baseline')).toBeUndefined();
		expect(spy).toHaveBeenCalledTimes(1);
	});

	it('dedupes concurrent calls for the same field and scenario', async () => {
		const spy = vi.fn().mockResolvedValue(ok({ status: 'ok' }));
		vi.stubGlobal('fetch', spy);
		await Promise.all([ensure(field, 'dry'), ensure(field, 'dry')]);
		expect(spy).toHaveBeenCalledTimes(1);
	});

	it('fetches each scenario independently', async () => {
		const spy = vi.fn().mockResolvedValue(ok({ status: 'ok' }));
		vi.stubGlobal('fetch', spy);
		await Promise.all([ensure(field, 'warm'), ensure(field, 'dry')]);
		expect(spy).toHaveBeenCalledTimes(2);
		expect(Object.keys(recs.P1).sort()).toEqual(['dry', 'warm']);
	});
});
