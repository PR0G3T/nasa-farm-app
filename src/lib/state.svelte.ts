import type { Field } from './data.js';

export const fields = $state<Field[]>([]);
export const sel = $state<{ field: Field | null }>({ field: null });
export const ui = $state({ settings: false, day: 180, nasa: false });
