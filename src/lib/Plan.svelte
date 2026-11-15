<script lang="ts">
	import IconChevronDown from '@tabler/icons-svelte-runes/icons/chevron-down';
	import { practice, same } from '#lib/data.js';
	import {
		METRICS,
		fieldDetail,
		parameters,
		planFile,
		type FieldDetail,
		type PlanIndex,
		type Result
	} from '#lib/farm.js';
	import { PRIORITIES, pareto, scoresOf, weightsFor } from '#lib/rank.js';
	import {
		current,
		ensure,
		meta,
		planIndex,
		priority,
		ranking,
		scenarios,
		selection,
		stats
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

	const TABS = [
		['reco', 'Recommandation'],
		['stats', 'Stats']
	] as const;
	let tab = $state<(typeof TABS)[number][0]>('reco');
	let detail = $state<FieldDetail | null>(null);
	let plan = $state<PlanIndex | null>(null);

	const scenarioLabel = (name: string) => {
		const params = parameters(plan, name);
		if (params.delta_t) return `${params.delta_t > 0 ? '+' : ''}${params.delta_t} °C`;
		if (params.precip_scale && params.precip_scale !== 1)
			return `${Math.round((params.precip_scale - 1) * 100)} % rain`;
		if (params.co2) return `${params.co2} ppm`;
		if (params.irrig) return `${params.irrig} % irrig`;
		if (params.fert) return `${params.fert} % fert`;
		return name[0].toUpperCase() + name.slice(1);
	};

	const observed = $derived.by(() => {
		const fid = selection.field?.id;
		if (!fid) return [];
		const out: { id: string; mean: number }[] = [];
		for (const [id, dates] of Object.entries(stats)) {
			const days = Object.keys(dates).filter((d) => dates[d]?.[fid]).sort();
			const last = days.at(-1);
			if (last) out.push({ id, mean: dates[last][fid].mean });
		}
		return out;
	});

	const format = new Intl.NumberFormat('en', { maximumFractionDigits: 0 });
	const digits = new Intl.NumberFormat('en', { maximumFractionDigits: 2 });
	const signed = new Intl.NumberFormat('en', {
		maximumFractionDigits: 0,
		signDisplay: 'exceptZero'
	});
	const percent = new Intl.NumberFormat('en', {
		style: 'percent',
		maximumFractionDigits: 0
	});
	const cap = (text: string) => text[0].toUpperCase() + text.slice(1);

	const objective = (result: Result, plan: number, key: string) => {
		const column = result.columns.indexOf(key);
		return column < 0 ? undefined : result.site.objectives[plan]?.[column];
	};

	$effect(() => {
		const field = selection.field;
		if (field) ensure(field, selection.scenario);
	});

	$effect(() => {
		const field = selection.field;
		detail = null;
		if (field) fieldDetail(fetch, field.id).then((d) => (detail = d));
	});

	$effect(() => {
		planFile(fetch).then((file) => (plan = file));
	});

	$effect(() => {
		selection.field;
		selection.scenario;
		selection.plan = null;
	});
</script>

{#snippet tile(label: string, value: string)}
	<div>
		<dt class="text-[0.625rem] uppercase tracking-wide text-mute">{label}</dt>
		<dd class="mt-0.5 text-sm tabular-nums">{value}</dd>
	</div>
{/snippet}

{#snippet metricGrid(result: Result, plan: number)}
	<dl class="grid grid-cols-2 gap-x-3 gap-y-2">
		{#each METRICS as [key, label, unit] (key)}
			{@const value = objective(result, plan, key)}
			{#if typeof value === 'number'}
				{@render tile(
					label,
					`${key === 'soc_gain' ? signed.format(value) : format.format(value)} ${unit}`
				)}
			{/if}
		{/each}
	</dl>
{/snippet}

{#if selection.field}
	<aside
		class="absolute left-3 top-3 z-10 flex max-h-[calc(100%-1.5rem)] w-80 flex-col overflow-y-auto rounded-xl border border-edge bg-panel p-3 shadow-lg"
	>
		<div class="flex items-center gap-2">
			<div
				class="grid flex-1 grid-cols-2 gap-0.5 rounded-lg border border-edge bg-canvas p-0.5"
				role="tablist"
			>
				{#each TABS as [id, label] (id)}
					<button
						type="button"
						role="tab"
						aria-selected={tab === id}
						onclick={() => (tab = id)}
						class="h-7 rounded-md text-xs transition-colors {tab === id
							? 'bg-raise text-ink'
							: 'text-mute hover:text-ink'}">{label}</button
					>
				{/each}
			</div>
		</div>

		{#if tab === 'reco'}
			{#if result === undefined}
				<div class="mt-3 flex flex-col gap-2" aria-busy="true">
					<div class="h-4 animate-pulse rounded-md bg-raise"></div>
					<div class="h-4 w-2/3 animate-pulse rounded-md bg-raise"></div>
					<div class="h-4 w-1/2 animate-pulse rounded-md bg-raise"></div>
				</div>
			{:else if result.site.status !== 'ok'}
				<p class="mt-3 text-xs text-mute">{result.site.detail ?? 'No result'}</p>
			{:else if order[0] !== undefined}
				{@const best = order[0]}
				<div class="mt-3 rounded-lg border border-edge bg-canvas p-2.5">
					<div class="flex items-baseline justify-between gap-2">
						<p class="min-w-0 truncate text-base font-medium capitalize">
							{result.rotations[best].join(' / ')}
						</p>
						<p class="shrink-0 text-base tabular-nums">
							{percent.format(scores[best])}<span
								class="ml-1 text-[0.625rem] text-mute">score</span
							>
						</p>
					</div>
					<div class="mt-1.5 h-1 rounded-full bg-raise">
						<div
							class="h-full rounded-full bg-accent"
							style="width:{Math.round(scores[best] * 100)}%"
						></div>
					</div>
					{#if ongoing && !same(result.rotations[best], ongoing(result.rotations[best].length) ?? [])}
						<p class="mt-1.5 truncate text-xs text-mute">
							vs your usual {ongoing(result.rotations[best].length)
								?.filter(Boolean)
								.map(cap)
								.join(' / ')}
						</p>
					{/if}
					<div class="mt-2.5">{@render metricGrid(result, best)}</div>
				</div>

				<details class="group mt-2">
					<summary
						class="flex h-7 cursor-pointer list-none items-center justify-between rounded-md border border-edge bg-canvas px-2 text-xs text-mute transition-colors hover:text-ink"
					>
						Experiment
						<IconChevronDown
							size={14}
							stroke={1.75}
							class="transition-transform group-open:rotate-180"
						/>
					</summary>

					<div
						class="mt-2 grid gap-0.5 rounded-lg border border-edge bg-canvas p-0.5"
						style="grid-template-columns: repeat({names.length}, minmax(0, 1fr))"
						role="group"
						aria-label="Scenario"
					>
						{#each names as scenario (scenario)}
							<button
								type="button"
								aria-pressed={selection.scenario === scenario}
								onclick={() => (selection.scenario = scenario)}
								class="h-7 rounded-md text-xs transition-colors {selection.scenario ===
								scenario
									? 'bg-raise text-ink'
									: 'text-mute hover:text-ink'}">{scenarioLabel(scenario)}</button
							>
						{/each}
					</div>

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
											{format.format(objective(result, i, 'yield_mean') ?? 0)} kg/ha,
											{format.format(objective(result, i, 'water_used') ?? 0)} mm
											{#if front.has(i)}, pareto{/if}
											{#if ongoing && same(result.rotations[i], ongoing(result.rotations[i].length) ?? [])}
												, current{/if}
										</span>
									</span>
									<span class="shrink-0 text-xs tabular-nums">{percent.format(scores[i])}</span
									>
								</button>
							</li>
						{/each}
					</ol>

					{#if chosen}
						<div class="mt-3 border-t border-edge pt-2.5">
							{@render metricGrid(result, index)}
						</div>
					{/if}
				</details>
			{/if}
		{:else}
			<section class="mt-3 rounded-lg border border-edge bg-canvas p-2.5">
				<dl class="grid grid-cols-2 gap-x-3 gap-y-2">
					{@render tile('Crop', cap(selection.field.crop))}
					{#if selection.field.kind}
						{@render tile('Kind', cap(selection.field.kind))}
					{/if}
					{#if selection.field.ha}
						{@render tile('Area', `${selection.field.ha} ha`)}
					{/if}
				</dl>
			</section>

			{#if detail?.rotation?.length}
				<section class="mt-2 rounded-lg border border-edge bg-canvas p-2.5">
					<p class="text-[0.625rem] uppercase tracking-wide text-mute">Rotation</p>
					<dl class="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-2">
						{#each detail.rotation as row (row.year)}
							{@render tile(String(row.year), cap(row.label ?? row.kind ?? 'Unknown'))}
						{/each}
					</dl>
				</section>
			{:else if selection.field.sequence?.length}
				<section class="mt-2 rounded-lg border border-edge bg-canvas p-2.5">
					<p class="text-[0.625rem] uppercase tracking-wide text-mute">Rotation</p>
					<p class="mt-1.5 text-xs">{selection.field.sequence.join(' → ')}</p>
				</section>
			{/if}

			{#if detail?.soil}
				<section class="mt-2 rounded-lg border border-edge bg-canvas p-2.5">
					<p class="text-[0.625rem] uppercase tracking-wide text-mute">
						Soil {detail.soil.depth ? `0–${detail.soil.depth} cm` : ''}
					</p>
					<dl class="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-2">
						{@render tile('Clay', `${digits.format(detail.soil.clay)} %`)}
						{@render tile('Sand', `${digits.format(detail.soil.sand)} %`)}
						{@render tile('Bulk density', `${digits.format(detail.soil.bd)} g/cm³`)}
						{@render tile('SOC', `${digits.format(detail.soil.soc)} g/kg`)}
						{@render tile('pH', digits.format(detail.soil.ph))}
					</dl>
				</section>
			{/if}

			{#if detail?.weather}
				<section class="mt-2 rounded-lg border border-edge bg-canvas p-2.5">
					<p class="text-[0.625rem] uppercase tracking-wide text-mute">Recent weather</p>
					<dl class="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-2">
						{@render tile(
							'T min / max',
							`${digits.format(detail.weather.tmin)} / ${digits.format(detail.weather.tmax)} °C`
						)}
						{@render tile('Root wetness', percent.format(detail.weather.gwetroot))}
						{@render tile('Rain 7 d', `${detail.weather.precip_7d} mm`)}
						{@render tile('Rain 30 d', `${detail.weather.precip_30d} mm`)}
					</dl>
				</section>
			{/if}

			{#if observed.length}
				<section class="mt-2 rounded-lg border border-edge bg-canvas p-2.5">
					<p class="text-[0.625rem] uppercase tracking-wide text-mute">Last observed</p>
					<dl class="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-2">
						{#each observed as o (o.id)}
							{@render tile(o.id.toUpperCase(), digits.format(o.mean))}
						{/each}
					</dl>
				</section>
			{/if}

			{#if detail === null && meta.live}
				<p class="mt-3 animate-pulse text-xs text-mute">Loading field data…</p>
			{/if}
		{/if}
	</aside>
{/if}
