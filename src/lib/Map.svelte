<script lang="ts">
	import 'svelte-maplibre-gl/vite';
	import {
		MapLibre,
		RasterTileSource,
		RasterLayer,
		HillshadeLayer,
		GeoJSONSource,
		VectorTileSource,
		FillLayer,
		LineLayer,
		NavigationControl,
		ScaleControl,
		AttributionControl,
		Sky,
		Light,
		Hash
	} from 'svelte-maplibre-gl';
	import { addProtocol, type Map as MaplibreMap, type MapLayerMouseEvent, type MapMouseEvent, type StyleSpecification } from 'maplibre-gl';
	import { Protocol } from 'pmtiles';
	import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
	import type { ExpressionSpecification } from '@maplibre/maplibre-gl-style-spec';
	import { DEM, ESRI_IMAGERY, ESRI_REFERENCE, PRODUCTS, bounds, gibs, mask, parcels } from '#lib/geography.js';
	import { centroid, ring as boundary } from '#lib/parcels.js';
	import { current, fields, historyOffset, meta, overlay, planIndex, selection, view } from '#lib/state.svelte.js';
	import { layerOf, nearest } from '#lib/layers.js';
	import { active, isoAt } from '#lib/timeline.js';
	import type { Severity } from '#lib/timeline.js';
	import { untrack } from 'svelte';

	addProtocol('pmtiles', new Protocol().tile);

	/** USDA CSB — all 16.2 M US field boundaries, tiled once on Source Coop. */
	const CSB = 'pmtiles://https://data.source.coop/fiboa/us-usda-cropland/us_usda_cropland.pmtiles';
	const CSB_LAYER = 'us_usda_cropland';
	const CSB_COLORS: ExpressionSpecification = [
		'match', ['get', 'crop:name'],
		'Corn', '#ffd400',
		'Soybeans', '#267300',
		'Alfalfa', '#ffa8e3',
		'Winter Wheat', '#a87000',
		'#546a7b'
	];

	const HOME: [number, number] = [-93.62, 42.0];

	let map: MaplibreMap | undefined = $state.raw();

	const style: StyleSpecification = {
		version: 8,
		sources: {
			elevation: {
				type: 'raster-dem',
				tiles: [DEM],
				tileSize: 256,
				encoding: 'terrarium',
				maxzoom: 15,
				attribution: 'AWS Open Data Terrain Tiles'
			}
		},
		terrain: { source: 'elevation', exaggeration: 1.5 },
		layers: [
			{
				id: 'space',
				type: 'background',
				paint: { 'background-color': '#04070c' }
			}
		]
	};

	const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] };
	const SEVERITY: Record<Severity, { color: string; opacity: number }> = {
		alert: { color: '#fc4540', opacity: 0.95 },
		watch: { color: '#ecaa0b', opacity: 0.8 },
		mute: { color: '#808080', opacity: 0.65 }
	};
	const features = $derived(parcels(fields));
	const date = $derived(isoAt(view.day, historyOffset()));
	const selected = $derived(selection.field?.id ?? '');
	const shade = $derived(
		selection.field?.ring.length ? mask(selection.field.ring) : null
	);
	const trace = $derived(
		current()?.site.status === 'ok' ? current()?.site.traces[planIndex()] : undefined
	);
	const now = $derived(active(view.day, historyOffset(), trace, current()?.site.history));
	const product = $derived(now ? PRODUCTS[now.id] : null);
	const raster = $derived(layerOf(overlay.id));
	const tiles = $derived(`/tiles/${raster.id}/${overlay.date}/{z}/{x}/{y}.webp`);
	/** Coarse NASA products stay regional: gone by the time parcels are legible. */
	const fade = (opacity: number): ExpressionSpecification => [
		'interpolate',
		['linear'],
		['zoom'],
		9,
		opacity,
		11,
		0
	];
	const ring = $derived(
		selection.field?.ring.length
			? ({
					type: 'FeatureCollection',
					features: [
						{
							type: 'Feature',
							properties: {},
							geometry: { type: 'Polygon', coordinates: [selection.field.ring] }
						}
					]
				} as FeatureCollection)
			: EMPTY
	);
	const picked = (id: string): ExpressionSpecification => ['==', ['get', 'id'], id];

	function pick(event: MapLayerMouseEvent) {
		if (selection.field) return;
		const properties = event.features?.[0]?.properties;
		const id = String(properties?.id ?? '');
		const known = fields.find((candidate) => candidate.id === id);
		if (known) return (selection.field = known);
		if (meta.live && id) {
			const geometry = event.features?.[0]?.geometry;
			const edge =
				geometry?.type === 'Polygon' || geometry?.type === 'MultiPolygon'
					? boundary(geometry as Polygon | MultiPolygon)
					: [];
			selection.field = {
				id,
				name: `CSB ${id.slice(-4)}`,
				crop: properties?.['crop:name'] ?? 'Unknown',
				ha: 0,
				center: edge.length ? centroid(edge) : [event.lngLat.lng, event.lngLat.lat],
				ring: edge
			};
		}
	}

	/** Anything clicked that is not the selected parcel releases the focus. */
	function voided(event: MapMouseEvent) {
		const selected = selection.field?.id;
		if (selected == null || !map) return;
		const self = map
			.queryRenderedFeatures(event.point)
			.some((feature) => String(feature.properties?.id ?? '') === selected);
		if (!self) selection.field = null;
	}

	const cursor = (value: string) => () => {
		if (map) map.getCanvas().style.cursor = value;
	};

	$effect(() => {
		const field = selection.field;
		untrack(() => {
			if (field?.ring.length)
				map?.fitBounds(bounds(field.ring), { padding: 80, maxZoom: 15 });
			else if (!field)
				map?.easeTo({ center: HOME, zoom: 10.5, pitch: 0, duration: 900 });
		});
	});

	/** Timeline cursor drives the shown scene — snapped to acquired dates. */
	$effect(() => {
		const day = view.day;
		if (!selection.field || !raster.dates.length) return;
		untrack(() => {
			overlay.date = nearest(raster, isoAt(day, historyOffset()));
		});
	});

	/** Back to overview: newest scene, cursor home. */
	let was = false;
	$effect(() => {
		const selected = !!selection.field;
		untrack(() => {
			if (!selected && (was || !raster.dates.includes(overlay.date)))
				overlay.date = raster.dates.at(-1) ?? overlay.date;
			if (!selected && was) view.day = historyOffset();
			was = selected;
		});
	});
</script>

<div class="relative h-full w-full">
	<MapLibre
		bind:map
		{style}
		center={HOME}
		zoom={10.5}
		onclick={voided}
		attributionControl={false}
		autoloadGlobalCss={false}
		class="h-full w-full"
	>
		<RasterTileSource
			tiles={[ESRI_IMAGERY]}
			tileSize={256}
			attribution="Esri, Maxar, Earthstar Geographics"
		>
			<RasterLayer />
		</RasterTileSource>

		<VectorTileSource
			url={CSB}
			attribution="USDA NASS Crop Sequence Boundaries"
		>
			<FillLayer
				id="csb"
				sourceLayer={CSB_LAYER}
				onclick={pick}
				onmousemove={cursor('pointer')}
				onmouseleave={cursor('')}
				paint={{
					'fill-color': CSB_COLORS,
					'fill-opacity': 0.28
				}}
			/>
			<LineLayer sourceLayer={CSB_LAYER} paint={{ 'line-color': '#ffffff', 'line-opacity': 0.15, 'line-width': 0.5 }} />
		</VectorTileSource>

		{#if overlay.visible && overlay.date}
			{#key raster.id}
				<RasterTileSource
					id="overlay"
					tiles={[tiles]}
					tileSize={256}
					maxzoom={raster.maxzoom}
					attribution={raster.source}
				>
					<RasterLayer
						beforeId="csb"
						paint={{ 'raster-opacity': 1, 'raster-resampling': 'linear' }}
					/>
				</RasterTileSource>
			{/key}
		{/if}

		<HillshadeLayer
			source="elevation"
			paint={{ 'hillshade-exaggeration': 0.25, 'hillshade-shadow-color': '#0a0a0a' }}
		/>

		{#if product && now}
			{#key product.id}
				<RasterTileSource
					id="stress"
					tiles={[gibs(product, date)]}
					tileSize={256}
					maxzoom={product.zoom}
					attribution="NASA Global Imagery Browse Services"
				>
					<RasterLayer paint={{ 'raster-opacity': fade(SEVERITY[now.severity].opacity) }} />
				</RasterTileSource>
			{/key}
		{/if}

		<GeoJSONSource data={shade ?? EMPTY}>
			<FillLayer
				paint={{ 'fill-color': '#000000', 'fill-opacity': shade ? 0.88 : 0 }}
			/>
		</GeoJSONSource>

		<GeoJSONSource data={features} promoteId="id">
			<FillLayer
				onclick={pick}
				onmousemove={cursor('pointer')}
				onmouseleave={cursor('')}
				paint={{ 'fill-opacity': 0 }}
			/>
			<LineLayer
				paint={{
					'line-color': '#ffffff',
					'line-opacity': ['case', picked(selected), 1, 0.45],
					'line-width': ['case', picked(selected), 2.5, 1]
				}}
			/>
		</GeoJSONSource>

		{#if now}
			<GeoJSONSource data={ring}>
				<LineLayer
					paint={{
						'line-color': SEVERITY[now.severity].color,
						'line-width': 3,
						'line-blur': 0.5
					}}
				/>
			</GeoJSONSource>
		{/if}

		<RasterTileSource tiles={[ESRI_REFERENCE]} tileSize={256}>
			<RasterLayer />
		</RasterTileSource>

		<Sky
			sky-color="#199EF3"
			sky-horizon-blend={0.8}
			horizon-color="#ffffff"
			horizon-fog-blend={0.5}
			fog-color="#0b1030"
			fog-ground-blend={0.5}
			atmosphere-blend={[
				'interpolate',
				['linear'],
				['zoom'],
				0,
				1,
				10,
				1,
				12,
				0
			]}
		/>
		<Light anchor="viewport" position={[1.15, 210, 30]} />

		<Hash />
		<NavigationControl position="top-right" visualizePitch />
		<ScaleControl position="bottom-left" />
		<AttributionControl position="bottom-right" compact />
	</MapLibre>

	{#if now && product}
		<div
			class="pointer-events-none absolute bottom-10 left-2 z-10 rounded-md border border-edge bg-panel px-2 py-1"
		>
			<p class="text-[0.625rem] font-medium whitespace-nowrap capitalize text-ink">
				{now.id} · {now.severity} · {now.origin}
			</p>
			<p class="text-[0.625rem] whitespace-nowrap text-mute">{product.label} · {date}</p>
		</div>
	{/if}
</div>
