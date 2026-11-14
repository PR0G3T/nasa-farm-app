import type { Field } from './data.js';
import type { SiteResult } from './farm.js';

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
export const ui = $state({ settings: false, day: 180, nasa: false });
export const cur = () => (sel.field ? recs[sel.field.id]?.[sel.scenario] : undefined);
export const hOff = () => (cur()?.history?.years ?? 0) * 365;
export const y0 = () => cur()?.history?.y0 ?? new Date().getUTCFullYear();
