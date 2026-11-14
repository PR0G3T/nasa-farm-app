import type { FeatureCollection } from 'geojson';
import type { Field } from './data.js';
import type { Hazard } from './timeline.js';

export const ESRI_IMAGERY =
	'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
export const ESRI_REFERENCE =
	'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';
export const DEM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';

const GIBS_BASE = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';

export type Product = { id: string; label: string; matrix: string; format: string; zoom: number };

export const IMAGERY: Product = {
	id: 'MODIS_Terra_CorrectedReflectance_TrueColor',
	label: 'True color',
	matrix: 'GoogleMapsCompatible_Level9',
	format: 'jpeg',
	zoom: 9
};

export const PRODUCTS: Record<Hazard, Product> = {
	stress: {
		id: 'MODIS_Terra_L3_NDVI_16Day',
		label: 'NDVI',
		matrix: 'GoogleMapsCompatible_Level9',
		format: 'png',
		zoom: 9
	},
	heat: {
		id: 'MODIS_Aqua_Land_Surface_Temp_Day',
		label: 'LST day',
		matrix: 'GoogleMapsCompatible_Level7',
		format: 'png',
		zoom: 7
	},
	frost: {
		id: 'MODIS_Aqua_Land_Surface_Temp_Night',
		label: 'LST night',
		matrix: 'GoogleMapsCompatible_Level7',
		format: 'png',
		zoom: 7
	}
};

export function gibs(product: Product, date: string): string {
	return `${GIBS_BASE}/${product.id}/default/${date}/${product.matrix}/{z}/{y}/{x}.${product.format}`;
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
