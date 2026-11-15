<script lang="ts">
	import IconDroplet from '@tabler/icons-svelte-runes/icons/droplet';
	import IconEye from '@tabler/icons-svelte-runes/icons/eye';
	import IconEyeOff from '@tabler/icons-svelte-runes/icons/eye-off';
	import IconPhoto from '@tabler/icons-svelte-runes/icons/photo';
	import IconPlant from '@tabler/icons-svelte-runes/icons/plant';
	import IconTemperature from '@tabler/icons-svelte-runes/icons/temperature';
	import { LAYERS } from '#lib/layers.js';

	const ICONS: Record<string, typeof IconPhoto> = {
		rgb: IconPhoto,
		ndvi: IconPlant,
		ndmi: IconDroplet,
		lst: IconTemperature
	};
	import { overlay, selection, stats, useLayer } from '#lib/state.svelte.js';

	const active = $derived(LAYERS.find((layer) => layer.id === overlay.id) ?? LAYERS[0]);
	const stat = $derived(
		selection.field ? stats[active.id]?.[overlay.date]?.[selection.field.id] : undefined
	);
	const sector = $derived.by(() => {
		const values = Object.values(stats[active.id]?.[overlay.date] ?? {}).map((s) => s.mean);
		if (values.length < 3) return null;
		values.sort((a, b) => a - b);
		return values[Math.floor(values.length / 2)];
	});
	const gradient = $derived(`linear-gradient(90deg, ${active.ramp.join(', ')})`);
	const swatch = (layer: (typeof LAYERS)[number]) =>
		layer.ramp.length
			? `linear-gradient(180deg, ${layer.ramp.join(', ')})`
			: 'conic-gradient(#4a6741, #b08d57, #7d9db5, #4a6741)';

	const tick = (value: number) => value.toFixed(active.digits);
	const value = (input: number) =>
		active.digits ? input.toFixed(active.digits) : Math.round(input).toString();
	const pct = (input: number) =>
		Math.max(0, Math.min(100, ((input - active.lo) / (active.hi - active.lo || 1)) * 100));
</script>

<aside
	class="absolute right-2 top-1/2 z-10 flex w-[3.75rem] -translate-y-1/2 flex-col items-center gap-0.5 rounded-xl border border-edge bg-panel p-1 shadow-lg"
	aria-label="Map layers"
>
	<button
		type="button"
		aria-pressed={overlay.visible}
		onclick={() => (overlay.visible = !overlay.visible)}
		title={overlay.visible ? 'Hide layer' : 'Show layer'}
		class="grid size-9 place-items-center rounded-md {overlay.visible
			? 'text-ink'
			: 'text-mute'} hover:bg-raise"
	>
		{#if overlay.visible}
			<IconEye size={17} stroke={1.75} />
		{:else}
			<IconEyeOff size={17} stroke={1.75} />
		{/if}
	</button>

	<hr class="w-8 border-edge" />

	{#each LAYERS as layer (layer.id)}
		{@const Icon = ICONS[layer.id] ?? IconPhoto}
		<button
			type="button"
			aria-pressed={active.id === layer.id}
			onclick={() => useLayer(layer.id)}
			title={layer.hint}
			class="flex w-full flex-col items-center gap-0.5 rounded-md p-1 {active.id === layer.id
				? 'bg-raise text-ink'
				: 'text-mute hover:bg-raise hover:text-ink'}"
		>
			<span
				class="grid size-6 place-items-center rounded-md border text-white {active.id ===
				layer.id
					? 'border-accent'
					: 'border-edge'}"
				style="background:{swatch(layer)}"
			>
				<Icon size={14} stroke={2} />
			</span>
			<span class="text-[0.5625rem] leading-none">{layer.label}</span>
		</button>
	{/each}

</aside>

{#if overlay.visible && active.ramp.length}
	<div
		class="absolute bottom-3 right-14 z-10 flex items-center gap-3 rounded-xl border border-edge bg-panel px-3 py-2 shadow-lg"
	>
		<p class="text-sm leading-tight font-medium">{active.label}</p>

		{#if active.ramp.length}
			<div class="flex w-36 flex-col gap-1">
				<div class="relative h-1.5 rounded-full" style="background:{gradient}">
					{#if stat}
						<span
							class="absolute inset-y-[-3px] w-[3px] -translate-x-1/2 rounded-sm bg-white shadow-[0_0_0_1px_var(--color-ink)]"
							style="left:{pct(stat.mean)}%"
							title="field {value(stat.mean)}"
						></span>
					{/if}
					{#if sector !== null}
						<span
							class="absolute inset-y-[-3px] w-[3px] -translate-x-1/2 rounded-sm bg-mute shadow-[0_0_0_1px_var(--color-ink)]"
							style="left:{pct(sector)}%"
							title="neighbors {value(sector)}"
						></span>
					{/if}
				</div>
				<div class="flex justify-between text-[0.625rem] tabular-nums text-mute">
					<span>{tick(active.lo)}</span>
					<span>{tick((active.lo + active.hi) / 2)}</span>
					<span>{tick(active.hi)}{active.unit}</span>
				</div>
				{#if stat || sector !== null}
					<div class="flex gap-2.5 text-[0.5625rem] text-mute">
						{#if stat}
							<span class="flex items-center gap-1">
								<span
									class="h-2 w-[3px] rounded-sm bg-white shadow-[0_0_0_1px_var(--color-ink)]"
								></span>field
							</span>
						{/if}
						{#if sector !== null}
							<span class="flex items-center gap-1">
								<span
									class="h-2 w-[3px] rounded-sm bg-mute shadow-[0_0_0_1px_var(--color-ink)]"
								></span>neighbors
							</span>
						{/if}
					</div>
				{/if}
			</div>
		{/if}

		{#if stat}
			<div class="flex flex-col gap-0.5 border-l border-edge pl-3">
				<p class="leading-tight tabular-nums">
					{value(stat.mean)}<span class="ml-0.5 text-[0.625rem] text-mute">{active.unit}</span>
				</p>
				<p class="text-[0.625rem] tabular-nums text-mute">
					field range {value(stat.p10)} – {value(stat.p90)}
				</p>
				{#if sector !== null}
					<p class="text-[0.625rem] tabular-nums text-mute">neighbors {value(sector)}</p>
				{/if}
			</div>
		{:else if selection.field}
			<p class="border-l border-edge pl-3 text-[0.625rem] text-mute">No field sample</p>
		{/if}
	</div>
{/if}
