<script lang="ts">
	import { METRICS } from '#lib/farm.js';
	import { cur, ensure, meta, scen, sel } from '#lib/state.svelte.js';

	const scenarios = $derived(scen());
	const c = $derived(cur());
	const best = $derived(c?.top?.[0]);
	const pareto = $derived(c?.pareto?.length ?? 0);

	const fmt = new Intl.NumberFormat('en', { maximumFractionDigits: 0 });
	const sgn = new Intl.NumberFormat('en', {
		maximumFractionDigits: 0,
		signDisplay: 'exceptZero'
	});

	$effect(() => {
		const field = sel.field;
		if (field) ensure(field, sel.scenario);
	});
</script>

{#if sel.field}
	<aside
		class="absolute left-3 top-3 z-10 w-72 rounded-xl border border-edge bg-panel p-3 shadow-lg"
	>
		<header class="flex items-start justify-between gap-2">
			<div class="min-w-0">
				<p class="truncate text-sm font-medium">{sel.field.name}</p>
				<p class="truncate text-xs text-mute">{sel.field.crop} · {sel.field.ha} ha</p>
			</div>
			<span class="shrink-0 pt-0.5 text-[0.625rem] text-mute"
				>{meta.live ? 'live' : 'static'}</span
			>
		</header>

		<div
			class="mt-3 grid gap-0.5 rounded-lg border border-edge bg-canvas p-0.5"
			style="grid-template-columns: repeat({scenarios.length}, minmax(0, 1fr))"
			role="group"
			aria-label="Scenario"
		>
			{#each scenarios as s (s)}
				<button
					type="button"
					aria-pressed={sel.scenario === s}
					onclick={() => (sel.scenario = s)}
					class="h-7 rounded-md text-xs capitalize transition-colors {sel.scenario === s
						? 'bg-raise text-ink'
						: 'text-mute hover:text-ink'}">{s}</button
				>
			{/each}
		</div>

		{#if c === undefined}
			<div class="mt-3 flex flex-col gap-2" aria-busy="true">
				<div class="h-4 animate-pulse rounded-md bg-raise"></div>
				<div class="h-4 w-2/3 animate-pulse rounded-md bg-raise"></div>
				<div class="h-4 w-1/2 animate-pulse rounded-md bg-raise"></div>
			</div>
		{:else if c.status !== 'ok' || !best}
			<p class="mt-3 text-xs text-mute">{c.detail ?? 'No result'}</p>
		{:else}
			<p class="mt-3 truncate text-sm" title={best.rotation.join(' / ')}>
				{best.rotation.join(' / ')}
			</p>
			<dl class="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
				{#each METRICS as [key, label, unit] (key)}
					{@const v = best[key]}
					{#if typeof v === 'number'}
						<div class="flex items-baseline justify-between gap-1">
							<dt class="text-xs text-mute">{label}</dt>
							<dd class="text-xs tabular-nums">
								{key === 'soc_gain' ? sgn.format(v) : fmt.format(v)}
								<span class="text-mute">{unit}</span>
							</dd>
						</div>
					{/if}
				{/each}
			</dl>
			<p class="mt-2 text-[0.625rem] text-mute">
				{pareto} non-dominated · {c.plans_evaluated} rotations · {c.scenarios} scenarios
			</p>
		{/if}
	</aside>
{/if}
