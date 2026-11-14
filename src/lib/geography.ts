import type { FeatureCollection } from 'geojson';
import type { Field } from './data.js';

export const ESRI_IMAGERY =
	'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
export const ESRI_REFERENCE =
	'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';
export const DEM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';

const GIBS_BASE =
	'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default';

export function gibs(date: string): string {
	return `${GIBS_BASE}/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpeg`;
}

const SPAN = 0.015;

export function preview({ center: [longitude, latitude] }: Field): string {
	const extent = [longitude - SPAN, latitude - SPAN, longitude + SPAN, latitude + SPAN].join(',');
	return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${extent}&bboxSR=4326&imageSR=4326&size=96,96&format=png32&f=image`;
}

export const shoelace = (points: [number, number][]) =>
	points.reduce((sum, point, index) => {
		const next = points[(index + 1) % points.length];
		return sum + point[0] * next[1] - next[0] * point[1];
	}, 0) / 2;

export function bounds(ring: [number, number][]): [[number, number], [number, number]] {
	let west = Infinity,
		south = Infinity,
		east = -Infinity,
		north = -Infinity;
	for (const [x, y] of ring) {
		west = Math.min(west, x);
		south = Math.min(south, y);
		east = Math.max(east, x);
		north = Math.max(north, y);
	}
	return [
		[west, south],
		[east, north]
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
		features: list.map((field) => ({
			type: 'Feature',
			id: field.id,
			properties: { id: field.id, name: field.name, crop: field.crop, ha: field.ha },
			geometry: { type: 'Polygon', coordinates: [field.ring] }
		}))
	};
}
