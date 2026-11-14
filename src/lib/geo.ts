import type { Field } from './data.js';

const SPAN = 0.015;

export function preview({ center: [lng, lat] }: Field): string {
	const bbox = [lng - SPAN, lat - SPAN, lng + SPAN, lat + SPAN].join(',');
	return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${bbox}&bboxSR=4326&imageSR=4326&size=96,96&format=png32&f=image`;
}
