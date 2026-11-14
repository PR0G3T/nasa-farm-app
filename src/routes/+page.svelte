<script lang="ts">
	import Map from '#lib/Map.svelte';
	import Settings from '#lib/Settings.svelte';
	import Sidebar from '#lib/Sidebar.svelte';
	import Timeline from '#lib/Timeline.svelte';
</script>

<div class="grid h-dvh grid-cols-[auto_minmax(0,1fr)] overflow-hidden">
	<Sidebar />
	<main class="flex min-w-0 flex-col">
		<div class="min-h-0 flex-1">
			<Map />
		</div>
		<Timeline />
	</main>
</div>

<Settings />
