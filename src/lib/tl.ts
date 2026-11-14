import type { Event } from './data.js';

export const START = Date.UTC(2026, 2, 1);
export const DAYS = 245;
export const DAY_MS = 86400000;

export const H_MIN = 8;
export const H_MAX = 24;
export const H_HOME = 11;

export const months = [
	{ label: 'Mar', d: 0 },
	{ label: 'Apr', d: 31 },
	{ label: 'May', d: 61 },
	{ label: 'Jun', d: 92 },
	{ label: 'Jul', d: 122 },
	{ label: 'Aug', d: 153 },
	{ label: 'Sep', d: 184 },
	{ label: 'Oct', d: 214 }
];

export const weeks = Array.from({ length: Math.floor(DAYS / 7) + 1 }, (_, i) => i * 7);

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const x = (day: number) => (day / DAYS) * 100;
export const dayAt = (ratio: number) => clamp(Math.round(ratio * DAYS), 0, DAYS);

const fmt = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' });
export const dayLabel = (day: number) => fmt.format(START + day * DAY_MS);
export const dayISO = (day: number) => new Date(START + day * DAY_MS).toISOString().slice(0, 10);

export type Row = { label: string; evs: Event[] };

export function lanes(evs: Event[]): Row[] {
	const out: { evs: Event[]; end: number }[] = [];
	for (const ev of evs.toSorted((a, b) => a.start - b.start)) {
		let lane = out.find((l) => l.end + 2 <= ev.start);
		if (!lane) {
			lane = { evs: [], end: -1 };
			out.push(lane);
		}
		lane.evs.push(ev);
		lane.end = ev.end ?? ev.start;
	}
	return out.map((l, i) => ({ label: i === 0 ? 'Alerts' : '', evs: l.evs }));
}
