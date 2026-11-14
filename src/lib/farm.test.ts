import { afterEach, describe, expect, it, vi } from 'vitest';
import { names, parameters, recommend, shard, site } from './farm.js';
import type { PlanIndex, Shard } from './farm.js';

const file: PlanIndex = {
	version: '0.1.0',
	generated: '2026-11-14T00:00:00+00:00',
	request: {},
	columns: ['yield_mean', 'water_used'],
	directions: [1, -1],
	rotations: [['maize'], ['wheat']],
	fields: { P1: { name: 'P1' } },
	scenarios: {
		baseline: { params: {} },
		warm: { params: { delta_t: 2 } }
	}
};

describe('plan file helpers', () => {
	it('parameters returns scenario overrides, {} when absent', () => {
		expect(parameters(file, 'warm')).toEqual({ delta_t: 2 });
		expect(parameters(file, 'missing')).toEqual({});
		expect(parameters(null, 'warm')).toEqual({});
	});

	it('names lists scenario keys in order', () => {
		expect(names(file)).toEqual(['baseline', 'warm']);
		expect(names(null)).toEqual([]);
	});
});

describe('site', () => {
	it('fills array defaults on partial results', () => {
		expect(site({ status: 'ok' })).toMatchObject({
			objectives: [],
			pareto: [],
			ranking: [],
			scores: [],
			traces: []
		});
		expect(site(null).status).toBe('error');
	});
});

describe('shard', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('fetches plan/{id}.json and caches the promise', async () => {
		const body: Shard = { history: { y0: 2020, years: 4, dry: [], heat: [], frost: [] }, scenarios: {} };
		const spy = vi.fn().mockResolvedValue(new Response(JSON.stringify(body)));
		expect(await shard(spy, 'P1')).toEqual(body);
		expect(await shard(spy, 'P1')).toEqual(body);
		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy.mock.calls[0][0]).toBe('/plan/P1.json');
	});

	it('resolves null on missing shards', async () => {
		const spy = vi.fn().mockResolvedValue(new Response('x', { status: 404 }));
		expect(await shard(spy, 'P2')).toBeNull();
	});
});

describe('recommend', () => {
	afterEach(() => vi.unstubAllGlobals());

	const field = {
		id: 'P1',
		name: 'P1',
		crop: 'Blé',
		ha: 4.2,
		center: [1.61, 48.2] as [number, number],
		ring: []
	};

	it('posts the field centroid and returns the merged envelope', async () => {
		const result = { status: 'ok', objectives: [[1, 2]] };
		const spy = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					results: [result],
					columns: ['yield_mean'],
					directions: [1],
					rotations: [['maize']]
				}),
				{ status: 200 }
			)
		);
		vi.stubGlobal('fetch', spy);
		const merged = await recommend(field, 'warm');
		expect(merged.site).toMatchObject(result);
		expect(merged.columns).toEqual(['yield_mean']);
		expect(merged.rotations).toEqual([['maize']]);
		const [target, options] = spy.mock.calls[0];
		expect(target).toBe('/api/plan');
		expect(JSON.parse(options.body)).toEqual({
			id: 'P1',
			latitude: 48.2,
			longitude: 1.61,
			scenario: 'warm'
		});
	});

	it('degrades to status error on http failure', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('x', { status: 503 })));
		expect((await recommend(field, 'baseline')).site.status).toBe('error');
	});

	it('degrades to status error on network failure', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
		expect((await recommend(field, 'baseline')).site.detail).toBe('down');
	});
});
