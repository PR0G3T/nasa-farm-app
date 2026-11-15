<script lang="ts">
	import Map from '#lib/Map.svelte';
	import Layers from '#lib/Layers.svelte';
	import Plan from '#lib/Plan.svelte';
	import Settings from '#lib/Settings.svelte';
	import Sidebar from '#lib/Sidebar.svelte';
	import Timeline from '#lib/Timeline.svelte';
	import { fields, meta, selection, stats } from '#lib/state.svelte.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	$effect(() => {
		const { scenarios, live, fields: list, stats: catalog } = data;
		if (!Object.keys(stats).length) Object.assign(stats, catalog);
		if (meta.live !== live) meta.live = live;
		if (
			meta.scenarios.length !== scenarios.length ||
			meta.scenarios.some((name, index) => name !== scenarios[index])
		)
			meta.scenarios = scenarios;
		if (scenarios.length && !scenarios.includes(selection.scenario)) selection.scenario = scenarios[0];
		if (fields.length) return;
		fields.push(...list);
	});
</script>

<div class="grid h-dvh grid-cols-[auto_minmax(0,1fr)] overflow-hidden">
	<Sidebar />
	<main class="flex min-h-0 min-w-0 flex-col">
		<div class="relative min-h-0 flex-1">
			<Map />
			<Plan />
			<Layers />
		</div>
		<Timeline />
	</main>
</div>

<Settings />
