import type { FeatureCollection } from 'geojson';
import type { Field } from './data.js';

export const ESRI_IMG =
	'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
export const ESRI_REF =
	'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';
export const DEM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';

const GIBS_BASE =
	'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default';

export function gibs(date: string): string {
	return `${GIBS_BASE}/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpeg`;
}

const SPAN = 0.015;

export function preview({ center: [lng, lat] }: Field): string {
	const bbox = [lng - SPAN, lat - SPAN, lng + SPAN, lat + SPAN].join(',');
	return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${bbox}&bboxSR=4326&imageSR=4326&size=96,96&format=png32&f=image`;
}

export const shoelace = (pts: [number, number][]) =>
	pts.reduce((s, p, i) => {
		const q = pts[(i + 1) % pts.length];
		return s + p[0] * q[1] - q[0] * p[1];
	}, 0) / 2;

export function bounds(ring: [number, number][]): [[number, number], [number, number]] {
	let w = Infinity,
		s = Infinity,
		e = -Infinity,
		n = -Infinity;
	for (const [x, y] of ring) {
		w = Math.min(w, x);
		s = Math.min(s, y);
		e = Math.max(e, x);
		n = Math.max(n, y);
	}
	return [
		[w, s],
		[e, n]
	];
}

const WORLD: [number, number][] = [
	[-180, -85],
	[180, -85],
	[180, 85],
	[-180, 85],
	[-180, -85]
];

export function mask(hole: [number, number][]): FeatureCollection {
	return {
		type: 'FeatureCollection',
		features: [
			{
				type: 'Feature',
				properties: {},
				geometry: {
					type: 'Polygon',
					coordinates: [WORLD, shoelace(hole) > 0 ? [...hole].reverse() : hole]
				}
			}
		]
	};
}

export function parcels(list: Field[]): FeatureCollection {
	return {
		type: 'FeatureCollection',
		features: list.map((f) => ({
			type: 'Feature',
			id: f.id,
			properties: { id: f.id, name: f.name, crop: f.crop, ha: f.ha },
			geometry: { type: 'Polygon', coordinates: [f.ring] }
		}))
	};
}
