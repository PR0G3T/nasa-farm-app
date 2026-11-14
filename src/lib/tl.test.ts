import { describe, expect, it } from 'vitest';
import {
	DAYS,
	H_HOME,
	H_MAX,
	H_MIN,
	clamp,
	dayAt,
	dayLabel,
	lanes,
	months,
	weeks,
	x
} from './tl.js';
import type { Event } from './data.js';

const ev = (id: string, start: number, end?: number): Event => ({
	id,
	label: id,
	track: 'ops',
	start,
	end
});

describe('x', () => {
	it('maps days to percentages', () => {
		expect(x(0)).toBe(0);
		expect(x(DAYS / 2)).toBe(50);
		expect(x(DAYS)).toBe(100);
	});
});

describe('clamp', () => {
	it('bounds values to the range', () => {
		expect(clamp(-1, H_MIN, H_MAX)).toBe(H_MIN);
		expect(clamp(99, H_MIN, H_MAX)).toBe(H_MAX);
		expect(clamp(H_HOME, H_MIN, H_MAX)).toBe(H_HOME);
	});
});

describe('dayAt', () => {
	it('converts a ratio to a rounded day', () => {
		expect(dayAt(0)).toBe(0);
		expect(dayAt(1)).toBe(DAYS);
		expect(dayAt(0.5)).toBe(Math.round(DAYS / 2));
	});

	it('clamps out-of-range ratios', () => {
		expect(dayAt(-0.2)).toBe(0);
		expect(dayAt(1.5)).toBe(DAYS);
	});
});

describe('lanes', () => {
	it('keeps non-overlapping events on a single lane', () => {
		expect(lanes([ev('a', 0, 10), ev('b', 12, 20)])).toHaveLength(1);
	});

	it('splits overlapping events across lanes', () => {
		expect(lanes([ev('a', 0, 10), ev('b', 5, 15)])).toHaveLength(2);
	});

	it('reuses a lane once the gap clears', () => {
		const out = lanes([ev('a', 0, 10), ev('b', 5, 15), ev('c', 12, 18)]);
		expect(out).toHaveLength(2);
		expect(out[0].evs.map((e) => e.id)).toEqual(['a', 'c']);
	});

	it('labels only the first lane', () => {
		const out = lanes([ev('a', 0, 10), ev('b', 5, 15)]);
		expect(out[0].label).toBe('Alerts');
		expect(out[1].label).toBe('');
	});

	it('never places overlapping events on the same lane', () => {
		const input = [ev('a', 0, 50), ev('b', 10, 60), ev('c', 20, 30), ev('d', 55, 70)];
		for (const row of lanes(input)) {
			for (let i = 1; i < row.evs.length; i++) {
				const prev = row.evs[i - 1];
				expect(row.evs[i].start).toBeGreaterThanOrEqual((prev.end ?? prev.start) + 2);
			}
		}
	});

	it('treats point events as zero-duration', () => {
		expect(lanes([ev('a', 0, 10), ev('p', 5)])).toHaveLength(2);
		expect(lanes([ev('p', 5), ev('q', 7)])).toHaveLength(1);
	});

	it('accepts unsorted input', () => {
		const out = lanes([ev('b', 6, 15), ev('a', 0, 4)]);
		expect(out[0].evs.map((e) => e.id)).toEqual(['a', 'b']);
	});
});

describe('ruler', () => {
	it('weeks step by 7 within range', () => {
		expect(weeks[0]).toBe(0);
		expect(weeks.at(-1)).toBeLessThanOrEqual(DAYS);
		for (let i = 1; i < weeks.length; i++) expect(weeks[i] - weeks[i - 1]).toBe(7);
	});

	it('months are strictly increasing and in range', () => {
		for (const m of months) expect(m.d).toBeLessThanOrEqual(DAYS);
		for (let i = 1; i < months.length; i++) {
			expect(months[i].d).toBeGreaterThan(months[i - 1].d);
		}
	});
});

describe('dayLabel', () => {
	it('formats the timeline start', () => {
		expect(dayLabel(0)).toBe('Mar 1');
	});

	it('formats any in-range day without crashing', () => {
		expect(() => dayLabel(DAYS)).not.toThrow();
		expect(dayLabel(DAYS)).toBeTruthy();
	});
});
