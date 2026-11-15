<script lang="ts">
	import { historyOffset, selection, stats, useLayer, view } from '#lib/state.svelte.js';
	import {
		BIN,
		HEIGHT_HOME,
		HEIGHT_MAX,
		HEIGHT_MIN,
		WINDOW,
		clamp,
		dayAt,
		isoAt,
		winOf,
		wticks,
		x
	} from '#lib/timeline.js';
	import { LAYERS, signals, type Signal } from '#lib/layers.js';

	const hi = $derived(historyOffset());
	const lo = $derived(hi - WINDOW);
	const X = (day: number) => x(day - lo, WINDOW);
	const fmt = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' });
	const date = $derived(fmt.format(new Date(`${isoAt(view.day, hi)}T12:00:00Z`)));

	const rem = () => parseFloat(getComputedStyle(document.documentElement).fontSize);

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

	const peaks = $derived(
		selection.field
			? signals(stats, selection.field.id)
					.map((signal) => ({ signal, day: winOf(signal.date, hi) }))
					.filter((peak) => peak.day >= lo && peak.day <= hi)
			: []
	);

	const MARK: Record<string, string> = { ndvi: '#8ac248', ndmi: '#2ab0a5', lst: '#e85a24' };
	const KIND: Record<Signal['kind'], string> = {
		sector: 'sector anomaly',
		limit: 'past limit',
		shift: 'sharp change'
	};

	const describe = (s: Signal) => {
		const fmt = (v: number) => `${v.toFixed(s.layer.digits)}${s.layer.unit}`;
		if (s.kind === 'sector') return `${s.date} · ${fmt(s.value)} vs sector ${fmt(s.ref)}`;
		if (s.kind === 'limit') return `${s.date} · ${fmt(s.value)} vs limit ${fmt(s.ref)}`;
		return `${s.date} · ${fmt(s.value)} vs ${fmt(s.ref)} on ${s.prev}`;
	};

	function jump(signal: Signal) {
		view.day = winOf(signal.date, hi);
		useLayer(signal.layer.id);
	}

	const rows = $derived(
		LAYERS.filter((layer) => layer.dir).map((layer) => ({ id: layer.id, label: layer.label }))
	);

	/** Parcel curve over the window: polyline points + scene dots, per row. */
	const track = (id: string) => {
		const fid = selection.field?.id;
		const per = stats[id] ?? {};
		if (!fid) return { points: '', dots: [] as { x: number; y: number }[] };
		const samples = Object.keys(per)
			.sort()
			.map((iso) => ({ day: winOf(iso, hi), v: per[iso][fid]?.mean }))
			.filter((p) => p.v !== undefined && p.day >= lo && p.day <= hi);
		const vs = samples.map((p) => p.v!);
		const span = Math.max(...vs) - Math.min(...vs) || 1;
		const dots = samples.map((p) => ({
			x: X(p.day),
			y: 26 - ((p.v! - Math.min(...vs)) / span) * 20
		}));
		return {
			points: dots.map((d) => `${d.x.toFixed(2)},${d.y.toFixed(1)}`).join(' '),
			dots
		};
	};

	$effect(() => {
		if (selection.field) view.day = hi;
	});

	let area = $state<HTMLElement>();
	let height = $state(HEIGHT_HOME);
	let anchor = 0;
	let held = HEIGHT_HOME;

	const resize = (value: number) => (height = clamp(value, HEIGHT_MIN, HEIGHT_MAX));

	/** Content height in rem: header 2.25 + ruler 1.5 + rows 2. */
	const need = $derived(5.5 + rows.length * 2);
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
		if (!area) return;
		const { left, width } = area.getBoundingClientRect();
		view.day = clamp(lo + dayAt((event.clientX - left) / width, WINDOW), lo, hi);
	}

	function grab(event: PointerEvent) {
		if (!area) return;
		tip = null;
		area.setPointerCapture(event.pointerId);
		seek(event);
	}

	function step(event: KeyboardEvent) {
		const delta = event.shiftKey ? BIN : 1;
		if (event.key === 'ArrowLeft') view.day = clamp(view.day - delta, lo, hi);
		if (event.key === 'ArrowRight') view.day = clamp(view.day + delta, lo, hi);
	}
</script>

{#if selection.field}
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
		</div>

		<div
			bind:this={area}
			role="slider"
			aria-label="Timeline"
			aria-valuemin={lo}
			aria-valuemax={hi}
			aria-valuenow={view.day}
			tabindex="0"
			onpointerdown={grab}
			onpointermove={(event) => event.buttons === 1 && seek(event)}
			onkeydown={step}
			class="relative mr-16 flex-1 touch-none"
		>
			<div class="relative h-6 border-b border-edge">
				{#each wticks(lo, hi) as tick (tick.day)}
					<div
						class="absolute bottom-0 w-px {tick.major ? 'h-2.5 bg-mute' : 'h-1.5 bg-mute/40'}"
						style="left: {X(tick.day)}%"
					></div>
					{#if tick.label}
						<span
							class="absolute bottom-2 pl-1 text-[0.625rem] leading-none text-mute"
							style="left: {X(tick.day)}%">{tick.label}</span
						>
					{/if}
				{/each}
			</div>

			{#each rows as row (row.id)}
				{@const t = track(row.id)}
				<div class="relative h-8 border-b border-edge last:border-b-0">
					<svg class="absolute inset-0 h-full w-full" viewBox="0 0 100 32" preserveAspectRatio="none">
						<polyline
							points={t.points}
							fill="none"
							stroke={MARK[row.id]}
							stroke-width="1.5"
							stroke-opacity="0.6"
							vector-effect="non-scaling-stroke"
						/>
					</svg>
					{#each t.dots as dot}
						<div
							class="pointer-events-none absolute size-1 -translate-x-1/2 -translate-y-1/2 rounded-full"
							style="left: {dot.x}%; top: {dot.y}px; background: {MARK[row.id]}"
						></div>
					{/each}
					{#each peaks.filter((peak) => peak.signal.layer.id === row.id) as peak (peak.signal.date)}
						{@const s = peak.signal}
						{@const tipText = `${s.layer.label} ${KIND[s.kind]}`}
						<button
							type="button"
							aria-label="{tipText} · {s.date}"
							onpointerenter={(event) => tipOn(event, tipText, describe(s))}
							onpointerleave={tipOff}
							onpointerdown={(event) => event.stopPropagation()}
							onclick={() => jump(s)}
							class="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[0.1875rem] border border-canvas transition-transform hover:scale-125"
							style="left: {X(peak.day)}%; background: {MARK[s.layer.id]}"
						></button>
					{/each}
				</div>
			{/each}

			<div
				class="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-ink/70"
				style="left: {X(hi)}%"
			>
				<span
					class="absolute top-0 left-1 text-[0.5625rem] leading-none text-mute uppercase"
					>today</span
				>
			</div>
			<div
				class="pointer-events-none absolute inset-y-0 z-10 w-px bg-accent"
				style="left: {X(clamp(view.day, lo, hi))}%"
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
{/if}
