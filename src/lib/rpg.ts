import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import type { Field } from './data.js';
import { shoelace } from './geo.js';

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
	const geom = { type: 'Polygon', coordinates: [REGION] };
	return `https://apicarto.ign.fr/api/rpg/v2?geom=${encodeURIComponent(
		JSON.stringify(geom)
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

const close = (r: [number, number][]) =>
	r[0][0] === r.at(-1)![0] && r[0][1] === r.at(-1)![1] ? r : [...r, r[0]];

const outer = (g: Polygon | MultiPolygon): [number, number][][] =>
	g.type === 'Polygon'
		? [close(g.coordinates[0] as [number, number][])]
		: g.coordinates.map((p) => close(p[0] as [number, number][]));

export function centroid(ring: [number, number][]): [number, number] {
	let a = 0;
	let x = 0;
	let y = 0;
	for (let i = 0; i < ring.length - 1; i++) {
		const [px, py] = ring[i];
		const [qx, qy] = ring[i + 1];
		const c = px * qy - qx * py;
		a += c;
		x += (px + qx) * c;
		y += (py + qy) * c;
	}
	return a ? [x / (3 * a), y / (3 * a)] : ring[0];
}

export function parse(fc: FeatureCollection): Field[] {
	return fc.features
		.filter(
			(f) =>
				(f.properties?.surf_parc ?? 0) > 0 &&
				(f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon')
		)
		.map((f): Field => {
			const ring = outer(f.geometry as Polygon | MultiPolygon).reduce((a, b) =>
				Math.abs(shoelace(a)) > Math.abs(shoelace(b)) ? a : b
			);
			const p = f.properties ?? {};
			return {
				id: String(p.id_parcel ?? f.id),
				name: `P${p.id_parcel ?? f.id}`,
				crop: CULTURES[p.code_cultu as string] ?? p.code_cultu ?? 'Autre',
				ha: p.surf_parc,
				center: centroid(ring),
				ring
			};
		})
		.toSorted((a, b) => b.ha - a.ha)
		.slice(0, MAX);
}
