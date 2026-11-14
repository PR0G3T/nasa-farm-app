export type Field = {
	id: string;
	name: string;
	crop: string;
	ha: number;
	center: [number, number];
	ring: [number, number][];
};

export function find(list: Field[], q: string): Field[] {
	const s = q.trim().toLowerCase();
	return s ? list.filter((f) => f.name.toLowerCase().includes(s)) : list;
}
