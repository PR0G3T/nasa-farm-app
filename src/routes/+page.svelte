<script lang="ts">
	import Map from '#lib/Map.svelte';
	import Settings from '#lib/Settings.svelte';
	import Sidebar from '#lib/Sidebar.svelte';
	import Timeline from '#lib/Timeline.svelte';
	import { events } from '#lib/data.js';
	import { fields, sel } from '#lib/state.svelte.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	$effect(() => {
		if (fields.length) return;
		fields.push(...data.fields);
		sel.field ??= fields[0];
		const names = data.fields.map((f) => f.name);
		events
			.filter((e) => e.track === 'ops')
			.forEach((e, i) => (e.field = names[i % names.length]));
	});
</script>

<div class="grid h-dvh grid-cols-[auto_minmax(0,1fr)] overflow-hidden">
	<Sidebar />
	<main class="flex min-h-0 min-w-0 flex-col">
		<div class="min-h-0 flex-1">
			<Map />
		</div>
		<Timeline />
	</main>
</div>

<Settings />
