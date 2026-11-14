<script lang="ts">
	import IconSettings from '@tabler/icons-svelte-runes/icons/settings';
	import IconSearch from '@tabler/icons-svelte-runes/icons/search';
	import IconCollapse from '@tabler/icons-svelte-runes/icons/layout-sidebar-left-collapse';
	import IconExpand from '@tabler/icons-svelte-runes/icons/layout-sidebar-left-expand';
	import { find } from '#lib/data.js';
	import { preview } from '#lib/geography.js';
	import { fields, selection, view } from '#lib/state.svelte.js';

	let collapsed = $state(false);
	let query = $state('');

	const list = $derived(find(fields, query));
</script>

<aside
	class="flex h-full min-h-0 flex-col border-r border-edge bg-panel transition-[width] duration-200 ease-out {collapsed
		? 'w-14'
		: 'w-72'}"
>
	<header
		class="flex h-14 items-center border-b border-edge px-3 {collapsed
			? 'justify-center'
			: 'gap-2.5'}"
	>
		{#if !collapsed}
			<span class="truncate pt-0.5 font-logo text-sm">FARM</span>
		{/if}
		<button
			type="button"
			onclick={() => (collapsed = !collapsed)}
			aria-expanded={!collapsed}
			aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
			class="grid size-8 shrink-0 place-items-center rounded-md text-mute transition-colors hover:bg-raise hover:text-ink {collapsed
				? ''
				: 'ml-auto'}"
		>
			{#if collapsed}
				<IconExpand size={18} stroke={1.75} />
			{:else}
				<IconCollapse size={18} stroke={1.75} />
			{/if}
		</button>
	</header>

	<div class="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
		{#if !collapsed}
			<div class="relative mb-1">
				<IconSearch
					size={16}
					class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-mute"
				/>
				<input
					type="search"
					placeholder="Search fields"
					bind:value={query}
					class="h-9 w-full rounded-md border border-edge bg-canvas pl-8 pr-2.5 text-sm outline-none transition-colors placeholder:text-mute focus:border-accent"
				/>
			</div>
		{/if}

		<nav class="flex flex-col gap-0.5">
			{#each list as field (field.id)}
				{@const selected = selection.field?.id === field.id}
				<button
					type="button"
					aria-current={selected ? 'true' : undefined}
					title={collapsed ? field.name : undefined}
					onclick={() => (selection.field = field)}
					class="row text-left {collapsed
						? 'h-9 justify-center p-0'
						: 'min-h-11 px-2.5 py-1.5'} {selected
						? 'bg-raise text-ink'
						: 'text-mute hover:bg-raise hover:text-ink'}"
				>
					<span
						class="shrink-0 overflow-hidden rounded-md bg-raise {collapsed
							? 'size-7'
							: 'size-10'}"
					>
						<img
							src={preview(field)}
							alt={field.name}
							loading="lazy"
							decoding="async"
							draggable={false}
							class="h-full w-full object-cover"
						/>
					</span>
					{#if !collapsed}
						<span class="min-w-0 flex-1">
							<span class="block truncate text-sm">{field.name}</span>
							<span class="block truncate text-xs text-mute"
								>{field.crop} · {field.ha} ha</span
							>
						</span>
					{/if}
				</button>
			{:else}
				{#if !collapsed}
					<p class="px-2.5 py-2 text-sm text-mute">No fields</p>
				{/if}
			{/each}
		</nav>
	</div>

	<footer class="flex flex-col gap-0.5 border-t border-edge p-2">
		<button
			type="button"
			title={collapsed ? 'Settings' : undefined}
			onclick={() => (view.settings = true)}
			class="row h-9 text-sm text-mute hover:bg-raise hover:text-ink {collapsed
				? 'justify-center p-0'
				: 'px-2.5'}"
		>
			<IconSettings size={20} stroke={1.75} class="shrink-0" />
			{#if !collapsed}
				<span class="truncate">Settings</span>
			{/if}
		</button>
	</footer>
</aside>
