import { describe, expect, it } from 'vitest';
import {
	BIN,
	HEIGHT_HOME,
	HEIGHT_MAX,
	HEIGHT_MIN,
	YEAR,
	active,
	bands,
	canopy,
	clamp,
	dayAt,
	dayISO,
	dayLabel,
	day,
	hazard,
	month,
	ticks,
	x
} from './timeline.js';
import type { History, Trace } from './farm.js';

const OFFSET = 2 * YEAR; // 2 observed years
const ORIGIN = 2023;

describe('x', () => {
	it('maps days to percentages of the span', () => {
		expect(x(0, YEAR)).toBe(0);
		expect(x(YEAR / 2, YEAR)).toBe(50);
		expect(x(YEAR, YEAR)).toBe(100);
	});
});

describe('clamp', () => {
	it('bounds values to the range', () => {
		expect(clamp(-1, HEIGHT_MIN, HEIGHT_MAX)).toBe(HEIGHT_MIN);
		expect(clamp(99, HEIGHT_MIN, HEIGHT_MAX)).toBe(HEIGHT_MAX);
		expect(clamp(HEIGHT_HOME, HEIGHT_MIN, HEIGHT_MAX)).toBe(HEIGHT_HOME);
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
		const majors = ticks(OFFSET + 3 * YEAR, OFFSET, ORIGIN).filter((t) => t.major);
		expect(majors.map((t) => t.label)).toEqual(['2023', '2024', 'Y1', 'Y2', 'Y3']);
	});

	it('is strictly increasing and in range', () => {
		const span = OFFSET + 3 * YEAR;
		const list = ticks(span, OFFSET, ORIGIN);
		for (const tick of list) expect(tick.day).toBeLessThanOrEqual(span);
		for (let index = 1; index < list.length; index++) expect(list[index].day).toBeGreaterThan(list[index - 1].day);
	});
});

describe('dayLabel', () => {
	it('labels history days with the real year', () => {
		expect(dayLabel(0, OFFSET, ORIGIN)).toBe('2023 Jan 1');
		expect(dayLabel(YEAR, OFFSET, ORIGIN)).toBe('2024 Jan 1');
	});

	it('labels forecast days with the plan year', () => {
		expect(dayLabel(OFFSET, OFFSET, ORIGIN)).toBe('Y1 Jan 1');
		expect(dayLabel(OFFSET + YEAR, OFFSET, ORIGIN)).toBe('Y2 Jan 1');
	});
});

describe('calendar', () => {
	it('maps doy to month and day-of-month', () => {
		expect(month(0)).toBe(0);
		expect(month(31)).toBe(1);
		expect(day(0)).toBe(1);
		expect(day(31)).toBe(1);
		expect(day(59)).toBe(1);
	});
});

describe('dayISO', () => {
	it('maps history days to their real dates', () => {
		expect(dayISO(0, OFFSET, ORIGIN)).toBe('2023-01-01');
		expect(dayISO(YEAR + 31, OFFSET, ORIGIN)).toBe('2024-02-01');
	});

	it('returns a real past-or-today date for forecast days', () => {
		const today = new Date().toISOString().slice(0, 10);
		for (const day of [OFFSET, OFFSET + 100, OFFSET + 2 * YEAR + 30]) {
			expect(dayISO(day, OFFSET, ORIGIN)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			expect(dayISO(day, OFFSET, ORIGIN) <= today).toBe(true);
		}
	});
});

describe('bands', () => {
	const flag = (probability: number) => (probability > 0.5 ? 'watch' : null);

	it('returns [] for missing or empty probs', () => {
		expect(bands(undefined, flag)).toEqual([]);
		expect(bands([], flag)).toEqual([]);
		expect(bands([0.1, 0.2], flag)).toEqual([]);
	});

	it('runs contiguous flagged bins into day-scaled segments', () => {
		expect(bands([0.6, 0.7, 0.1, 0.8], flag)).toEqual([
			[0, 2 * BIN, 'watch'],
			[3 * BIN, 4 * BIN, 'watch']
		]);
	});

	it('keeps the max severity reached inside a run', () => {
		const cut = (probability: number) => (probability < 0.15 ? null : probability < 0.4 ? 'watch' : 'alert');
		expect(bands([0.2, 0.5, 0.2, 0.1, 0.6], cut)).toEqual([
			[0, 3 * BIN, 'alert'],
			[4 * BIN, 5 * BIN, 'alert']
		]);
	});

	it('flushes a segment open at the last bin', () => {
		expect(bands([0.1, 0.9], flag)).toEqual([[BIN, 2 * BIN, 'watch']]);
	});
});

describe('hazard', () => {
	const trace = (patch: Partial<Trace>): Trace => ({
		canopy: [],
		water: [],
		stress: [],
		heat: [],
		frost: [],
		...patch
	});

	it('applies the stress thresholds: <0.15 none, <0.4 watch, else alert', () => {
		expect(hazard('stress', trace({ stress: [0.1, 0.2, 0.5, 0.1] }))).toEqual([
			[BIN, 3 * BIN, 'alert']
		]);
		expect(hazard('stress', trace({ stress: [0.2, 0.3, 0.1] }))).toEqual([
			[0, 2 * BIN, 'watch']
		]);
	});

	it('applies the heat and frost alert thresholds', () => {
		expect(hazard('heat', trace({ heat: [0.1, 0.11, 0.05] }))).toEqual([
			[BIN, 2 * BIN, 'alert']
		]);
		expect(hazard('frost', trace({ frost: [0.05, 0.06, 0] }))).toEqual([
			[BIN, 2 * BIN, 'alert']
		]);
	});

	it('tolerates a missing trace or channel', () => {
		expect(hazard('stress', undefined)).toEqual([]);
		expect(hazard('heat', trace({}))).toEqual([]);
	});
});

describe('active', () => {
	const trace = (patch: Partial<Trace>): Trace => ({
		canopy: [],
		water: [],
		stress: [],
		heat: [],
		frost: [],
		...patch
	});
	const history = (patch: Partial<History>): History => ({
		y0: ORIGIN,
		years: 2,
		dry: [],
		heat: [],
		frost: [],
		...patch
	});

	it('returns null without data or outside bands', () => {
		expect(active(10, OFFSET, undefined, undefined)).toBeNull();
		expect(active(10, OFFSET, trace({}), history({}))).toBeNull();
	});

	it('resolves observed bands before the offset with fixed severities', () => {
		const past = history({ dry: [[3, 11]], heat: [[3, 11]], frost: [[40, 50]] });
		expect(active(5, OFFSET, undefined, past)).toEqual({
			id: 'heat',
			severity: 'alert',
			origin: 'observed'
		});
		expect(active(45, OFFSET, undefined, past)).toEqual({
			id: 'frost',
			severity: 'mute',
			origin: 'observed'
		});
		expect(active(11, OFFSET, undefined, past)).toBeNull();
	});

	it('resolves predicted segments after the offset from the trace', () => {
		const future = trace({ stress: [0.5, 0, 0], heat: [0, 0.2, 0] });
		expect(active(OFFSET + 1, OFFSET, future, undefined)).toEqual({
			id: 'stress',
			severity: 'alert',
			origin: 'predicted'
		});
		expect(active(OFFSET + BIN + 1, OFFSET, future, undefined)).toEqual({
			id: 'heat',
			severity: 'alert',
			origin: 'predicted'
		});
		expect(active(OFFSET + 2 * BIN + 1, OFFSET, future, undefined)).toBeNull();
	});

	it('keeps the highest severity when hazards overlap', () => {
		const future = trace({ stress: [0.2], frost: [0.2] });
		expect(active(OFFSET, OFFSET, future, undefined)).toEqual({
			id: 'frost',
			severity: 'alert',
			origin: 'predicted'
		});
	});
});

describe('canopy', () => {
	const bins = Math.ceil((3 * YEAR) / BIN); // 3 forecast years

	it('returns null without data or coverage', () => {
		expect(canopy(undefined, 0)).toBeNull();
		expect(canopy(new Array(bins).fill(0.1), 0)).toBeNull();
	});

	it('maps the covered bin span to days', () => {
		const values = new Array(bins).fill(0);
		for (let index = 10; index <= 20; index++) values[index] = 0.5;
		expect(canopy(values, 0)).toEqual([10 * BIN, 21 * BIN]);
	});

	it('scopes the window to the requested year', () => {
		const values = new Array(bins).fill(0.5);
		values[Math.floor(YEAR / BIN)] = 0; // gap at first bin of year 1
		const range = canopy(values, 1);
		expect(range?.[0]).toBe((Math.floor(YEAR / BIN) + 1) * BIN);
		expect(range?.[1]).toBeLessThanOrEqual(2 * YEAR);
	});
});
