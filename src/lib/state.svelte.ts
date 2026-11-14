import type { Field } from './data.js';
import { recommend, type Result } from './farm.js';
import { DEFAULT_PRIORITY, PRIORITIES, ranked, weightsFor, type Priorities } from './rank.js';

export const fields = $state<Field[]>([]);
export const selection = $state<{ field: Field | null; scenario: string; plan: number | null }>({
	field: null,
	scenario: 'baseline',
	plan: null
});
export const results = $state<Record<string, Record<string, Result>>>({});
export const meta = $state<{ scenarios: string[]; live: boolean }>({
	scenarios: [],
	live: false
});
export const priority = $state<Priorities>(
	Object.fromEntries(PRIORITIES.map((p) => [p.key, DEFAULT_PRIORITY])) as Priorities
);
export const view = $state({ settings: false, day: 180, nasa: false, compare: false });

export const current = () =>
	selection.field ? results[selection.field.id]?.[selection.scenario] : undefined;
export const site = () => current()?.site;
export const historyOffset = () => (site()?.history?.years ?? 0) * 365;
export const startYear = () => site()?.history?.y0 ?? new Date().getUTCFullYear();
export const scenarios = () => (meta.scenarios.length ? meta.scenarios : ['baseline']);

/** Client re-ranking — exact scalarize parity, no server round-trip. */
export const ranking = () => {
	const result = current();
	if (!result || result.site.status !== 'ok') return [];
	return ranked(result.site.objectives, result.directions, weightsFor(result.columns, priority));
};

/** Selected plan row — falls back to the top-ranked rotation. */
export const planIndex = () => {
	const result = current();
	if (!result || result.site.status !== 'ok') return 0;
	const chosen = selection.plan;
	return chosen !== null && chosen < result.site.objectives.length
		? chosen
		: (ranking()[0] ?? 0);
};

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
