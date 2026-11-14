import { describe, expect, it } from 'vitest';
import { events, fields, find } from './data.js';
import { DAYS } from './tl.js';

const LEVELS = ['low', 'watch', 'alert'];

describe('fields', () => {
	it('have unique ids', () => {
		expect(new Set(fields.map((f) => f.id)).size).toBe(fields.length);
	});

	it('have valid geometry', () => {
		for (const f of fields) {
			expect(f.ha).toBeGreaterThan(0);
			expect(f.center[0]).toBeGreaterThanOrEqual(-180);
			expect(f.center[0]).toBeLessThanOrEqual(180);
			expect(f.center[1]).toBeGreaterThanOrEqual(-90);
			expect(f.center[1]).toBeLessThanOrEqual(90);
		}
	});
});

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

	it('reference existing fields', () => {
		const names = new Set(fields.map((f) => f.name));
		for (const e of events) {
			expect(!e.field || names.has(e.field)).toBe(true);
		}
	});
});

describe('find', () => {
	it('returns everything on a blank query', () => {
		expect(find(fields, '')).toHaveLength(fields.length);
		expect(find(fields, '   ')).toHaveLength(fields.length);
	});

	it('matches case-insensitive substrings', () => {
		expect(find(fields, 'NORTH').map((f) => f.id)).toEqual(['north-40']);
		expect(find(fields, 'field').map((f) => f.id)).toEqual(['ridge-field']);
		expect(find(fields, 'r')).toHaveLength(5);
	});

	it('returns nothing on no match', () => {
		expect(find(fields, 'zzz')).toHaveLength(0);
	});
});
