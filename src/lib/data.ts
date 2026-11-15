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
};

export function find(list: Field[], query: string): Field[] {
	const term = query.trim().toLowerCase();
	return term ? list.filter((field) => field.name.toLowerCase().includes(term)) : list;
}
