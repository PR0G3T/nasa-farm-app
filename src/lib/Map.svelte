<script lang="ts">
	import 'svelte-maplibre-gl/vite';
	import {
		MapLibre,
		RasterTileSource,
		RasterLayer,
		HillshadeLayer,
		GeoJSONSource,
		FillLayer,
		LineLayer,
		NavigationControl,
		ScaleControl,
		AttributionControl,
		CustomControl,
		Sky,
		Light,
		Hash
	} from 'svelte-maplibre-gl';
	import IconSatellite from '@tabler/icons-svelte-runes/icons/satellite';
	import type { Map as MaplibreMap, MapLayerMouseEvent, StyleSpecification } from 'maplibre-gl';
	import type { FeatureCollection } from 'geojson';
	import type { ExpressionSpecification } from '@maplibre/maplibre-gl-style-spec';
	import { DEM, ESRI_IMAGERY, ESRI_REFERENCE, bounds, gibs, mask, parcels } from '#lib/geography.js';
	import { fields, historyOffset, selection, view, startYear } from '#lib/state.svelte.js';
	import { dayISO } from '#lib/timeline.js';
	import { untrack } from 'svelte';

	let map: MaplibreMap | undefined = $state.raw();

	const IDLE = 30_000;
	const RATE = 6;

	let animation = 0;
	let idle: ReturnType<typeof setTimeout>;
	let started = 0;
	let bearing = 0;
	let orbiting = false;

	function frame(now: number) {
		map?.jumpTo({ bearing: bearing + ((now - started) / 1000) * RATE });
		animation = requestAnimationFrame(frame);
	}

	function startOrbit() {
		if (!map) return;
		orbiting = true;
		bearing = map.getBearing();
		const field = selection.field;
		map.easeTo({
			...(field && { center: field.center }),
			pitch: 55,
			duration: 1500
		});
		started = performance.now();
		animation = requestAnimationFrame(frame);
	}

	let resuming = false;

	function touch(immediate = false) {
		if (orbiting) {
			orbiting = false;
			cancelAnimationFrame(animation);
			map?.stop();
			if (immediate) map?.easeTo({ pitch: 0, duration: 900 });
			else resuming = true;
		}
		clearTimeout(idle);
		idle = setTimeout(startOrbit, IDLE);
	}

	function release() {
		if (resuming) {
			resuming = false;
			map?.easeTo({ pitch: 0, duration: 900 });
		}
	}

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
	const features = $derived(parcels(fields));
	const date = $derived(dayISO(view.day, historyOffset(), startYear()));
	const selected = $derived(selection.field?.id ?? '');
	const shade = $derived(selection.field ? mask(selection.field.ring) : null);
	const picked = (id: string): ExpressionSpecification => ['==', ['get', 'id'], id];

	function pick(event: MapLayerMouseEvent) {
		const id = event.features?.[0]?.properties?.id;
		const field = fields.find((candidate) => candidate.id === id);
		if (field) selection.field = field;
	}

	const cursor = (value: string) => () => {
		if (map) map.getCanvas().style.cursor = value;
	};

	$effect(() => {
		const field = selection.field;
		untrack(() => {
			if (field) map?.fitBounds(bounds(field.ring), { padding: 80, maxZoom: 15 });
		});
	});

	$effect(() => {
		untrack(touch);
		return () => {
			clearTimeout(idle);
			cancelAnimationFrame(animation);
		};
	});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="h-full w-full"
	onpointerdown={() => touch()}
	onpointermove={(event) => event.buttons === 1 && touch()}
	onpointerup={release}
	onpointercancel={release}
	onwheel={() => touch(true)}
	ontouchstart={() => touch()}
>
	<MapLibre
		bind:map
		{style}
		center={[1.61, 48.2]}
		zoom={10.5}
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

		<RasterTileSource
			id="gibs"
			tiles={[gibs(date)]}
			tileSize={256}
			maxzoom={9}
			attribution="NASA Global Imagery Browse Services"
		>
			<RasterLayer
				layout={{ visibility: view.nasa ? 'visible' : 'none' }}
				paint={{ 'raster-opacity': 0.9 }}
			/>
		</RasterTileSource>

		<HillshadeLayer
			source="elevation"
			paint={{ 'hillshade-exaggeration': 0.25, 'hillshade-shadow-color': '#0a0a0a' }}
		/>

		<GeoJSONSource data={shade ?? EMPTY}>
			<FillLayer
				paint={{ 'fill-color': '#000000', 'fill-opacity': shade ? 0.5 : 0 }}
			/>
		</GeoJSONSource>

		<GeoJSONSource data={features} promoteId="id">
			<FillLayer
				onclick={pick}
				onmousemove={cursor('pointer')}
				onmouseleave={cursor('')}
				paint={{
					'fill-color': '#ffffff',
					'fill-opacity': ['case', picked(selected), 0.16, 0.07]
				}}
			/>
			<LineLayer
				paint={{
					'line-color': '#ffffff',
					'line-opacity': ['case', picked(selected), 1, 0.45],
					'line-width': ['case', picked(selected), 2.5, 1]
				}}
			/>
		</GeoJSONSource>

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
		<CustomControl position="top-right" group>
			<button
				type="button"
				onclick={() => (view.nasa = !view.nasa)}
				aria-pressed={view.nasa}
				title="NASA daily imagery (timeline date)"
				class="grid place-items-center {view.nasa ? 'text-accent' : 'text-ink'}"
			>
				<IconSatellite size={18} stroke={1.75} />
			</button>
		</CustomControl>
		<ScaleControl position="bottom-left" />
		<AttributionControl position="bottom-right" compact />
	</MapLibre>
</div>
