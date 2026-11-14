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
</script>

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
