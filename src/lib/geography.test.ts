import { describe, expect, it } from 'vitest';
import type { Field } from './data.js';
import { IMAGERY, PRODUCTS, bounds, gibs, mask, parcels, preview } from './geography.js';

const RING: [number, number][] = [
	[0, 0],
	[1, 0],
	[1, 1],
	[0, 1],
	[0, 0]
];

const FIELD: Field = {
	id: 'f1',
	name: 'F1',
	crop: 'Corn',
	ha: 10,
	center: [-93.62, 42.0],
	ring: RING
};

describe('preview', () => {
	const url = new URL(preview(FIELD));

	it('requests the Esri World Imagery export endpoint', () => {
		expect(`${url.origin}${url.pathname}`).toBe(
			'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export'
		);
		expect(url.searchParams.get('f')).toBe('image');
		expect(url.searchParams.get('format')).toBe('png32');
		expect(url.searchParams.get('size')).toBe('96,96');
	});

	it('uses WGS84 for both bbox and output', () => {
		expect(url.searchParams.get('bboxSR')).toBe('4326');
		expect(url.searchParams.get('imageSR')).toBe('4326');
	});

	it('centers a symmetric square bbox on the field', () => {
		const [west, south, east, north] = url.searchParams.get('bbox')!.split(',').map(Number);
		expect((west + east) / 2).toBeCloseTo(FIELD.center[0], 10);
		expect((south + north) / 2).toBeCloseTo(FIELD.center[1], 10);
		expect(east - west).toBeCloseTo(north - south, 10);
		expect(west).toBeLessThan(east);
		expect(south).toBeLessThan(north);
	});
});

describe('gibs', () => {
	it('builds a NASA GIBS tile template for a date', () => {
		expect(gibs(IMAGERY, '2026-06-15')).toBe(
			'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/2026-06-15/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpeg'
		);
	});

	it('maps each hazard to a dated satellite product', () => {
		expect(gibs(PRODUCTS.stress, '2023-07-05')).toContain('/MODIS_Terra_L3_NDVI_16Day/');
		expect(gibs(PRODUCTS.heat, '2023-07-05')).toContain('/MODIS_Aqua_Land_Surface_Temp_Day/');
		expect(gibs(PRODUCTS.frost, '2023-07-05')).toContain(
			'/MODIS_Aqua_Land_Surface_Temp_Night/'
		);
	});
});

describe('bounds', () => {
	it('contains every vertex tightly', () => {
		const [[west, south], [east, north]] = bounds(RING);
		for (const [x, y] of RING) {
			expect(x).toBeGreaterThanOrEqual(west);
			expect(x).toBeLessThanOrEqual(east);
			expect(y).toBeGreaterThanOrEqual(south);
			expect(y).toBeLessThanOrEqual(north);
		}
		expect([west, south, east, north]).toEqual([0, 0, 1, 1]);
	});
});

describe('mask', () => {
	const collection = mask(RING);
	const geometry = collection.features[0].geometry;

	it('emits a polygon with a world outer ring', () => {
		expect(geometry.type).toBe('Polygon');
		if (geometry.type !== 'Polygon') return;
		const outer = geometry.coordinates[0];
		expect(Math.min(...outer.map((point) => point[0]))).toBe(-180);
		expect(Math.max(...outer.map((point) => point[0]))).toBe(180);
		expect(outer[0]).toEqual(outer.at(-1));
	});

	it('cuts the hole with opposite winding', () => {
		if (geometry.type !== 'Polygon') return;
		const [outer, hole] = geometry.coordinates;
		const sign = (ring: number[][]) =>
			Math.sign(
				ring.reduce((sum, point, index) => {
					const next = ring[(index + 1) % ring.length];
					return sum + point[0] * next[1] - next[0] * point[1];
				}, 0)
			);
		expect(hole.length).toBeGreaterThan(2);
		expect(sign(hole)).toBe(-sign(outer));
	});

	it('keeps the hole inside the outer ring', () => {
		if (geometry.type !== 'Polygon') return;
		const [outer, hole] = geometry.coordinates;
		const [west, south, east, north] = [
			Math.min(...outer.map((point) => point[0])),
			Math.min(...outer.map((point) => point[1])),
			Math.max(...outer.map((point) => point[0])),
			Math.max(...outer.map((point) => point[1]))
		];
		for (const [x, y] of hole) {
			expect(x).toBeGreaterThan(west);
			expect(x).toBeLessThan(east);
			expect(y).toBeGreaterThan(south);
			expect(y).toBeLessThan(north);
		}
	});
});

describe('parcels', () => {
	const collection = parcels([FIELD]);

	it('emits one feature per field with matching id', () => {
		expect(collection.features).toHaveLength(1);
		expect(collection.features[0].id).toBe(FIELD.id);
		expect(collection.features[0].properties?.name).toBe(FIELD.name);
	});

	it('emits the field ring as a closed polygon', () => {
		const geometry = collection.features[0].geometry;
		expect(geometry.type).toBe('Polygon');
		if (geometry.type !== 'Polygon') return;
		expect(geometry.coordinates[0]).toEqual(RING);
	});
});
