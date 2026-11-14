import { describe, expect, it } from 'vitest';
import { fields } from './data.js';
import { preview } from './geo.js';

describe('preview', () => {
	const url = new URL(preview(fields[0]));

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
		const [lng, lat] = fields[0].center;
		expect((w + e) / 2).toBeCloseTo(lng, 10);
		expect((s + n) / 2).toBeCloseTo(lat, 10);
		expect(e - w).toBeCloseTo(n - s, 10);
		expect(w).toBeLessThan(e);
		expect(s).toBeLessThan(n);
	});
});
