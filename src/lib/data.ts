export type Field = {
	id: string;
	name: string;
	crop: string;
	ha: number;
	center: [number, number];
	ring: [number, number][];
};

export type Level = 'low' | 'watch' | 'alert';

export type Event = {
	id: string;
	label: string;
	track: 'imagery' | 'ops';
	start: number;
	end?: number;
	level?: Level;
	field?: string;
};

export const events: Event[] = [
	...Array.from({ length: 17 }, (_, i) => ({
		id: `s2-${i}`,
		label: 'S2',
		track: 'imagery' as const,
		start: 12 + i * 14
	})),
	{
		id: 'ndvi-drop',
		label: 'NDVI drop',
		track: 'ops',
		start: 88,
		end: 104,
		level: 'watch'
	},
	{
		id: 'water-stress',
		label: 'Water stress',
		track: 'ops',
		start: 120,
		end: 141,
		level: 'alert'
	},
	{
		id: 'pest',
		label: 'Pest pressure',
		track: 'ops',
		start: 150,
		end: 162,
		level: 'watch'
	},
	{
		id: 'hail',
		label: 'Hail damage',
		track: 'ops',
		start: 170,
		level: 'alert'
	},
	{
		id: 'frost',
		label: 'Frost risk',
		track: 'ops',
		start: 205,
		end: 214,
		level: 'low'
	}
];

export function find(list: Field[], q: string): Field[] {
	const s = q.trim().toLowerCase();
	return s ? list.filter((f) => f.name.toLowerCase().includes(s)) : list;
}
