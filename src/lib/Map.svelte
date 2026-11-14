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
		GlobeControl,
		FullScreenControl,
		ScaleControl,
		AttributionControl,
		TerrainControl,
		CustomControl,
		Projection,
		Sky,
		Light,
		Hash
	} from 'svelte-maplibre-gl';
	import IconSatellite from '@tabler/icons-svelte-runes/icons/satellite';
	import type { Map as MaplibreMap, MapLayerMouseEvent, StyleSpecification } from 'maplibre-gl';
	import type { FeatureCollection } from 'geojson';
	import type { ExpressionSpecification } from '@maplibre/maplibre-gl-style-spec';
	import { DEM, ESRI_IMG, ESRI_REF, bounds, gibs, mask, parcels } from '#lib/geo.js';
	import { fields, sel, ui } from '#lib/state.svelte.js';
	import { dayISO } from '#lib/tl.js';
	import { untrack } from 'svelte';

	let map: MaplibreMap | undefined = $state.raw();

	const IDLE = 30_000;
	const RATE = 6;

	let raf = 0;
	let idle: ReturnType<typeof setTimeout>;
	let t0 = 0;
	let b0 = 0;
	let orbiting = false;

	function frame(now: number) {
		map?.jumpTo({ bearing: b0 + ((now - t0) / 1000) * RATE });
		raf = requestAnimationFrame(frame);
	}

	function startOrbit() {
		if (!map) return;
		orbiting = true;
		b0 = map.getBearing();
		const field = sel.field;
		map.easeTo({
			...(field && { center: field.center }),
			pitch: 55,
			duration: 1500
		});
		t0 = performance.now();
		raf = requestAnimationFrame(frame);
	}

	let resuming = false;

	function touch(now = false) {
		if (orbiting) {
			orbiting = false;
			cancelAnimationFrame(raf);
			map?.stop();
			if (now) map?.easeTo({ pitch: 0, duration: 900 });
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
			dem: {
				type: 'raster-dem',
				tiles: [DEM],
				tileSize: 256,
				encoding: 'terrarium',
				maxzoom: 15,
				attribution: 'AWS Open Data Terrain Tiles'
			}
		},
		terrain: { source: 'dem', exaggeration: 1.5 },
		layers: [
			{
				id: 'space',
				type: 'background',
				paint: { 'background-color': '#04070c' }
			}
		]
	};

	const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] };
	const fc = $derived(parcels(fields));
	const iso = $derived(dayISO(ui.day));
	const selId = $derived(sel.field?.id ?? '');
	const dim = $derived(sel.field ? mask(sel.field.ring) : null);
	const picked = (id: string): ExpressionSpecification => ['==', ['get', 'id'], id];

	function pick(e: MapLayerMouseEvent) {
		const id = e.features?.[0]?.properties?.id;
		const field = fields.find((f) => f.id === id);
		if (field) sel.field = field;
	}

	const cursor = (v: string) => () => {
		if (map) map.getCanvas().style.cursor = v;
	};

	$effect(() => {
		const field = sel.field;
		untrack(() => {
			if (field) map?.fitBounds(bounds(field.ring), { padding: 80, maxZoom: 15 });
		});
	});

	$effect(() => {
		untrack(touch);
		return () => {
			clearTimeout(idle);
			cancelAnimationFrame(raf);
		};
	});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="h-full w-full"
	onpointerdown={() => touch()}
	onpointermove={(e) => e.buttons === 1 && touch()}
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
		autoloadGlobalCss={false}
		class="h-full w-full"
	>
		<RasterTileSource
			tiles={[ESRI_IMG]}
			tileSize={256}
			attribution="Esri, Maxar, Earthstar Geographics"
		>
			<RasterLayer />
		</RasterTileSource>

		<RasterTileSource
			id="gibs"
			tiles={[gibs(iso)]}
			tileSize={256}
			maxzoom={9}
			attribution="NASA Global Imagery Browse Services"
		>
			<RasterLayer
				layout={{ visibility: ui.nasa ? 'visible' : 'none' }}
				paint={{ 'raster-opacity': 0.9 }}
			/>
		</RasterTileSource>

		<HillshadeLayer
			source="dem"
			paint={{ 'hillshade-exaggeration': 0.25, 'hillshade-shadow-color': '#0a0a0a' }}
		/>

		<GeoJSONSource data={dim ?? EMPTY}>
			<FillLayer
				paint={{ 'fill-color': '#000000', 'fill-opacity': dim ? 0.5 : 0 }}
			/>
		</GeoJSONSource>

		<GeoJSONSource data={fc} promoteId="id">
			<FillLayer
				onclick={pick}
				onmousemove={cursor('pointer')}
				onmouseleave={cursor('')}
				paint={{
					'fill-color': '#ffffff',
					'fill-opacity': ['case', picked(selId), 0.16, 0.07]
				}}
			/>
			<LineLayer
				paint={{
					'line-color': '#ffffff',
					'line-opacity': ['case', picked(selId), 1, 0.45],
					'line-width': ['case', picked(selId), 2.5, 1]
				}}
			/>
		</GeoJSONSource>

		<RasterTileSource tiles={[ESRI_REF]} tileSize={256}>
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
		<Projection type="globe" />
		<NavigationControl position="top-right" visualizePitch />
		<GlobeControl position="top-right" />
		<TerrainControl position="top-right" source="dem" />
		<CustomControl position="top-right" group>
			<button
				type="button"
				onclick={() => (ui.nasa = !ui.nasa)}
				aria-pressed={ui.nasa}
				title="NASA daily imagery (timeline date)"
				class="grid place-items-center {ui.nasa ? 'text-accent' : 'text-ink'}"
			>
				<IconSatellite size={18} stroke={1.75} />
			</button>
		</CustomControl>
		<FullScreenControl position="top-right" />
		<ScaleControl position="bottom-left" />
		<AttributionControl position="bottom-right" compact />
	</MapLibre>
</div>
