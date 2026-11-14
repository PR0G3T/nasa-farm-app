import { afterEach, describe, expect, it, vi } from 'vitest';
import { names, parameters, pick, recommend } from './farm.js';
import type { PlanFile } from './farm.js';

const file: PlanFile = {
	version: '0.1.0',
	generated: '2026-11-14T00:00:00+00:00',
	request: {},
	fields: { P1: { name: 'P1' } },
	scenarios: {
		baseline: {
			params: {},
			fields: {
				P1: { status: 'ok', plans_evaluated: 125, scenarios: 5, top: [], pareto: [] }
			}
		},
		warm: { params: { delta_t: 2 }, fields: {} }
	}
};

describe('plan file helpers', () => {
	it('pick returns the site result for id+scenario', () => {
		expect(pick(file, 'P1', 'baseline')?.status).toBe('ok');
		expect(pick(file, 'P1', 'warm')).toBeNull();
		expect(pick(file, 'unknown', 'baseline')).toBeNull();
		expect(pick(null, 'P1', 'baseline')).toBeNull();
	});

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

	it('posts the field centroid and returns results[0]', async () => {
		const site = { status: 'ok', top: [{ rotation: ['maize'] }] };
		const spy = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ results: [site] }), { status: 200 })
		);
		vi.stubGlobal('fetch', spy);
		expect(await recommend(field, 'warm')).toEqual(site);
		const [u, init] = spy.mock.calls[0];
		expect(u).toBe('/api/plan');
		expect(JSON.parse(init.body)).toEqual({
			id: 'P1',
			lat: 48.2,
			lon: 1.61,
			scenario: 'warm'
		});
	});

	it('degrades to status error on http failure', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('x', { status: 503 })));
		expect((await recommend(field, 'baseline')).status).toBe('error');
	});

	it('degrades to status error on network failure', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
		expect((await recommend(field, 'baseline')).detail).toBe('down');
	});
});
