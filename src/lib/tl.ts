import type { Trace } from './farm.js';

export const YEAR = 365;
export const DAY_MS = 86400000;
export const BIN = 7;

export const H_MIN = 8;
export const H_MAX = 24;
export const H_HOME = 11;

const MONTH_END = [31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];
const MONTH_NAME = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const x = (day: number, span: number) => (day / span) * 100;
export const dayAt = (ratio: number, span: number) => clamp(Math.round(ratio * span), 0, span);

export const month = (doy: number) => MONTH_END.findIndex((e) => doy < e);
export const dom = (doy: number) => doy - (MONTH_END[month(doy) - 1] ?? 0) + 1;

const cal = (doy: number) => `${MONTH_NAME[month(doy)]} ${dom(doy)}`;

export const dayLabel = (d: number, hOff: number, y0: number) =>
	d < hOff
		? `${y0 + Math.floor(d / YEAR)} · ${cal(d % YEAR)}`
		: `Y${Math.floor((d - hOff) / YEAR) + 1} · ${cal(d % YEAR)}`;

/** Imagery exists for real dates only — history days map to their real dates,
 * forecast days map to the same doy of the current year, capped at today. */
export const dayISO = (d: number, hOff: number, y0: number) => {
	const year = d < hOff ? y0 + Math.floor(d / YEAR) : new Date().getUTCFullYear();
	return new Date(Math.min(Date.UTC(year, 0, 1) + (d % YEAR) * DAY_MS, Date.now()))
		.toISOString()
		.slice(0, 10);
};

export type Sev = 'watch' | 'alert' | 'mute';
export type Seg = [start: number, end: number, sev: Sev];
export type Hazard = 'stress' | 'heat' | 'frost';
export const HAZARDS: Hazard[] = ['stress', 'heat', 'frost'];

const CUT: Record<Hazard, (p: number) => Sev | null> = {
	stress: (p) => (p < 0.15 ? null : p < 0.4 ? 'watch' : 'alert'),
	heat: (p) => (p > 0.1 ? 'alert' : null),
	frost: (p) => (p > 0.05 ? 'alert' : null)
};

/** Runs contiguous flagged bins into segments carrying the run's max severity. */
export function bands(
	probs: number[] | undefined,
	cut: (p: number) => Sev | null
): Seg[] {
	const out: Seg[] = [];
	let s = -1;
	let c: Sev = 'watch';
	probs?.forEach((p, i) => {
		const l = cut(p);
		if (l && s < 0) ((s = i), (c = l));
		else if (l === 'alert') c = 'alert';
		else if (!l && s >= 0) (out.push([s * BIN, i * BIN, c]), (s = -1));
	});
	if (s >= 0) out.push([s * BIN, (probs?.length ?? 0) * BIN, c]);
	return out;
}

export const hazard = (id: Hazard, t?: Trace): Seg[] => bands(t?.[id], CUT[id]);

/** Canopy window (days) within forecast year y where bins exceed coverage. */
export function canopy(a: number[] | undefined, y: number): [number, number] | null {
	if (!a) return null;
	const w0 = Math.floor((y * YEAR) / BIN);
	const w1 = Math.min(a.length, w0 + Math.ceil(YEAR / BIN));
	let lo = -1;
	let hi = -1;
	for (let i = w0; i < w1; i++) if (a[i] > 0.2) (lo < 0 && (lo = i), (hi = i));
	return lo < 0 ? null : [lo * BIN, Math.min((hi + 1) * BIN, (y + 1) * YEAR)];
}

export type Tick = { d: number; label?: string; major?: boolean };

export function ticks(span: number, hOff: number, y0: number): Tick[] {
	const out: Tick[] = [];
	for (let d = 0; d < span; d += YEAR) {
		out.push({
			d: d + 1,
			label: d < hOff ? `${y0 + d / YEAR}` : `Y${(d - hOff) / YEAR + 1}`,
			major: true
		});
		for (let m = 1; m < 12; m++) {
			const t = d + MONTH_END[m - 1];
			if (t < span) out.push({ d: t });
		}
	}
	return out;
}
