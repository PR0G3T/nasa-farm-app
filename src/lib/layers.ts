export type Layer = {
	id: string;
	label: string;
	detail: string;
	/** One-line plain explanation shown on hover. */
	hint: string;
	unit: string;
	lo: number;
	hi: number;
	ramp: string[];
	digits: number;
	/** Direction of the alarming tail: -1 low values, +1 high, 0 not a signal layer. */
	dir: -1 | 0 | 1;
	/** Absolute agronomic threshold breached in the dir direction, in unit. */
	limit?: number;
	/** Alarming change vs the previous observation, in unit. */
	shift?: number;
	/** Ground sample distance, metres. */
	native: number;
	maxzoom: number;
	source: string;
	dates: string[];
};

export type Stat = { mean: number; p10: number; p90: number; n: number };

export type Stats = Record<string, Record<string, Record<string, Stat>>>;

const S2 = [
	'2025-05-08',
	'2025-07-14',
	'2025-08-26',
	'2026-06-19',
	'2026-06-22',
	'2026-06-24',
	'2026-06-29',
	'2026-07-02',
	'2026-07-07',
	'2026-07-11',
	'2026-07-12',
	'2026-07-14',
	'2026-07-17',
	'2026-07-19',
	'2026-07-27',
	'2026-07-29',
	'2026-08-01',
	'2026-08-03',
	'2026-08-06',
	'2026-08-08',
	'2026-08-11',
	'2026-08-20',
	'2026-08-21',
	'2026-08-26',
	'2026-08-28',
	'2026-09-02',
	'2026-09-12',
	'2026-10-02',
	'2026-10-05',
	'2026-10-07',
	'2026-10-10',
	'2026-10-12',
	'2026-10-17',
	'2026-10-20',
	'2026-10-22',
	'2026-10-25',
	'2026-11-06',
	'2026-11-08',
	'2026-11-09',
	'2026-11-11',
	'2026-11-14'
];
const LS = [
	'2025-07-23',
	'2025-09-26',
	'2026-06-16',
	'2026-06-24',
	'2026-06-25',
	'2026-07-03',
	'2026-07-11',
	'2026-07-18',
	'2026-07-19',
	'2026-07-26',
	'2026-07-27',
	'2026-08-11',
	'2026-08-20',
	'2026-08-27',
	'2026-08-28',
	'2026-09-04',
	'2026-09-12',
	'2026-09-13',
	'2026-09-28',
	'2026-10-06',
	'2026-10-07',
	'2026-10-22',
	'2026-10-23',
	'2026-11-08'
];
const SENTINEL = 'Sentinel-2 L2A, ESA via Planetary Computer';
const CANOPY = ['#d00000', '#f07000', '#e8bf1f', '#8ac248', '#2ca25f', '#006d2c'];
const WATER = ['#c2181b', '#f06a1d', '#f2b01e', '#2ab0a5', '#1d7ec4', '#08306b'];
const HEAT = ['#24479e', '#2b7fc0', '#1fb0a6', '#f2b01e', '#e85a24', '#a50026'];

export const LAYERS: Layer[] = [
	{
		id: 'rgb',
		label: 'True colour',
		detail: 'Surface reflectance composite',
		hint: 'Satellite photo, the field as your eyes would see it',
		unit: '',
		lo: 0,
		hi: 1,
		ramp: [],
		digits: 0,
		dir: 0,
		native: 10,
		maxzoom: 13,
		source: SENTINEL,
		dates: S2
	},
	{
		id: 'ndvi',
		label: 'NDVI',
		detail: 'Canopy greenness',
		hint: 'Crop vigor, green is healthy growth and red is bare or stressed',
		unit: '',
		lo: 0,
		hi: 0.85,
		ramp: CANOPY,
		digits: 2,
		dir: -1,
		limit: 0.3,
		shift: 0.15,
		native: 10,
		maxzoom: 13,
		source: SENTINEL,
		dates: S2
	},
	{
		id: 'ndmi',
		label: 'Water',
		detail: 'Canopy water content',
		hint: 'Water inside the canopy, blue is hydrated and red is dry stress',
		unit: '',
		lo: -0.35,
		hi: 0.55,
		ramp: WATER,
		digits: 2,
		dir: -1,
		limit: 0,
		shift: 0.15,
		native: 20,
		maxzoom: 13,
		source: SENTINEL,
		dates: S2
	},
	{
		id: 'lst',
		label: 'Heat',
		detail: 'Land surface temperature',
		hint: 'Ground and leaf temperature, red means heat stress',
		unit: '°C',
		lo: 15,
		hi: 45,
		ramp: HEAT,
		digits: 1,
		dir: 1,
		limit: 40,
		shift: 6,
		native: 100,
		maxzoom: 12,
		source: 'Landsat 8/9 C2 L2, USGS via Planetary Computer',
		dates: LS
	}
];

export type Signal = {
	layer: Layer;
	/** sector: outlier vs neighbours · limit: past agronomic threshold · shift: sharp change vs previous scene */
	kind: 'sector' | 'limit' | 'shift';
	date: string;
	value: number;
	/** Comparison point: sector median, absolute limit, or previous observation. */
	ref: number;
	/** Date of the previous observation, for shift signals. */
	prev?: string;
	/** Severity, in multiples of the triggering threshold. */
	score: number;
};

const MIN_FIELDS = 5;
const CUTOFF = 1.5;

const median = (values: number[]) => {
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/** Dates where a field shows an alarming signal: sector outlier, limit breach, or sharp change. */
export function signals(stats: Stats, field: string): Signal[] {
	const found = new Map<string, Signal>();
	const push = (signal: Signal) => {
		const key = `${signal.layer.id}|${signal.date}`;
		const kept = found.get(key);
		if (!kept || signal.score > kept.score) found.set(key, signal);
	};
	for (const layer of LAYERS) {
		if (!layer.dir) continue;
		const per = stats[layer.id] ?? {};
		const range = layer.hi - layer.lo;
		let last: { date: string; mean: number } | undefined;
		for (const date of Object.keys(per).sort()) {
			const mine = per[date][field]?.mean;
			if (mine === undefined) continue;
			const values = Object.values(per[date]).map((s) => s.mean);
			if (values.length >= MIN_FIELDS) {
				const center = median(values);
				const mad = median(values.map((value) => Math.abs(value - center))) * 1.4826;
				const z = mad > 1e-9 ? (layer.dir * (mine - center)) / mad : 0;
				if (z > CUTOFF)
					push({ layer, kind: 'sector', date, value: mine, ref: center, score: z / CUTOFF });
			}
			if (layer.limit !== undefined && layer.dir * (mine - layer.limit) > 0)
				push({
					layer,
					kind: 'limit',
					date,
					value: mine,
					ref: layer.limit,
					score: 1 + (layer.dir * (mine - layer.limit)) / range
				});
			if (last && layer.shift !== undefined) {
				const delta = layer.dir * (mine - last.mean);
				if (delta > layer.shift)
					push({
						layer,
						kind: 'shift',
						date,
						value: mine,
						ref: last.mean,
						prev: last.date,
						score: delta / layer.shift
					});
			}
			last = { date, mean: mine };
		}
	}
	return [...found.values()].sort((a, b) => b.score - a.score);
}

export const layerOf = (id: string) => LAYERS.find((layer) => layer.id === id) ?? LAYERS[0];

/** Closest available date so the timeline never lands on a gap. */
export function nearest(layer: Layer, date: string): string {
	if (!layer.dates.length) return date;
	return layer.dates.reduce((best, candidate) =>
		Math.abs(Date.parse(candidate) - Date.parse(date)) <
		Math.abs(Date.parse(best) - Date.parse(date))
			? candidate
			: best
	);
}
