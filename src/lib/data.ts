export type Field = {
	id: string;
	name: string;
	crop: string;
	/** Model crop the field currently grows, when the CDL class maps to one. */
	kind?: string;
	ha: number;
	center: [number, number];
	ring: [number, number][];
	/** Real rotation the field ran (CDL class labels, oldest first). */
	sequence?: string[];
	/** `sequence` mapped to model crops; null where the CDL class has none. */
	kinds?: (string | null)[];
};

export function find(list: Field[], query: string): Field[] {
	const term = query.trim().toLowerCase();
	return term ? list.filter((field) => field.name.toLowerCase().includes(term)) : list;
}

/**
 * Rotation the field currently runs: the observed `kinds` cycle replayed
 * `years` ahead, detected as the smallest repeating period at the tail.
 * Falls back to replaying the whole history when no period repeats.
 */
export function practice(field: Field, years: number): string[] | undefined {
	const kinds = field.kinds?.filter((kind): kind is string => Boolean(kind));
	if (!kinds?.length) return undefined;
	let period = kinds.length;
	for (let p = 1; p <= kinds.length / 2; p++)
		if (
			Array.from(
				{ length: Math.min(kinds.length - p, 2 * p) },
				(_, i) => kinds[kinds.length - 1 - i] === kinds[kinds.length - 1 - i - p]
			).every(Boolean)
		) {
			period = p;
			break;
		}
	return Array.from(
		{ length: years },
		(_, i) => kinds[kinds.length - period + (i % period)]
	);
}

export const same = (first: string[], second: string[]): boolean =>
	first.length === second.length && first.every((crop, i) => crop === second[i]);
