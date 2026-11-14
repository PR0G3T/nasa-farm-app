import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Field } from './data.js';
import type { Result, Site } from './farm.js';
import {
	ensure,
	meta,
	planIndex,
	priority,
	ranking,
	results,
	scenarios,
	selection
} from './state.svelte.js';

const field: Field = { id: 'P1', name: 'P1', crop: 'Blé', ha: 4.2, center: [1.61, 48.2], ring: [] };

const result = (site: Partial<Site>): Result => ({
	site: {
		status: 'ok',
		plans_evaluated: 0,
		scenarios: 0,
		objectives: [],
		pareto: [],
		ranking: [],
		scores: [],
		traces: [],
		...site
	},
	columns: ['yield_mean', 'water_used'],
	directions: [1, -1],
	rotations: [['maize'], ['fallow']]
});

const payload = (body: Partial<Site>) => ({
	results: [body],
	columns: ['yield_mean', 'water_used'],
	directions: [1, -1],
	rotations: [['maize'], ['fallow']]
});

const envelope = (body: Partial<Site>) =>
	new Response(JSON.stringify(payload(body)), { status: 200 });

beforeEach(() => {
	for (const id of Object.keys(results)) delete results[id];
	meta.scenarios = [];
	selection.field = null;
	selection.scenario = 'baseline';
	selection.plan = null;
});

afterEach(() => vi.unstubAllGlobals());

describe('scenarios', () => {
	it('falls back to baseline while metadata is empty', () => {
		expect(scenarios()).toEqual(['baseline']);
	});

	it('returns the scenario list once loaded', () => {
		meta.scenarios = ['baseline', 'warm', 'dry'];
		expect(scenarios()).toEqual(['baseline', 'warm', 'dry']);
	});
});

describe('ensure', () => {
	it('fetches and caches the scenario result under the field id', async () => {
		const site: Partial<Site> = { status: 'ok', objectives: [[1, 2]] };
		const spy = vi.fn().mockResolvedValue(envelope(site));
		vi.stubGlobal('fetch', spy);
		await ensure(field, 'warm');
		expect(results.P1.warm.site).toMatchObject(site);
		expect(results.P1.warm.rotations).toEqual([['maize'], ['fallow']]);
		expect(spy).toHaveBeenCalledTimes(1);
	});

	it('serves cached results without refetching', async () => {
		const spy = vi.fn().mockResolvedValue(envelope({ status: 'ok' }));
		vi.stubGlobal('fetch', spy);
		await ensure(field, 'baseline');
		expect(await ensure(field, 'baseline')).toBeUndefined();
		expect(spy).toHaveBeenCalledTimes(1);
	});

	it('dedupes concurrent calls for the same field and scenario', async () => {
		const spy = vi.fn().mockResolvedValue(envelope({ status: 'ok' }));
		vi.stubGlobal('fetch', spy);
		await Promise.all([ensure(field, 'dry'), ensure(field, 'dry')]);
		expect(spy).toHaveBeenCalledTimes(1);
	});

	it('fetches each scenario independently', async () => {
		const spy = vi.fn().mockResolvedValue(envelope({ status: 'ok' }));
		vi.stubGlobal('fetch', spy);
		await Promise.all([ensure(field, 'warm'), ensure(field, 'dry')]);
		expect(spy).toHaveBeenCalledTimes(2);
		expect(Object.keys(results.P1).sort()).toEqual(['dry', 'warm']);
	});
});

describe('ranking', () => {
	const store = () => {
		results.P1 = {
			baseline: result({
				objectives: [
					[100, 50],
					[10, 5]
				],
				status: 'ok'
			})
		};
		selection.field = field;
	};

	it('defaults to the backend-equal uniform ranking', () => {
		store();
		expect(ranking()).toEqual([0, 1]);
		expect(planIndex()).toBe(0);
	});

	it('re-ranks when a priority weight changes', () => {
		store();
		priority.water = 9;
		expect(ranking()[0]).toBe(1);
		priority.water = 1;
	});

	it('honours an explicit plan selection', () => {
		store();
		selection.plan = 1;
		expect(planIndex()).toBe(1);
		selection.plan = 99;
		expect(planIndex()).toBe(0);
	});

	it('empty on non-ok sites', () => {
		results.P1 = { baseline: result({ status: 'error' }) };
		selection.field = field;
		expect(ranking()).toEqual([]);
	});
});
