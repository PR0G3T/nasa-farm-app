import { describe, expect, it } from 'vitest';
import {
	BIN,
	H_HOME,
	H_MAX,
	H_MIN,
	YEAR,
	clamp,
	dayAt,
	dayISO,
	dayLabel,
	dom,
	month,
	ticks,
	x
} from './tl.js';

describe('x', () => {
	it('maps days to percentages of the span', () => {
		expect(x(0, YEAR)).toBe(0);
		expect(x(YEAR / 2, YEAR)).toBe(50);
		expect(x(YEAR, YEAR)).toBe(100);
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
		expect(dayAt(0, YEAR)).toBe(0);
		expect(dayAt(1, YEAR)).toBe(YEAR);
		expect(dayAt(0.5, YEAR)).toBe(Math.round(YEAR / 2));
	});

	it('clamps out-of-range ratios', () => {
		expect(dayAt(-0.2, YEAR)).toBe(0);
		expect(dayAt(1.5, YEAR)).toBe(YEAR);
	});
});

describe('ticks', () => {
	it('labels one major tick per year', () => {
		const majors = ticks(3 * YEAR).filter((t) => t.major);
		expect(majors.map((t) => t.label)).toEqual(['Y1', 'Y2', 'Y3']);
	});

	it('is strictly increasing and in range', () => {
		const ts = ticks(3 * YEAR);
		for (const t of ts) expect(t.d).toBeLessThanOrEqual(3 * YEAR);
		for (let i = 1; i < ts.length; i++) expect(ts[i].d).toBeGreaterThan(ts[i - 1].d);
	});
});

describe('dayLabel', () => {
	it('formats day 0 as year 1 January 1', () => {
		expect(dayLabel(0)).toBe('Y1 · Jan 1');
	});

	it('rolls into the next year at the boundary', () => {
		expect(dayLabel(YEAR)).toBe('Y2 · Jan 1');
	});

	it('formats any in-range day without crashing', () => {
		expect(dayLabel(3 * YEAR)).toBeTruthy();
	});
});

describe('calendar', () => {
	it('maps doy to month and day-of-month', () => {
		expect(month(0)).toBe(0);
		expect(month(31)).toBe(1);
		expect(dom(0)).toBe(1);
		expect(dom(31)).toBe(1);
		expect(dom(59)).toBe(1);
	});
});

describe('dayISO', () => {
	it('returns a real past-or-today ISO date', () => {
		const today = new Date().toISOString().slice(0, 10);
		for (const d of [0, 100, YEAR, 2 * YEAR + 30]) {
			expect(dayISO(d)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			expect(dayISO(d) <= today).toBe(true);
		}
	});

	it('maps sim days to the same doy of the current year', () => {
		const y = new Date().getUTCFullYear();
		expect(dayISO(YEAR + 31)).toBe(`${y}-02-01`);
	});
});
