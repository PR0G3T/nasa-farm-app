import type { Field } from './data.js';

export type Params = Record<string, number>;
export type Trace = {
	canopy: number[];
	water: number[];
	stress: number[];
	heat: number[];
	frost: number[];
};
export type Entry = {
	rotation: string[];
	rank?: number | null;
	score?: number;
	trace?: Trace;
	[k: string]: number | string[] | Trace | null | undefined;
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
export type SiteResult = {
	status: 'ok' | 'error';
	detail?: string;
	plans_evaluated?: number;
	scenarios?: number;
	history?: History;
	pareto?: Entry[];
	top?: Entry[];
};
export type PlanFile = {
	version: string;
	generated: string;
	request: Record<string, unknown>;
	fields: Record<string, { name?: string; crop?: string; ha?: number; history?: History }>;
	scenarios: Record<string, { params: Params; fields: Record<string, SiteResult> }>;
};

export const pick = (f: PlanFile | null, id: string, s: string): SiteResult | null => {
	const r = f?.scenarios?.[s]?.fields?.[id];
	return r ? { history: f?.fields?.[id]?.history, ...r } : null;
};

export const params = (f: PlanFile | null, s: string): Params =>
	f?.scenarios?.[s]?.params ?? {};

export const names = (f: PlanFile | null): string[] => (f ? Object.keys(f.scenarios) : []);

let cache: PlanFile | null | undefined;
export async function planFile(fetcher: typeof fetch): Promise<PlanFile | null> {
	if (cache) return cache;
	const res = await fetcher('/plan.json').catch(() => null);
	if (!res?.ok) return null;
	return (cache = (await res.json()) as PlanFile);
}

export const METRICS: [key: string, label: string, unit: string][] = [
	['yield_mean', 'Yield', 'kg/ha'],
	['water_used', 'Water', 'mm'],
	['stress_days', 'Stress', 'd'],
	['soc_gain', 'Δ SOC', 'kg/ha']
];

export async function rec(field: Field, scenario: string): Promise<SiteResult> {
	try {
		const res = await fetch('/api/plan', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				id: field.id,
				lat: field.center[1],
				lon: field.center[0],
				scenario
			})
		});
		if (!res.ok) return { status: 'error', detail: `plan ${res.status}` };
		const body = (await res.json()) as { results?: SiteResult[] };
		return body.results?.[0] ?? { status: 'error', detail: 'empty result' };
	} catch (e) {
		return { status: 'error', detail: e instanceof Error ? e.message : 'network' };
	}
}
