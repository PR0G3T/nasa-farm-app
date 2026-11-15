import { describe, expect, it } from 'vitest';
import type { FeatureCollection } from 'geojson';
import { centroid, parse } from './parcels.js';

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

describe('centroid', () => {
	it('returns the center of a square', () => {
		expect(centroid(square(0, 0, 2))).toEqual([1, 1]);
	});

	it('works regardless of ring direction', () => {
		expect(centroid([...square(0, 0, 2)].reverse())).toEqual([1, 1]);
	});
});

describe('parse', () => {
	it('maps CSB features to fields', () => {
		const [field] = parse(
			collection([
				feature(
					{ id: '191623001171608', name: 'Story 2', crop: 'Soybeans', kind: 'soybean', ha: 187.7 },
					square(-93.6, 42, 0.01)
				)
			])
		);
		expect(field.id).toBe('191623001171608');
		expect(field.name).toBe('Story 2');
		expect(field.crop).toBe('Soybeans');
		expect(field.kind).toBe('soybean');
		expect(field.ha).toBe(187.7);
		expect(field.ring[0]).toEqual([-93.6, 42]);
	});

	it('keeps the CDL rotation sequence when present', () => {
		const [field] = parse(
			collection([
				feature(
					{ id: '1', ha: 10, sequence: ['Corn', 'Soybeans', 'Corn'] },
					square(0, 0, 1)
				)
			])
		);
		expect(field.sequence).toEqual(['Corn', 'Soybeans', 'Corn']);
	});

	it('falls back to generic names for sparse properties', () => {
		const [field] = parse(
			collection([feature({ id: '7', ha: 1 }, square(0, 0, 1))])
		);
		expect(field.name).toBe('7');
		expect(field.crop).toBe('Other');
		expect(field.kind).toBeUndefined();
	});

	it('drops zero-area and geometry-less features', () => {
		expect(
			parse(
				collection([
					feature({ id: '1', ha: 0 }, square(0, 0, 1)),
					feature({ id: '2', ha: 3 }, square(0, 0, 1))
				])
			)
		).toHaveLength(1);
	});

	it('picks the largest polygon of a multipolygon', () => {
		const small = square(0, 0, 1);
		const big = square(10, 10, 4);
		const [field] = parse(
			collection([feature({ id: '9', ha: 5 }, [[small], [big]], true)])
		);
		expect(field.ring[1]).toEqual([14, 10]);
	});

	it('closes open rings', () => {
		const open = square(0, 0, 1).slice(0, -1);
		const [field] = parse(
			collection([feature({ id: '5', ha: 2 }, open)])
		);
		expect(field.ring[0]).toEqual(field.ring.at(-1));
	});

	it('sorts by surface', () => {
		const many = Array.from({ length: 5 }, (_, index) =>
			feature({ id: String(index), ha: index + 1 }, square(0, 0, 1))
		);
		const result = parse(collection(many));
		expect(result[0].ha).toBe(5);
		expect(result.at(-1)!.ha).toBe(1);
	});
});
