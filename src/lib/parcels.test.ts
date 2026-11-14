import { describe, expect, it } from 'vitest';
import type { FeatureCollection } from 'geojson';
import { centroid, parse, url } from './parcels.js';

const square = (x: number, y: number, side: number): [number, number][] => [
	[x, y],
	[x + side, y],
	[x + side, y + side],
	[x, y + side],
	[x, y]
];

const feature = (
	properties: Record<string, unknown>,
	coordinates: [number, number][] | [number, number][][][],
	multipart = false
) => ({
	type: 'Feature' as const,
	properties,
	geometry: multipart
		? { type: 'MultiPolygon' as const, coordinates: coordinates as [number, number][][][] }
		: { type: 'Polygon' as const, coordinates: [coordinates as [number, number][]] }
});

const collection = (features: ReturnType<typeof feature>[]): FeatureCollection => ({
	type: 'FeatureCollection',
	features
});

describe('url', () => {
	it('targets ApiCarto RPG v2 with the configured year', () => {
		expect(url()).toContain('https://apicarto.ign.fr/api/rpg/v2');
		expect(url()).toContain('annee=2024');
		expect(decodeURIComponent(url())).toContain('"type":"Polygon"');
	});
});

describe('centroid', () => {
	it('returns the center of a square', () => {
		expect(centroid(square(0, 0, 2))).toEqual([1, 1]);
	});

	it('works regardless of ring direction', () => {
		expect(centroid([...square(0, 0, 2)].reverse())).toEqual([1, 1]);
	});
});

describe('parse', () => {
	it('maps RPG features to fields', () => {
		const [field] = parse(
			collection([feature({ id_parcel: '42', surf_parc: 12.5, code_cultu: 'BTH' }, square(1, 48, 0.01))])
		);
		expect(field.id).toBe('42');
		expect(field.name).toBe('P42');
		expect(field.crop).toBe('Blé tendre');
		expect(field.ha).toBe(12.5);
		expect(field.ring[0]).toEqual([1, 48]);
	});

	it('falls back to the raw code for unknown cultures', () => {
		const [field] = parse(
			collection([feature({ id_parcel: '7', surf_parc: 1, code_cultu: 'ZZZ' }, square(0, 0, 1))])
		);
		expect(field.crop).toBe('ZZZ');
	});

	it('drops zero-surface and geometry-less features', () => {
		expect(
			parse(
				collection([
					feature({ id_parcel: '1', surf_parc: 0, code_cultu: 'BTH' }, square(0, 0, 1)),
					feature({ id_parcel: '2', surf_parc: 3, code_cultu: 'BTH' }, square(0, 0, 1))
				])
			)
		).toHaveLength(1);
	});

	it('picks the largest polygon of a multipolygon', () => {
		const small = square(0, 0, 1);
		const big = square(10, 10, 4);
		const [field] = parse(
			collection([
				feature({ id_parcel: '9', surf_parc: 5, code_cultu: 'MIS' }, [[small], [big]], true)
			])
		);
		expect(field.ring[1]).toEqual([14, 10]);
	});

	it('closes open rings', () => {
		const open = square(0, 0, 1).slice(0, -1);
		const [field] = parse(
			collection([feature({ id_parcel: '5', surf_parc: 2, code_cultu: 'BTH' }, open)])
		);
		expect(field.ring[0]).toEqual(field.ring.at(-1));
	});

	it('sorts by surface and caps the list', () => {
		const many = Array.from({ length: 60 }, (_, index) =>
			feature({ id_parcel: String(index), surf_parc: index, code_cultu: 'BTH' }, square(0, 0, 1))
		);
		const result = parse(collection(many));
		expect(result).toHaveLength(40);
		expect(result[0].ha).toBe(59);
		expect(result.at(-1)!.ha).toBe(20);
	});
});
