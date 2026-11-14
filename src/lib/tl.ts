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
