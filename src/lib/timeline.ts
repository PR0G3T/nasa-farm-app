import type { Trace } from './farm.js';

export const YEAR = 365;
export const DAY_MS = 86400000;
export const BIN = 7;

export const HEIGHT_MIN = 8;
export const HEIGHT_MAX = 24;
export const HEIGHT_HOME = 11;

const MONTH_END = [31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];
const MONTH_NAME = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
export const x = (day: number, span: number) => (day / span) * 100;
export const dayAt = (ratio: number, span: number) => clamp(Math.round(ratio * span), 0, span);

export const month = (doy: number) => MONTH_END.findIndex((end) => doy < end);
export const day = (doy: number) => doy - (MONTH_END[month(doy) - 1] ?? 0) + 1;

const date = (doy: number) => `${MONTH_NAME[month(doy)]} ${day(doy)}`;

export const dayLabel = (day: number, offset: number, origin: number) =>
	day < offset
		? `${origin + Math.floor(day / YEAR)} · ${date(day % YEAR)}`
		: `Y${Math.floor((day - offset) / YEAR) + 1} · ${date(day % YEAR)}`;

/** Imagery exists for real dates only — history days map to their real dates,
 * forecast days map to the same doy of the current year, capped at today. */
export const dayISO = (day: number, offset: number, origin: number) => {
	const year = day < offset ? origin + Math.floor(day / YEAR) : new Date().getUTCFullYear();
	return new Date(Math.min(Date.UTC(year, 0, 1) + (day % YEAR) * DAY_MS, Date.now()))
		.toISOString()
		.slice(0, 10);
};

export type Severity = 'watch' | 'alert' | 'mute';
export type Segment = [start: number, end: number, severity: Severity];
export type Hazard = 'stress' | 'heat' | 'frost';
export const HAZARDS: Hazard[] = ['stress', 'heat', 'frost'];

const CUTOFF: Record<Hazard, (probability: number) => Severity | null> = {
	stress: (p) => (p < 0.15 ? null : p < 0.4 ? 'watch' : 'alert'),
	heat: (p) => (p > 0.1 ? 'alert' : null),
	frost: (p) => (p > 0.05 ? 'alert' : null)
};

/** Runs contiguous flagged bins into segments carrying the run's max severity. */
export function bands(
	probabilities: number[] | undefined,
	cut: (probability: number) => Severity | null
): Segment[] {
	const segments: Segment[] = [];
	let start = -1;
	let severity: Severity = 'watch';
	probabilities?.forEach((probability, index) => {
		const level = cut(probability);
		if (level && start < 0) ((start = index), (severity = level));
		else if (level === 'alert') severity = 'alert';
		else if (!level && start >= 0) (segments.push([start * BIN, index * BIN, severity]), (start = -1));
	});
	if (start >= 0) segments.push([start * BIN, (probabilities?.length ?? 0) * BIN, severity]);
	return segments;
}

export const hazard = (id: Hazard, trace?: Trace): Segment[] => bands(trace?.[id], CUTOFF[id]);

/** Canopy window (days) within forecast year y where bins exceed coverage. */
export function canopy(values: number[] | undefined, year: number): [number, number] | null {
	if (!values) return null;
	const first = Math.floor((year * YEAR) / BIN);
	const last = Math.min(values.length, first + Math.ceil(YEAR / BIN));
	let low = -1;
	let high = -1;
	for (let bin = first; bin < last; bin++)
		if (values[bin] > 0.2) (low < 0 && (low = bin), (high = bin));
	return low < 0 ? null : [low * BIN, Math.min((high + 1) * BIN, (year + 1) * YEAR)];
}

export type Tick = { day: number; label?: string; major?: boolean };

export function ticks(span: number, offset: number, origin: number): Tick[] {
	const list: Tick[] = [];
	for (let base = 0; base < span; base += YEAR) {
		list.push({
			day: base + 1,
			label: base < offset ? `${origin + base / YEAR}` : `Y${(base - offset) / YEAR + 1}`,
			major: true
		});
		for (let index = 1; index < 12; index++) {
			const next = base + MONTH_END[index - 1];
			if (next < span) list.push({ day: next });
		}
	}
	return list;
}
