import type { Field } from './data.js';

export type Parameters = Record<string, number>;
export type Trace = {
	canopy: number[];
	water: number[];
	stress: number[];
	heat: number[];
	frost: number[];
};
export type Band = [number, number];
export type History = {
	y0: number;
	years: number;
	dry: Band[];
	heat: Band[];
	frost: Band[];
	sm?: number[];
};

export type Site = {
	status: 'ok' | 'error';
	detail?: string;
	plans_evaluated: number;
	scenarios: number;
	/** (R, M) objective matrix — rows align with `rotations`. */
	objectives: number[][];
	pareto: number[];
	ranking: number[];
	scores: number[];
	traces: Trace[];
	history?: History;
};

export type Result = {
	site: Site;
	columns: string[];
	directions: number[];
	rotations: string[][];
};

/** `plan.json` — lightweight index; per-field data lives in `plan/{id}.json`. */
export type PlanIndex = {
	version: string;
	generated: string;
	request: Record<string, unknown>;
	columns: string[];
	directions: number[];
	rotations: string[][];
	fields: Record<string, { name?: string; crop?: string; ha?: number; history?: History }>;
	scenarios: Record<string, { params: Parameters }>;
};

export type Shard = { history?: History; scenarios: Record<string, Site> };

const empty: Site = {
	status: 'error',
	plans_evaluated: 0,
	scenarios: 0,
	objectives: [],
	pareto: [],
	ranking: [],
	scores: [],
	traces: []
};

export const site = (raw: Partial<Site> | null | undefined): Site => ({ ...empty, ...raw });

let index: PlanIndex | null | undefined;
export async function planFile(fetcher: typeof fetch): Promise<PlanIndex | null> {
	if (index) return index;
	const response = await fetcher('/plan.json').catch(() => null);
	if (!response?.ok) return null;
	return (index = (await response.json()) as PlanIndex);
}

const shards = new Map<string, Promise<Shard | null>>();
export function shard(fetcher: typeof fetch, id: string): Promise<Shard | null> {
	let pending = shards.get(id);
	if (!pending) {
		pending = fetcher(`/plan/${encodeURIComponent(id)}.json`)
			.then((response) => (response.ok ? ((response.json()) as Promise<Shard>) : null))
			.catch(() => null);
		shards.set(id, pending);
	}
	return pending;
}

export type FieldDetail = {
	field: { fid: string; name: string; crop: string; kind: string; ha: number };
	soil: {
		depth: number; clay: number; sand: number; bd: number; soc: number; ph: number;
		clay_lo?: number; sand_lo?: number; bd_lo?: number;
		clay_hi?: number; sand_hi?: number; bd_hi?: number;
	} | null;
	rotation: { year: number; kind: string | null; label: string | null }[];
	weather?: {
		acquired: string; tmin: number; tmax: number; precip: number;
		gwetroot: number; precip_7d: number; precip_30d: number;
	};
};

const details = new Map<string, Promise<FieldDetail | null>>();
export function fieldDetail(fetcher: typeof fetch, id: string): Promise<FieldDetail | null> {
	let pending = details.get(id);
	if (!pending) {
		pending = fetcher(`/api/field/${encodeURIComponent(id)}`)
			.then((response) => (response.ok ? (response.json() as Promise<FieldDetail>) : null))
			.catch(() => null);
		details.set(id, pending);
	}
	return pending;
}

export const parameters = (plan: PlanIndex | null, scenario: string): Parameters =>
	plan?.scenarios?.[scenario]?.params ?? {};

export const names = (plan: PlanIndex | null): string[] =>
	plan ? Object.keys(plan.scenarios) : [];

export const METRICS: [key: string, label: string, unit: string][] = [
	['yield_mean', 'Yield', 'kg/ha'],
	['water_used', 'Water', 'mm'],
	['stress_days', 'Stress', 'd'],
	['soc_gain', 'SOC', 'kg/ha']
];

export async function recommend(field: Field, scenario: string): Promise<Result> {
	try {
		const response = await fetch('/api/plan', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				id: field.id,
				latitude: field.center[1],
				longitude: field.center[0],
				scenario
			})
		});
		if (!response.ok)
			return { site: site({ detail: `plan ${response.status}` }), columns: [], directions: [], rotations: [] };
		const body = (await response.json()) as {
			results?: Partial<Site>[];
			columns?: string[];
			directions?: number[];
			rotations?: string[][];
		};
		return {
			site: site(body.results?.[0]),
			columns: body.columns ?? [],
			directions: body.directions ?? [],
			rotations: body.rotations ?? []
		};
	} catch (error) {
		return {
			site: site({ detail: error instanceof Error ? error.message : 'network' }),
			columns: [],
			directions: [],
			rotations: []
		};
	}
}
