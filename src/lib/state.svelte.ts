import type { Field } from './data.js';
import { rec, type SiteResult } from './farm.js';

export const fields = $state<Field[]>([]);
export const sel = $state<{ field: Field | null; scenario: string }>({
	field: null,
	scenario: 'baseline'
});
export const recs = $state<Record<string, Record<string, SiteResult>>>({});
export const meta = $state<{ scenarios: string[]; live: boolean }>({
	scenarios: [],
	live: false
});
export const ui = $state({ settings: false, day: 180, nasa: false, cmp: false });
export const cur = () => (sel.field ? recs[sel.field.id]?.[sel.scenario] : undefined);
export const hOff = () => (cur()?.history?.years ?? 0) * 365;
export const y0 = () => cur()?.history?.y0 ?? new Date().getUTCFullYear();
export const scen = () => (meta.scenarios.length ? meta.scenarios : ['baseline']);

const fetching = new Set<string>();

/** Lazy-loads a field/scenario result into recs; dedupes in-flight calls. */
export function ensure(field: Field, scenario: string) {
	const key = `${field.id}|${scenario}`;
	if (recs[field.id]?.[scenario] || fetching.has(key)) return;
	fetching.add(key);
	return rec(field, scenario)
		.then((r) => {
			(recs[field.id] ??= {})[scenario] = r;
		})
		.finally(() => fetching.delete(key));
}
