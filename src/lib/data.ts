export type Field = {
	id: string;
	name: string;
	crop: string;
	ha: number;
	center: [number, number];
	ring: [number, number][];
};

export function find(list: Field[], query: string): Field[] {
	const term = query.trim().toLowerCase();
	return term ? list.filter((field) => field.name.toLowerCase().includes(term)) : list;
}
