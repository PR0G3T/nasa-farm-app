<script lang="ts">
	import { practice, same } from '#lib/data.js';
	import { METRICS, type Result } from '#lib/farm.js';
	import { PRIORITIES, pareto, scoresOf, weightsFor } from '#lib/rank.js';
	import {
		current,
		ensure,
		meta,
		planIndex,
		priority,
		ranking,
		scenarios,
		selection
	} from '#lib/state.svelte.js';

	const names = $derived(scenarios());
	const result = $derived(current());
	const index = $derived(planIndex());
	const order = $derived(ranking());
	const chosen = $derived(result?.rotations[index]);

	const weights = $derived(result ? weightsFor(result.columns, priority) : []);
	const scores = $derived(
		result?.site.status === 'ok'
			? scoresOf(result.site.objectives, result.directions, weights)
			: []
	);
	const front = $derived(
		result?.site.status === 'ok'
			? new Set(pareto(result.site.objectives, result.directions))
			: new Set<number>()
	);
	const top = $derived(order.slice(0, 5));
	const ongoing = $derived(
		selection.field?.kinds?.length
			? (years: number) => practice(selection.field!, years)
			: null
	);

	const format = new Intl.NumberFormat('en', { maximumFractionDigits: 0 });
	const signed = new Intl.NumberFormat('en', {
		maximumFractionDigits: 0,
		signDisplay: 'exceptZero'
	});
	const percent = new Intl.NumberFormat('en', {
		style: 'percent',
		maximumFractionDigits: 0
	});

	const objective = (result: Result, plan: number, key: string) => {
		const column = result.columns.indexOf(key);
		return column < 0 ? undefined : result.site.objectives[plan]?.[column];
	};

	$effect(() => {
		const field = selection.field;
		if (field) ensure(field, selection.scenario);
	});

	$effect(() => {
		selection.field;
		selection.scenario;
		selection.plan = null;
	});
</script>

{#if selection.field}
	<aside
		class="absolute left-3 top-3 z-10 flex max-h-[calc(100%-1.5rem)] w-80 flex-col overflow-y-auto rounded-xl border border-edge bg-panel p-3 shadow-lg"
	>
		<header class="flex items-start justify-between gap-2">
			<div class="min-w-0">
				<p class="truncate text-sm font-medium">{selection.field.name}</p>
				<p class="truncate text-xs text-mute">
					{selection.field.crop}{selection.field.ha ? ` · ${selection.field.ha} ha` : ''}
				</p>
				{#if selection.field.sequence?.length}
					<p class="truncate text-[0.625rem] text-mute" title={selection.field.sequence.join(' → ')}>
						{selection.field.sequence.join(' → ')}
					</p>
				{/if}
			</div>
			<span class="shrink-0 pt-0.5 text-[0.625rem] text-mute"
				>{meta.live ? 'live' : 'static'}</span
			>
		</header>

		<div
			class="mt-3 grid gap-0.5 rounded-lg border border-edge bg-canvas p-0.5"
			style="grid-template-columns: repeat({names.length}, minmax(0, 1fr))"
			role="group"
			aria-label="Scenario"
		>
			{#each names as scenario (scenario)}
				<button
					type="button"
					aria-pressed={selection.scenario === scenario}
					onclick={() => (selection.scenario = scenario)}
					class="h-7 rounded-md text-xs capitalize transition-colors {selection.scenario ===
					scenario
						? 'bg-raise text-ink'
						: 'text-mute hover:text-ink'}">{scenario}</button
				>
			{/each}
		</div>

		{#if result === undefined}
			<div class="mt-3 flex flex-col gap-2" aria-busy="true">
				<div class="h-4 animate-pulse rounded-md bg-raise"></div>
				<div class="h-4 w-2/3 animate-pulse rounded-md bg-raise"></div>
				<div class="h-4 w-1/2 animate-pulse rounded-md bg-raise"></div>
			</div>
		{:else if result.site.status !== 'ok'}
			<p class="mt-3 text-xs text-mute">{result.site.detail ?? 'No result'}</p>
		{:else}
			<div class="mt-3 flex flex-col gap-1.5">
				{#each PRIORITIES as p (p.key)}
					<label class="flex items-center gap-2 text-xs">
						<span class="w-14 shrink-0 truncate text-mute">{p.label}</span>
						<input
							type="range"
							min="0"
							max="4"
							step="0.5"
							bind:value={priority[p.key]}
							class="h-1 min-w-0 flex-1 cursor-pointer accent-(--color-accent)"
						/>
						<span class="w-6 shrink-0 text-right tabular-nums text-mute"
							>×{priority[p.key]}</span
						>
					</label>
				{/each}
			</div>

			<ol class="mt-3 flex flex-col gap-0.5">
				{#each top as i (i)}
					{@const active = i === index}
					<li>
						<button
							type="button"
							aria-pressed={active}
							onclick={() => (selection.plan = active ? null : i)}
							class="row w-full px-2 py-1.5 text-left {active
								? 'bg-raise text-ink'
								: 'text-mute hover:bg-raise hover:text-ink'}"
						>
							<span class="min-w-0 flex-1">
								<span class="block truncate text-xs"
									>{result.rotations[i].join(' / ')}</span
								>
								<span class="block truncate text-[0.625rem] text-mute">
									{format.format(objective(result, i, 'yield_mean') ?? 0)} kg/ha ·
									{format.format(objective(result, i, 'water_used') ?? 0)} mm
									{#if front.has(i)} · pareto{/if}
									{#if ongoing && same(result.rotations[i], ongoing(result.rotations[i].length) ?? [])}
										· current{/if}
								</span>
							</span>
							<span class="shrink-0 text-xs tabular-nums">{percent.format(scores[i])}</span
							>
						</button>
					</li>
				{/each}
			</ol>

			{#if chosen}
				<dl class="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-edge pt-2.5">
					{#each METRICS as [key, label, unit] (key)}
						{@const value = objective(result, index, key)}
						{#if typeof value === 'number'}
							<div class="flex items-baseline justify-between gap-1">
								<dt class="text-xs text-mute">{label}</dt>
								<dd class="text-xs tabular-nums">
									{key === 'soc_gain' ? signed.format(value) : format.format(value)}
									<span class="text-mute">{unit}</span>
								</dd>
							</div>
						{/if}
					{/each}
				</dl>
				<p class="mt-2 text-[0.625rem] text-mute">
					rank {order.indexOf(index) + 1} · {front.size} non-dominated · {result.site
						.plans_evaluated} rotations · {result.site.scenarios} scenarios
				</p>
			{/if}
		{/if}
	</aside>
{/if}
