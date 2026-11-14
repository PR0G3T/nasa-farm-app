<script lang="ts">
	import 'svelte-maplibre-gl/vite';
	import {
		MapLibre,
		RasterTileSource,
		RasterLayer,
		NavigationControl,
		GlobeControl,
		FullScreenControl,
		ScaleControl,
		AttributionControl,
		Projection,
		Hash
	} from 'svelte-maplibre-gl';
	import type { Map as MaplibreMap, StyleSpecification } from 'maplibre-gl';
	import { sel } from '#lib/state.svelte.js';

	let map: MaplibreMap | undefined = $state();

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

	function touch() {
		if (orbiting) {
			orbiting = false;
			cancelAnimationFrame(raf);
			map?.easeTo({ pitch: 0, duration: 900 });
		}
		clearTimeout(idle);
		idle = setTimeout(startOrbit, IDLE);
	}

	const style: StyleSpecification = {
		version: 8,
		sources: {},
		layers: [
			{
				id: 'space',
				type: 'background',
				paint: { 'background-color': '#04070c' }
			}
		]
	};

	$effect(() => {
		const field = sel.field;
		if (map && field) map.flyTo({ center: field.center, zoom: 12 });
	});

	$effect(() => {
		touch();
		return () => {
			clearTimeout(idle);
			cancelAnimationFrame(raf);
		};
	});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="h-full w-full"
	onpointerdown={touch}
	onpointermove={(e) => e.buttons === 1 && touch()}
	onwheel={touch}
	ontouchstart={touch}
>
	<MapLibre
	bind:map
	{style}
	center={[-95, 38]}
	zoom={3}
	autoloadGlobalCss={false}
	class="h-full w-full"
>
	<RasterTileSource
		tiles={[
			'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
		]}
		tileSize={256}
		attribution="Esri, Maxar, Earthstar Geographics"
	>
		<RasterLayer />
	</RasterTileSource>
	<RasterTileSource
		tiles={[
			'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'
		]}
		tileSize={256}
	>
		<RasterLayer />
	</RasterTileSource>

	<Hash />
	<Projection type="globe" />
	<NavigationControl position="top-right" visualizePitch />
	<GlobeControl position="top-right" />
	<FullScreenControl position="top-right" />
	<ScaleControl position="bottom-left" />
	<AttributionControl position="bottom-right" compact />
	</MapLibre>
</div>
