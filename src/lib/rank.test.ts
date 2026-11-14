import { describe, expect, it } from 'vitest';
import {
	DEFAULT_PRIORITY,
	PRIORITIES,
	order,
	pareto,
	ranked,
	scoresOf,
	weightsFor,
	type Priorities
} from './rank.js';
import fixture from './rank.fixture.json';

type Fixture = {
	columns: string[];
	directions: number[];
	objectives: number[][];
	cases: {
		weights: Record<string, number>;
		scores: number[];
		ranking: number[];
		pareto: number[];
	}[];
};
const data = fixture as Fixture;

const vector = (weights: Record<string, number>, columns: string[]) =>
	columns.map((c) => weights[c] ?? 1);

describe('backend parity', () => {
	it.each(data.cases.map((c, i) => [i, c] as const))(
		'case %i: scores, ranking and pareto match the backend',
		(_, c) => {
			const scores = scoresOf(data.objectives, data.directions, vector(c.weights, data.columns));
			for (const [i, expected] of c.scores.entries())
				expect(Number(scores[i].toFixed(4))).toBeCloseTo(expected, 6);
			expect(order(scores).slice(0, c.ranking.length)).toEqual(c.ranking);
			expect(pareto(data.objectives, data.directions)).toEqual([...c.pareto].sort((a, b) => a - b));
		}
	);
});

describe('pareto', () => {
	const d = [1, -1];

	it('keeps non-dominated rows only', () => {
		// b beats a on both; c trades off (better yield, worse water).
		const points = [
			[1, 10], // a dominated
			[2, 5], // b
			[3, 12] // c
		];
		expect(pareto(points, d)).toEqual([1, 2]);
	});

	it('keeps identical rows — strict dominance required', () => {
		expect(
			pareto(
				[
					[1, 1],
					[1, 1]
				],
				d
			)
		).toEqual([0, 1]);
	});

	it('single point is always on the front', () => {
		expect(pareto([[5, 5]], d)).toEqual([0]);
	});
});

describe('scoresOf', () => {
	it('single weight picks that objective extremum', () => {
		const points = [
			[10, 3],
			[20, 9],
			[15, 1]
		];
		const scores = scoresOf(points, [1, -1], [1, 0]);
		expect(order(scores)[0]).toBe(1); // max col 0
		expect(order(scoresOf(points, [1, -1], [0, 1]))[0]).toBe(2); // min col 1
	});

	it('constant column contributes nothing (span floor)', () => {
		const points = [
			[7, 2],
			[7, 9]
		];
		const scores = scoresOf(points, [1, 1], [1, 1]);
		expect(scores[1]).toBeGreaterThan(scores[0]);
	});
});

describe('weightsFor', () => {
	it('maps slider priorities onto objective columns, default 1', () => {
		const priority = Object.fromEntries(
			PRIORITIES.map((p) => [p.key, DEFAULT_PRIORITY])
		) as Priorities;
		priority.soil = 3;
		expect(weightsFor(['yield_mean', 'soc_gain', 'n_min_end', 'unknown_x'], priority)).toEqual([
			1, 3, 3, 1
		]);
	});
});

describe('order', () => {
	it('is stable on ties — keeps input order', () => {
		expect(order([0.5, 0.9, 0.9])).toEqual([1, 2, 0]);
	});
});

describe('ranked', () => {
	it('returns every plan index once', () => {
		const out = ranked(data.objectives, data.directions, data.directions.map(() => 1));
		expect([...out].sort((a, b) => a - b)).toEqual(data.objectives.map((_, i) => i));
	});
});
