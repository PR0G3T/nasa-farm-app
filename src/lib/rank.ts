/** Exact client port of the backend ranking — same range-normalized
 * scalarization and pairwise Pareto dominance as `nasa_farm.plan`, so a
 * priority change re-ranks identically without a round-trip. */

export const PRIORITIES = [
	{ key: 'yield', label: 'Yield', columns: ['yield_mean'] },
	{ key: 'stability', label: 'Stability', columns: ['yield_risk'] },
	{ key: 'water', label: 'Water', columns: ['water_used'] },
	{ key: 'soil', label: 'Soil', columns: ['soc_gain', 'n_min_end'] },
	{ key: 'nitrogen', label: 'Nitrogen', columns: ['n_leached', 'n2o_kg'] },
	{ key: 'climate', label: 'Climate', columns: ['stress_days', 'heat_dd', 'frost_days'] }
] as const;

export type PriorityKey = (typeof PRIORITIES)[number]['key'];
export type Priorities = Record<PriorityKey, number>;
export const DEFAULT_PRIORITY = 1;

const column = new Map<string, PriorityKey>(
	PRIORITIES.flatMap((p) => p.columns.map((c) => [c, p.key] as const))
);

/** Per-column weight vector from slider positions (absent → 1). */
export const weightsFor = (columns: string[], priority: Priorities): number[] =>
	columns.map((c) => {
		const key = column.get(c);
		return key === undefined ? DEFAULT_PRIORITY : priority[key];
	});

/** Range-normalized weighted score (R,); higher is better. signs: +1 maximize. */
export function scoresOf(points: number[][], directions: number[], weights: number[]): number[] {
	const m = points[0]?.length ?? 0;
	const low = Array.from({ length: m }, () => Infinity);
	const high = Array.from({ length: m }, () => -Infinity);
	for (const row of points)
		for (let j = 0; j < m; j++) {
			const z = row[j] * directions[j];
			if (z < low[j]) low[j] = z;
			if (z > high[j]) high[j] = z;
		}
	const total = weights.reduce((sum, w) => sum + w, 0) || 1;
	return points.map((row) => {
		let score = 0;
		for (let j = 0; j < m; j++) {
			const span = Math.max(high[j] - low[j], 1e-9);
			score += (((row[j] * directions[j] - low[j]) / span) * weights[j]) / total;
		}
		return score;
	});
}

/** Indices of non-dominated rows — a is dominated iff some b is weakly ≥ a
 * on every signed objective and strictly > on at least one. */
export function pareto(points: number[][], directions: number[]): number[] {
	const z = points.map((row) => row.map((v, j) => v * directions[j]));
	const out: number[] = [];
	for (let a = 0; a < z.length; a++) {
		let dominated = false;
		for (let b = 0; b < z.length && !dominated; b++) {
			let greater = false;
			let weakly = true;
			for (let j = 0; j < z[a].length; j++) {
				if (z[b][j] < z[a][j]) {
					weakly = false;
					break;
				}
				if (z[b][j] > z[a][j]) greater = true;
			}
			if (weakly && greater) dominated = true;
		}
		if (!dominated) out.push(a);
	}
	return out;
}

/** Descending stable argsort — ties keep input order (torch stable=True parity). */
export const order = (scores: number[]): number[] =>
	scores.map((_, i) => i).sort((a, b) => scores[b] - scores[a] || a - b);

export const ranked = (
	points: number[][],
	directions: number[],
	weights: number[]
): number[] => order(scoresOf(points, directions, weights));
