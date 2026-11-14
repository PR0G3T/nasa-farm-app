<script lang="ts">
	import IconChevron from '@tabler/icons-svelte-runes/icons/chevron-down';
	import type { Trace } from '#lib/farm.js';
	import { current, ensure, historyOffset, results, scenarios, selection, view, startYear } from '#lib/state.svelte.js';
	import {
		BIN,
		HAZARDS,
		HEIGHT_HOME,
		HEIGHT_MAX,
		HEIGHT_MIN,
		YEAR,
		canopy,
		clamp,
		dayAt,
		dayLabel,
		hazard,
		ticks,
		x
	} from '#lib/timeline.js';
	import type { Hazard } from '#lib/timeline.js';

	const top = $derived(current()?.status === 'ok' ? current()?.top?.[0] : undefined);
	const trace = $derived(top?.trace);
	const history = $derived(current()?.history);
	const years = $derived(top?.rotation.length ?? 1);
	const span = $derived(historyOffset() + years * YEAR);
	const date = $derived(dayLabel(view.day, historyOffset(), startYear()));

	const lanes = $derived(
		scenarios().map((scenario) => {
			const result = selection.field ? results[selection.field.id]?.[scenario] : undefined;
			return { scenario, result, trace: result?.status === 'ok' ? result.top?.[0]?.trace : undefined };
		})
	);

	const COLORS = {
		watch: '--color-warn',
		alert: '--color-alert',
		mute: '--color-mute',
		accent: '--color-accent'
	} as const;
	type Color = keyof typeof COLORS;

	const stripe = (key: Color) =>
		`repeating-linear-gradient(-45deg, var(${COLORS[key]}) 0 0.1875rem, color-mix(in oklab, var(${COLORS[key]}) 18%, transparent) 0.1875rem 0.5rem)`;
	const mini = (key: Color) =>
		`repeating-linear-gradient(-45deg, var(${COLORS[key]}) 0 0.125rem, color-mix(in oklab, var(${COLORS[key]}) 22%, transparent) 0.125rem 0.375rem)`;
	const veil = (key: Color) =>
		`repeating-linear-gradient(-45deg, color-mix(in oklab, var(${COLORS[key]}) 32%, transparent) 0 0.1875rem, color-mix(in oklab, var(${COLORS[key]}) 10%, transparent) 0.1875rem 0.5rem)`;
	const solid = (key: Color) => `color-mix(in oklab, var(${COLORS[key]}) 45%, transparent)`;

	const rem = () => parseFloat(getComputedStyle(document.documentElement).fontSize);
	const stamp = (day: number) => dayLabel(day, historyOffset(), startYear());

	type Tip = { x: number; top: number; bottom: number; title: string; detail: string };
	let tip = $state<Tip | null>(null);

	function tipOn(event: PointerEvent, title: string, detail: string) {
		if (event.buttons) return;
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		tip = { x: rect.left + rect.width / 2, top: rect.top, bottom: rect.bottom, title, detail };
	}
	const tipOff = () => (tip = null);
	const tipX = $derived(
		tip ? Math.min(Math.max(tip.x, 4 * rem()), window.innerWidth - 4 * rem()) : 0
	);
	const tipUp = $derived(tip !== null && tip.top > 4.5 * rem());

	const points = $derived(
		(trace?.water ?? []).map(
			(value, index) => [historyOffset() + index * BIN + BIN / 2, (1 - value) * 30 + 1] as const
		)
	);
	const path = $derived(
		points.length ? `M${points.map((point) => point.join(' ')).join(' L')}` : ''
	);
	const clip = $derived(
		points.length
			? `polygon(${x(points[0][0], span)}% 100%, ${points
					.map((point) => `${x(point[0], span)}% ${(point[1] / 32) * 100}%`)
					.join(', ')}, ${x(points[points.length - 1][0], span)}% 100%)`
			: 'none'
	);

	type Row = {
		id: 'rotation' | 'water' | Hazard;
		label: string;
		hazard: 'dry' | 'heat' | 'frost' | null;
	};
	const rows: Row[] = [
		{ id: 'rotation', label: 'Rotation', hazard: null },
		{ id: 'water', label: 'Water', hazard: null },
		{ id: 'stress', label: 'Stress', hazard: 'dry' },
		{ id: 'heat', label: 'Heat', hazard: 'heat' },
		{ id: 'frost', label: 'Frost', hazard: 'frost' }
	];

	$effect(() => {
		const field = selection.field;
		if (field && view.compare) for (const scenario of scenarios()) ensure(field, scenario);
	});

	let initialized = false;
	$effect(() => {
		if (!initialized && historyOffset()) ((view.day = historyOffset()), (initialized = true));
	});

	let area: HTMLElement;
	let height = $state(HEIGHT_HOME);
	let anchor = 0;
	let held = HEIGHT_HOME;

	const resize = (value: number) => (height = clamp(value, HEIGHT_MIN, HEIGHT_MAX));

	/** Content height in rem: header 2.25 + ruler 1.5 + rows 2 + group head 1.75 + lanes 2. */
	const need = $derived(5.5 + rows.length * 2 + (view.compare ? lanes.length * 2 : 0));
	$effect(() => {
		if (need > height) resize(need);
	});

	function press(event: PointerEvent) {
		anchor = event.clientY;
		held = height;
		event.currentTarget instanceof HTMLElement &&
			event.currentTarget.setPointerCapture(event.pointerId);
	}

	function pull(event: PointerEvent) {
		if (event.buttons === 1) resize(held + (anchor - event.clientY) / rem());
	}

	function sizeKeys(event: KeyboardEvent) {
		if (event.key === 'ArrowUp') resize(height + 1);
		if (event.key === 'ArrowDown') resize(height - 1);
	}

	function seek(event: PointerEvent) {
		const { left, width } = area.getBoundingClientRect();
		view.day = dayAt((event.clientX - left) / width, span);
	}

	function grab(event: PointerEvent) {
		tip = null;
		area.setPointerCapture(event.pointerId);
		seek(event);
	}

	function step(event: KeyboardEvent) {
		const delta = event.shiftKey ? BIN : 1;
		if (event.key === 'ArrowLeft') view.day = clamp(view.day - delta, 0, span);
		if (event.key === 'ArrowRight') view.day = clamp(view.day + delta, 0, span);
	}
</script>

{#snippet strips(trace: Trace | undefined, label: string)}
	<div class="absolute inset-x-0 top-1/2 flex -translate-y-1/2 flex-col gap-1">
		{#each HAZARDS as kind (kind)}
			<div class="relative h-1.5">
				{#each hazard(kind, trace) as [start, end, color] (start)}
					{@const caption = `${label} · ${kind} · ${color} · ${stamp(historyOffset() + start)} → ${stamp(historyOffset() + end)}`}
					<div
						role="img"
						aria-label={caption}
						onpointerenter={(event) =>
							tipOn(event, `${label} · ${kind} · ${color}`, `${stamp(historyOffset() + start)} → ${stamp(historyOffset() + end)}`)}
						onpointerleave={tipOff}
						class="absolute inset-y-0 rounded-sm"
						style="left: {x(historyOffset() + start, span)}%; width: {x(end - start, span)}%; background-image: {mini(color)}"
					></div>
				{/each}
			</div>
		{/each}
	</div>
{/snippet}

<section
	class="relative flex shrink-0 select-none flex-col border-t border-edge bg-panel"
	style="height: {height}rem"
>
	<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
	<div
		role="separator"
		aria-orientation="horizontal"
		aria-label="Resize timeline"
		aria-valuenow={height}
		tabindex="0"
		onpointerdown={press}
		onpointermove={pull}
		onkeydown={sizeKeys}
		ondblclick={() => resize(HEIGHT_HOME)}
		class="group absolute inset-x-0 -top-1 z-20 h-2 cursor-row-resize touch-none"
	>
		<div
			class="absolute inset-x-0 top-1 h-px bg-transparent transition-colors group-hover:bg-mute"
		></div>
	</div>
	<header class="flex h-9 items-center justify-between px-3">
		<span class="text-xs font-medium text-mute">Timeline</span>
		<span class="text-xs tabular-nums text-ink">{date}</span>
	</header>

	<div class="flex min-h-0 flex-1 items-start overflow-y-auto" onscroll={tipOff}>
		<div class="flex w-16 shrink-0 flex-col border-r border-edge">
			<div class="h-6 shrink-0 border-b border-edge"></div>
			{#each rows as row (row.id)}
				<div
					class="flex h-8 shrink-0 items-center justify-center border-b border-edge last:border-b-0"
				>
					<span class="text-xs text-mute">{row.label}</span>
				</div>
			{/each}
			<button
				type="button"
				aria-expanded={view.compare}
				onclick={() => (view.compare = !view.compare)}
				class="flex h-7 shrink-0 items-center gap-0.5 border-b border-edge px-1.5 text-left"
				title="Compare scenarios"
			>
				<IconChevron
					size={12}
					stroke={2}
					class="shrink-0 text-mute transition-transform duration-150 {view.compare
						? ''
						: '-rotate-90'}"
				/>
				<span class="truncate text-[0.625rem] text-mute">Scenario</span>
			</button>
			{#if view.compare}
				{#each lanes as lane (lane.scenario)}
					{@const active = selection.scenario === lane.scenario}
					<button
						type="button"
						aria-pressed={active}
						title="{lane.scenario}{lane.result?.status === 'error'
							? ` · ${lane.result.detail ?? 'error'}`
							: ''}"
						onclick={() => (selection.scenario = lane.scenario)}
						class="flex h-8 shrink-0 items-center border-b border-edge px-2 text-[0.625rem] capitalize transition-colors last:border-b-0 {active
							? 'bg-raise text-ink'
							: 'text-mute hover:text-ink'}"
					>
						<span class="truncate">{lane.scenario}</span>
					</button>
				{/each}
			{/if}
		</div>

		<div
			bind:this={area}
			role="slider"
			aria-label="Timeline"
			aria-valuemin={0}
			aria-valuemax={span}
			aria-valuenow={view.day}
			tabindex="0"
			onpointerdown={grab}
			onpointermove={(event) => event.buttons === 1 && seek(event)}
			onkeydown={step}
			class="relative flex-1 touch-none"
		>
			<div class="relative h-6 border-b border-edge">
				{#each ticks(span, historyOffset(), startYear()) as tick (tick.day)}
					<div
						class="absolute bottom-0 w-px {tick.major ? 'h-2.5 bg-mute' : 'h-1.5 bg-mute/40'}"
						style="left: {x(tick.day, span)}%"
					></div>
					{#if tick.label}
						<span
							class="absolute bottom-2 pl-1 text-[0.625rem] leading-none text-mute"
							style="left: {x(tick.day, span)}%">{tick.label}</span
						>
					{/if}
				{/each}
			</div>

			{#each rows as row (row.id)}
				<div class="relative h-8 border-b border-edge last:border-b-0">
					{#if row.id === 'rotation'}
						{#each top?.rotation ?? [] as crop, year (year)}
							{@const range = canopy(trace?.canopy, year)}
							{@const detail = range
								? `canopy ${stamp(historyOffset() + range[0])} → ${stamp(historyOffset() + range[1])}`
								: 'planned'}
							<div
								role="img"
								aria-label="{crop} · Y{year + 1} · {detail}"
								onpointerenter={(event) => tipOn(event, `${crop} · Y${year + 1}`, detail)}
								onpointerleave={tipOff}
								class="pred absolute top-1/2 flex h-5 -translate-y-1/2 items-center overflow-hidden rounded bg-raise px-1.5 text-[0.625rem] whitespace-nowrap text-ink"
								style="left: {x(historyOffset() + year * YEAR, span)}%; width: {x(YEAR, span)}%"
							>
								{crop}
								{#if range}
									<div
										class="pred absolute bottom-0 h-1 bg-accent/60"
										style="left: {x(range[0] - year * YEAR, YEAR)}%; width: {x(range[1] - range[0], YEAR)}%"
									></div>
								{/if}
							</div>
						{/each}
					{:else if row.id === 'water'}
						{#if points.length}
							<div
								class="absolute inset-0"
								style="clip-path: {clip}; background-image: {veil('accent')}"
							></div>
						{/if}
						{#if history?.sm || trace}
							<svg
								class="absolute inset-0 h-full w-full"
								viewBox="0 0 {span} 32"
								preserveAspectRatio="none"
								aria-hidden="true"
							>
								{#if history?.sm?.length}
									{@const moisture = history.sm}
									<path
										d="M0 32 {moisture
											.map((value, index) => `L${((index + 0.5) / moisture.length) * historyOffset()} ${(1 - value) * 30 + 1}`)
											.join(' ')} L{historyOffset()} 32 Z"
										class="fill-mute/15 stroke-mute"
										stroke-width="1"
										vector-effect="non-scaling-stroke"
									/>
								{/if}
								{#if path}
									<path
										d={path}
										fill="none"
										class="stroke-accent"
										stroke-width="1.5"
										vector-effect="non-scaling-stroke"
									/>
								{/if}
							</svg>
						{/if}
					{:else}
						{#if history && row.hazard}
							{#each history[row.hazard] as [start, end] (start)}
								<div
									role="img"
									aria-label="{row.label} · observed · {stamp(start)} → {stamp(end)}"
									onpointerenter={(event) =>
										tipOn(event, `${row.label} · observed`, `${stamp(start)} → ${stamp(end)}`)}
									onpointerleave={tipOff}
									class="absolute top-1/2 h-5 -translate-y-1/2 rounded-sm"
									style="left: {x(start, span)}%; width: {x(end - start, span)}%; background: {solid(
										row.id === 'stress' ? 'watch' : row.id === 'heat' ? 'alert' : 'mute'
									)}"
								></div>
							{/each}
						{/if}
						{#each hazard(row.id, trace) as [start, end, color] (start)}
							<div
								role="img"
								aria-label="{row.label} · predicted · {color} · {stamp(historyOffset() + start)} → {stamp(historyOffset() + end)}"
								onpointerenter={(event) =>
									tipOn(event, `${row.label} · predicted · ${color}`, `${stamp(historyOffset() + start)} → ${stamp(historyOffset() + end)}`)}
								onpointerleave={tipOff}
								class="absolute top-1/2 h-5 -translate-y-1/2 rounded-sm border"
								style="left: {x(historyOffset() + start, span)}%; width: {x(end - start, span)}%; background-image: {stripe(
									color
								)}; border-color: color-mix(in oklab, var({COLORS[color]}) 50%, transparent)"
							></div>
						{/each}
					{/if}
				</div>
			{/each}

			<div class="relative h-7 border-b border-edge">
				{@render strips(trace, selection.scenario)}
			</div>
			{#if view.compare}
				{#each lanes as lane (lane.scenario)}
					<div class="relative h-8 border-b border-edge last:border-b-0">
						{#if lane.result === undefined}
							<div
								class="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 animate-pulse rounded-sm bg-raise"
							></div>
						{:else}
							{@render strips(lane.trace, lane.scenario)}
						{/if}
					</div>
				{/each}
			{/if}

			{#if historyOffset()}
				<div
					class="pointer-events-none absolute inset-y-0 z-10 w-px bg-ink/50"
					style="left: {x(historyOffset(), span)}%"
				></div>
			{/if}
			<div
				class="pointer-events-none absolute inset-y-0 z-10 w-px bg-accent"
				style="left: {x(Math.min(view.day, span), span)}%"
			>
				<div
					class="absolute -left-1 top-0 size-2.5 rounded-sm bg-accent"
					style="clip-path: polygon(0 0, 100% 0, 100% 40%, 50% 100%, 0 40%)"
				></div>
			</div>
		</div>
	</div>

	{#if tip}
		<div
			role="tooltip"
			class="pointer-events-none fixed z-50 -translate-x-1/2 rounded-md border border-edge bg-panel px-2 py-1 shadow-lg {tipUp
				? '-translate-y-full'
				: ''}"
			style="left: {tipX}px; top: {tipUp ? tip.top - 6 : tip.bottom + 6}px"
		>
			<p class="capitalize text-[0.625rem] font-medium whitespace-nowrap text-ink">{tip.title}</p>
			<p class="text-[0.625rem] whitespace-nowrap text-mute">{tip.detail}</p>
		</div>
	{/if}
</section>
