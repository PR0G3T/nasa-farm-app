import { describe, expect, it } from 'vitest';
import type { Field } from './data.js';
import { bounds, gibs, mask, parcels, preview } from './geo.js';

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
	center: [1.6, 48.2],
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
		const [w, s, e, n] = url.searchParams.get('bbox')!.split(',').map(Number);
		expect((w + e) / 2).toBeCloseTo(FIELD.center[0], 10);
		expect((s + n) / 2).toBeCloseTo(FIELD.center[1], 10);
		expect(e - w).toBeCloseTo(n - s, 10);
		expect(w).toBeLessThan(e);
		expect(s).toBeLessThan(n);
	});
});

describe('gibs', () => {
	it('builds a NASA GIBS tile template for a date', () => {
		expect(gibs('2026-06-15')).toBe(
			'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/2026-06-15/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpeg'
		);
	});
});

describe('bounds', () => {
	it('contains every vertex tightly', () => {
		const [[w, s], [e, n]] = bounds(RING);
		for (const [x, y] of RING) {
			expect(x).toBeGreaterThanOrEqual(w);
			expect(x).toBeLessThanOrEqual(e);
			expect(y).toBeGreaterThanOrEqual(s);
			expect(y).toBeLessThanOrEqual(n);
		}
		expect([w, s, e, n]).toEqual([0, 0, 1, 1]);
	});
});

describe('mask', () => {
	const fc = mask(RING);
	const geom = fc.features[0].geometry;

	it('emits a polygon with a world outer ring', () => {
		expect(geom.type).toBe('Polygon');
		if (geom.type !== 'Polygon') return;
		const outer = geom.coordinates[0];
		expect(Math.min(...outer.map((p) => p[0]))).toBe(-180);
		expect(Math.max(...outer.map((p) => p[0]))).toBe(180);
		expect(outer[0]).toEqual(outer.at(-1));
	});

	it('cuts the hole with opposite winding', () => {
		if (geom.type !== 'Polygon') return;
		const [outer, hole] = geom.coordinates;
		const sign = (r: number[][]) =>
			Math.sign(
				r.reduce((s, p, i) => {
					const q = r[(i + 1) % r.length];
					return s + p[0] * q[1] - q[0] * p[1];
				}, 0)
			);
		expect(hole.length).toBeGreaterThan(2);
		expect(sign(hole)).toBe(-sign(outer));
	});

	it('keeps the hole inside the outer ring', () => {
		if (geom.type !== 'Polygon') return;
		const [outer, hole] = geom.coordinates;
		const [w, s, e, n] = [
			Math.min(...outer.map((p) => p[0])),
			Math.min(...outer.map((p) => p[1])),
			Math.max(...outer.map((p) => p[0])),
			Math.max(...outer.map((p) => p[1]))
		];
		for (const [x, y] of hole) {
			expect(x).toBeGreaterThan(w);
			expect(x).toBeLessThan(e);
			expect(y).toBeGreaterThan(s);
			expect(y).toBeLessThan(n);
		}
	});
});

describe('parcels', () => {
	const fc = parcels([FIELD]);

	it('emits one feature per field with matching id', () => {
		expect(fc.features).toHaveLength(1);
		expect(fc.features[0].id).toBe(FIELD.id);
		expect(fc.features[0].properties?.name).toBe(FIELD.name);
	});

	it('emits the field ring as a closed polygon', () => {
		const geom = fc.features[0].geometry;
		expect(geom.type).toBe('Polygon');
		if (geom.type !== 'Polygon') return;
		expect(geom.coordinates[0]).toEqual(RING);
	});
});
