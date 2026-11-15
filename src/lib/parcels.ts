import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import type { Field } from './data.js';
import { shoelace } from './geography.js';

/** `fields.geojson` — emitted by `nasa-farm fields` (USDA CSB). */
export type Properties = {
	id: string;
	name?: string;
	crop?: string;
	kind?: string;
	ha?: number;
	sequence?: string[];
};

const close = (ring: [number, number][]) =>
	ring[0][0] === ring.at(-1)![0] && ring[0][1] === ring.at(-1)![1] ? ring : [...ring, ring[0]];

const outer = (geometry: Polygon | MultiPolygon): [number, number][][] =>
	geometry.type === 'Polygon'
		? [close(geometry.coordinates[0] as [number, number][])]
		: geometry.coordinates.map((part) => close(part[0] as [number, number][]));

export function centroid(ring: [number, number][]): [number, number] {
	let area = 0;
	let x = 0;
	let y = 0;
	for (let index = 0; index < ring.length - 1; index++) {
		const [x0, y0] = ring[index];
		const [x1, y1] = ring[index + 1];
		const cross = x0 * y1 - x1 * y0;
		area += cross;
		x += (x0 + x1) * cross;
		y += (y0 + y1) * cross;
	}
	return area ? [x / (3 * area), y / (3 * area)] : ring[0];
}

export function ring(geometry: Polygon | MultiPolygon): [number, number][] {
	return outer(geometry).reduce((largest, other) =>
		Math.abs(shoelace(largest)) > Math.abs(shoelace(other)) ? largest : other
	);
}

export function parse(collection: FeatureCollection): Field[] {
	return collection.features
		.filter(
			(feature) =>
				(feature.properties?.ha ?? 0) > 0 &&
				(feature.geometry?.type === 'Polygon' || feature.geometry?.type === 'MultiPolygon')
		)
		.map((feature): Field => {
			const boundary = ring(feature.geometry as Polygon | MultiPolygon);
			const properties = (feature.properties ?? {}) as Properties;
			return {
				id: String(properties.id ?? feature.id),
				name: properties.name ?? String(properties.id ?? feature.id),
				crop: properties.crop ?? 'Other',
				kind: properties.kind,
				ha: properties.ha ?? 0,
				center: centroid(boundary),
				ring: boundary,
				sequence: properties.sequence
			};
		})
		.toSorted((first, second) => second.ha - first.ha);
}
