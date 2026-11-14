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

const H = 2 * YEAR; // 2 observed years
const Y0 = 2023;

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
	it('labels history years then forecast years', () => {
		const majors = ticks(H + 3 * YEAR, H, Y0).filter((t) => t.major);
		expect(majors.map((t) => t.label)).toEqual(['2023', '2024', 'Y1', 'Y2', 'Y3']);
	});

	it('is strictly increasing and in range', () => {
		const span = H + 3 * YEAR;
		const ts = ticks(span, H, Y0);
		for (const t of ts) expect(t.d).toBeLessThanOrEqual(span);
		for (let i = 1; i < ts.length; i++) expect(ts[i].d).toBeGreaterThan(ts[i - 1].d);
	});
});

describe('dayLabel', () => {
	it('labels history days with the real year', () => {
		expect(dayLabel(0, H, Y0)).toBe('2023 · Jan 1');
		expect(dayLabel(YEAR, H, Y0)).toBe('2024 · Jan 1');
	});

	it('labels forecast days with the plan year', () => {
		expect(dayLabel(H, H, Y0)).toBe('Y1 · Jan 1');
		expect(dayLabel(H + YEAR, H, Y0)).toBe('Y2 · Jan 1');
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
	it('maps history days to their real dates', () => {
		expect(dayISO(0, H, Y0)).toBe('2023-01-01');
		expect(dayISO(YEAR + 31, H, Y0)).toBe('2024-02-01');
	});

	it('returns a real past-or-today date for forecast days', () => {
		const today = new Date().toISOString().slice(0, 10);
		for (const d of [H, H + 100, H + 2 * YEAR + 30]) {
			expect(dayISO(d, H, Y0)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			expect(dayISO(d, H, Y0) <= today).toBe(true);
		}
	});
});
