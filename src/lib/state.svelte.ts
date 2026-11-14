import type { Field } from './data.js';
import { recommend, type SiteResult } from './farm.js';

export const fields = $state<Field[]>([]);
export const selection = $state<{ field: Field | null; scenario: string }>({
	field: null,
	scenario: 'baseline'
});
export const results = $state<Record<string, Record<string, SiteResult>>>({});
export const meta = $state<{ scenarios: string[]; live: boolean }>({
	scenarios: [],
	live: false
});
export const view = $state({ settings: false, day: 180, nasa: false, compare: false });
export const current = () => (selection.field ? results[selection.field.id]?.[selection.scenario] : undefined);
export const historyOffset = () => (current()?.history?.years ?? 0) * 365;
export const startYear = () => current()?.history?.y0 ?? new Date().getUTCFullYear();
export const scenarios = () => (meta.scenarios.length ? meta.scenarios : ['baseline']);

const fetching = new Set<string>();

/** Lazy-loads a field/scenario result into results; dedupes in-flight calls. */
export function ensure(field: Field, scenario: string) {
	const key = `${field.id}|${scenario}`;
	if (results[field.id]?.[scenario] || fetching.has(key)) return;
	fetching.add(key);
	return recommend(field, scenario)
		.then((result) => {
			(results[field.id] ??= {})[scenario] = result;
		})
		.finally(() => fetching.delete(key));
}
