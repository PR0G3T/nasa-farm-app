import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import type { Field } from './data.js';
import { shoelace } from './geography.js';

const YEAR = 2024;
const MAX = 40;

const REGION: [number, number][] = [
	[1.56, 48.17],
	[1.66, 48.17],
	[1.66, 48.23],
	[1.56, 48.23],
	[1.56, 48.17]
];

export function url(): string {
	const geometry = { type: 'Polygon', coordinates: [REGION] };
	return `https://apicarto.ign.fr/api/rpg/v2?geom=${encodeURIComponent(
		JSON.stringify(geometry)
	)}&annee=${YEAR}`;
}

const CULTURES: Record<string, string> = {
	BDH: 'Blé dur',
	BTH: 'Blé tendre',
	BDP: 'Blé dur printemps',
	ORH: "Orge d'hiver",
	ORP: 'Orge de printemps',
	CZH: "Colza d'hiver",
	MIS: 'Maïs ensilage',
	MAI: 'Maïs',
	BTN: 'Betterave',
	TTH: 'Tournesol',
	FPH: 'Féverole',
	PPH: 'Pois',
	LUZ: 'Luzerne',
	JAC: 'Jachère',
	POT: 'Pomme de terre',
	PTC: 'Pomme de terre'
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

export function parse(collection: FeatureCollection): Field[] {
	return collection.features
		.filter(
			(feature) =>
				(feature.properties?.surf_parc ?? 0) > 0 &&
				(feature.geometry?.type === 'Polygon' || feature.geometry?.type === 'MultiPolygon')
		)
		.map((feature): Field => {
			const ring = outer(feature.geometry as Polygon | MultiPolygon).reduce((largest, other) =>
				Math.abs(shoelace(largest)) > Math.abs(shoelace(other)) ? largest : other
			);
			const properties = feature.properties ?? {};
			return {
				id: String(properties.id_parcel ?? feature.id),
				name: `P${properties.id_parcel ?? feature.id}`,
				crop: CULTURES[properties.code_cultu as string] ?? properties.code_cultu ?? 'Autre',
				ha: properties.surf_parc,
				center: centroid(ring),
				ring
			};
		})
		.toSorted((first, second) => second.ha - first.ha)
		.slice(0, MAX);
}
