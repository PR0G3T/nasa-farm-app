import { describe, expect, it } from 'vitest';
import { events, find, type Field } from './data.js';
import { DAYS } from './tl.js';

const LEVELS = ['low', 'watch', 'alert'];

const fs = (names: string[]): Field[] =>
	names.map((name) => ({
		id: name,
		name,
		crop: 'x',
		ha: 1,
		center: [0, 0],
		ring: [[0, 0]]
	}));

describe('events', () => {
	it('have unique ids', () => {
		expect(new Set(events.map((e) => e.id)).size).toBe(events.length);
	});

	it('end after they start and stay in range', () => {
		for (const e of events) {
			expect(e.start).toBeGreaterThanOrEqual(0);
			expect(e.start).toBeLessThanOrEqual(DAYS);
			if (e.end !== undefined) {
				expect(e.end).toBeGreaterThanOrEqual(e.start);
				expect(e.end).toBeLessThanOrEqual(DAYS);
			}
		}
	});

	it('only use known levels', () => {
		for (const e of events) {
			expect(!e.level || LEVELS.includes(e.level)).toBe(true);
		}
	});

	it('include imagery passes and anomalies', () => {
		expect(events.some((e) => e.track === 'imagery')).toBe(true);
		expect(events.some((e) => e.track === 'ops')).toBe(true);
	});
});

describe('find', () => {
	const list = fs(['North 40', 'Creek Bottom', 'P1036']);

	it('returns everything on a blank query', () => {
		expect(find(list, '')).toHaveLength(list.length);
		expect(find(list, '   ')).toHaveLength(list.length);
	});

	it('matches case-insensitive substrings', () => {
		expect(find(list, 'NORTH').map((f) => f.id)).toEqual(['North 40']);
		expect(find(list, 'p10').map((f) => f.id)).toEqual(['P1036']);
	});

	it('returns nothing on no match', () => {
		expect(find(list, 'zzz')).toHaveLength(0);
	});
});
