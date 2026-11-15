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

	const label = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' });
	const day = (iso: string) => (iso ? label.format(new Date(`${iso}T12:00:00Z`)) : '');
	const tick = (value: number) => value.toFixed(active.digits);
	const value = (input: number) =>
		active.digits ? input.toFixed(active.digits) : Math.round(input).toString();
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
			title="{layer.label} · {layer.detail} · {layer.native} m"
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

{#if overlay.visible}
	<div
		class="absolute bottom-3 right-14 z-10 flex items-center gap-3 rounded-xl border border-edge bg-panel px-3 py-2 shadow-lg"
	>
		<div class="flex flex-col">
			<p class="text-sm leading-tight font-medium">{active.label}</p>
			<p class="text-[0.625rem] tabular-nums text-mute">
				{day(overlay.date)} · {active.native} m
			</p>
		</div>

		{#if active.ramp.length}
			<div class="flex w-36 flex-col gap-1">
				<div class="h-1.5 rounded-full" style="background:{gradient}"></div>
				<div class="flex justify-between text-[0.625rem] tabular-nums text-mute">
					<span>{tick(active.lo)}</span>
					<span>{tick((active.lo + active.hi) / 2)}</span>
					<span>{tick(active.hi)}{active.unit}</span>
				</div>
			</div>
		{/if}

		{#if stat}
			<div class="flex flex-col gap-0.5 border-l border-edge pl-3">
				<p class="max-w-32 truncate text-[0.625rem] text-mute">{selection.field?.name}</p>
				<p class="leading-tight tabular-nums">
					{value(stat.mean)}<span class="ml-0.5 text-[0.625rem] text-mute">{active.unit}</span>
				</p>
				<p class="text-[0.625rem] tabular-nums text-mute">
					p10 {value(stat.p10)} · p90 {value(stat.p90)}
				</p>
				{#if sector !== null}
					<p class="text-[0.625rem] tabular-nums text-mute">sector {value(sector)}</p>
				{/if}
			</div>
		{:else if selection.field}
			<div class="flex flex-col gap-0.5 border-l border-edge pl-3">
				<p class="max-w-32 truncate text-[0.625rem] text-mute">{selection.field.name}</p>
				<p class="text-[0.625rem] text-mute">No field sample</p>
			</div>
		{/if}
	</div>
{/if}
