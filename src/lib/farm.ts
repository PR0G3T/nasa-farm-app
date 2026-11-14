import type { Field } from './data.js';

export type Parameters = Record<string, number>;
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
	[key: string]: number | string[] | Trace | null | undefined;
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
	scenarios: Record<string, { params: Parameters; fields: Record<string, SiteResult> }>;
};

export const pick = (plan: PlanFile | null, id: string, scenario: string): SiteResult | null => {
	const site = plan?.scenarios?.[scenario]?.fields?.[id];
	return site ? { history: plan?.fields?.[id]?.history, ...site } : null;
};

export const parameters = (plan: PlanFile | null, scenario: string): Parameters =>
	plan?.scenarios?.[scenario]?.params ?? {};

export const names = (plan: PlanFile | null): string[] => (plan ? Object.keys(plan.scenarios) : []);

let cache: PlanFile | null | undefined;
export async function planFile(fetcher: typeof fetch): Promise<PlanFile | null> {
	if (cache) return cache;
	const response = await fetcher('/plan.json').catch(() => null);
	if (!response?.ok) return null;
	return (cache = (await response.json()) as PlanFile);
}

export const METRICS: [key: string, label: string, unit: string][] = [
	['yield_mean', 'Yield', 'kg/ha'],
	['water_used', 'Water', 'mm'],
	['stress_days', 'Stress', 'd'],
	['soc_gain', 'Δ SOC', 'kg/ha']
];

export async function recommend(field: Field, scenario: string): Promise<SiteResult> {
	try {
		const response = await fetch('/api/plan', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				id: field.id,
				lat: field.center[1],
				lon: field.center[0],
				scenario
			})
		});
		if (!response.ok) return { status: 'error', detail: `plan ${response.status}` };
		const body = (await response.json()) as { results?: SiteResult[] };
		return body.results?.[0] ?? { status: 'error', detail: 'empty result' };
	} catch (error) {
		return { status: 'error', detail: error instanceof Error ? error.message : 'network' };
	}
}
