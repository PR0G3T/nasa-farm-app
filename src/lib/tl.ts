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

export const dayLabel = (d: number) =>
	`Y${Math.floor(d / YEAR) + 1} · ${MONTH_NAME[month(d % YEAR)]} ${dom(d % YEAR)}`;

/** Satellite imagery exists for real dates only — map sim-day onto this year's doy, capped at today. */
export const dayISO = (d: number) => {
	const y0 = Date.UTC(new Date().getUTCFullYear(), 0, 1);
	return new Date(Math.min(y0 + (d % YEAR) * DAY_MS, Date.now())).toISOString().slice(0, 10);
};

export type Tick = { d: number; label?: string; major?: boolean };

export function ticks(span: number): Tick[] {
	const years = Math.ceil(span / YEAR);
	const out: Tick[] = [];
	for (let y = 0; y < years; y++) {
		out.push({ d: y * YEAR + 1, label: `Y${y + 1}`, major: true });
		for (let m = 1; m < 12; m++) out.push({ d: y * YEAR + MONTH_END[m - 1] });
	}
	return out;
}
