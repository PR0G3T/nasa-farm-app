export type Field = {
	id: string;
	name: string;
	crop: string;
	ha: number;
	center: [number, number];
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

export const fields: Field[] = [
	{ id: 'north-40', name: 'North 40', crop: 'Corn', ha: 64.8, center: [-93.62, 41.59] },
	{ id: 'creek-bottom', name: 'Creek Bottom', crop: 'Soybean', ha: 38.2, center: [-91.21, 40.81] },
	{ id: 'prairie-west', name: 'Prairie West', crop: 'Wheat', ha: 121.5, center: [-98.44, 38.62] },
	{ id: 'ridge-field', name: 'Ridge Field', crop: 'Corn', ha: 52.9, center: [-95.86, 41.27] },
	{ id: 'south-pasture', name: 'South Pasture', crop: 'Alfalfa', ha: 27.4, center: [-97.31, 37.92] }
];

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
		level: 'watch',
		field: 'North 40'
	},
	{
		id: 'water-stress',
		label: 'Water stress',
		track: 'ops',
		start: 120,
		end: 141,
		level: 'alert',
		field: 'Prairie West'
	},
	{
		id: 'pest',
		label: 'Pest pressure',
		track: 'ops',
		start: 150,
		end: 162,
		level: 'watch',
		field: 'Ridge Field'
	},
	{
		id: 'hail',
		label: 'Hail damage',
		track: 'ops',
		start: 170,
		level: 'alert',
		field: 'Creek Bottom'
	},
	{
		id: 'frost',
		label: 'Frost risk',
		track: 'ops',
		start: 205,
		end: 214,
		level: 'low',
		field: 'South Pasture'
	}
];

export function find(list: Field[], q: string): Field[] {
	const s = q.trim().toLowerCase();
	return s ? list.filter((f) => f.name.toLowerCase().includes(s)) : list;
}
