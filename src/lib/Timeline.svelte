<script lang="ts">
	import { cur, hOff, ui, y0 } from '#lib/state.svelte.js';
	import { BIN, H_HOME, H_MAX, H_MIN, YEAR, clamp, dayAt, dayLabel, ticks, x } from '#lib/tl.js';

	const top = $derived(cur()?.status === 'ok' ? cur()?.top?.[0] : undefined);
	const trace = $derived(top?.trace);
	const hist = $derived(cur()?.history);
	const fYears = $derived(top?.rotation.length ?? 1);
	const span = $derived(hOff() + fYears * YEAR);
	const date = $derived(dayLabel(ui.day, hOff(), y0()));

	const COL = { watch: '--color-warn', alert: '--color-alert', mute: '--color-mute' } as const;
	type Col = keyof typeof COL;

	const stripe = (c: Col) =>
		`repeating-linear-gradient(-45deg, var(${COL[c]}) 0 0.1875rem, color-mix(in oklab, var(${COL[c]}) 18%, transparent) 0.1875rem 0.5rem)`;
	const solid = (c: Col) => `color-mix(in oklab, var(${COL[c]}) 45%, transparent)`;

	function bands(
		probs: number[] | undefined,
		cut: (p: number) => Col | null
	): [number, number, Col][] {
		const out: [number, number, Col][] = [];
		let s = -1;
		let c: Col = 'watch';
		probs?.forEach((p, i) => {
			const l = cut(p);
			if (l && s < 0) ((s = i), (c = l));
			else if (l === 'alert') c = 'alert';
			else if (!l && s >= 0) (out.push([s * BIN, i * BIN, c]), (s = -1));
		});
		if (s >= 0) out.push([s * BIN, (probs?.length ?? 0) * BIN, c]);
		return out;
	}

	const fcst = (id: string) =>
		id === 'stress'
			? bands(trace?.stress, (p) => (p < 0.15 ? null : p < 0.4 ? 'watch' : 'alert'))
			: id === 'heat'
				? bands(trace?.heat, (p) => (p > 0.1 ? 'alert' : null))
				: bands(trace?.frost, (p) => (p > 0.05 ? 'alert' : null));

	const canopyWin = (y: number): [number, number] | null => {
		const a = trace?.canopy ?? [];
		const w0 = Math.floor((y * YEAR) / BIN);
		const w1 = Math.min(a.length, w0 + Math.ceil(YEAR / BIN));
		let lo = -1;
		let hi = -1;
		for (let i = w0; i < w1; i++) if (a[i] > 0.2) (lo < 0 && (lo = i), (hi = i));
		return lo < 0 ? null : [lo * BIN, Math.min((hi + 1) * BIN, (y + 1) * YEAR)];
	};

	const rows = [
		{ id: 'rotation', label: 'Rotation', hist: null },
		{ id: 'water', label: 'Water', hist: null },
		{ id: 'stress', label: 'Stress', hist: 'dry' },
		{ id: 'heat', label: 'Heat', hist: 'heat' },
		{ id: 'frost', label: 'Frost', hist: 'frost' }
	] as const;

	let area: HTMLElement;
	let h = $state(H_HOME);
	let y = 0;
	let h0 = H_HOME;

	const rem = () => parseFloat(getComputedStyle(document.documentElement).fontSize);
	const setH = (v: number) => (h = clamp(v, H_MIN, H_MAX));

	function grabH(e: PointerEvent) {
		y = e.clientY;
		h0 = h;
		e.currentTarget instanceof HTMLElement &&
			e.currentTarget.setPointerCapture(e.pointerId);
	}

	function dragH(e: PointerEvent) {
		if (e.buttons === 1) setH(h0 + (y - e.clientY) / rem());
	}

	function sizeKeys(e: KeyboardEvent) {
		if (e.key === 'ArrowUp') setH(h + 1);
		if (e.key === 'ArrowDown') setH(h - 1);
	}

	function seek(e: PointerEvent) {
		const { left, width } = area.getBoundingClientRect();
		ui.day = dayAt((e.clientX - left) / width, span);
	}

	function grab(e: PointerEvent) {
		area.setPointerCapture(e.pointerId);
		seek(e);
	}

	function step(e: KeyboardEvent) {
		const d = e.shiftKey ? BIN : 1;
		if (e.key === 'ArrowLeft') ui.day = clamp(ui.day - d, 0, span);
		if (e.key === 'ArrowRight') ui.day = clamp(ui.day + d, 0, span);
	}
</script>

<section
	class="relative flex shrink-0 select-none flex-col border-t border-edge bg-panel"
	style="height: {h}rem"
>
	<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
	<div
		role="separator"
		aria-orientation="horizontal"
		aria-label="Resize timeline"
		aria-valuenow={h}
		tabindex="0"
		onpointerdown={grabH}
		onpointermove={dragH}
		onkeydown={sizeKeys}
		ondblclick={() => setH(H_HOME)}
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

	<div class="flex min-h-0 flex-1">
		<div class="flex w-16 shrink-0 flex-col border-r border-edge">
			<div class="h-6 border-b border-edge"></div>
			{#each rows as row (row.id)}
				<div class="flex h-8 items-center justify-center border-b border-edge last:border-b-0">
					<span class="text-xs text-mute">{row.label}</span>
				</div>
			{/each}
		</div>

		<div
			bind:this={area}
			role="slider"
			aria-label="Timeline"
			aria-valuemin={0}
			aria-valuemax={span}
			aria-valuenow={ui.day}
			tabindex="0"
			onpointerdown={grab}
			onpointermove={(e) => e.buttons === 1 && seek(e)}
			onkeydown={step}
			class="relative flex-1 touch-none"
		>
			<div class="relative h-6 border-b border-edge">
				{#each ticks(span, hOff(), y0()) as t (t.d)}
					<div
						class="absolute bottom-0 w-px {t.major ? 'h-2.5 bg-mute' : 'h-1.5 bg-mute/40'}"
						style="left: {x(t.d, span)}%"
					></div>
					{#if t.label}
						<span
							class="absolute bottom-2 pl-1 text-[0.625rem] leading-none text-mute"
							style="left: {x(t.d, span)}%">{t.label}</span
						>
					{/if}
				{/each}
			</div>

			{#each rows as row (row.id)}
				<div class="relative h-8 border-b border-edge last:border-b-0">
					{#if row.id === 'rotation'}
						{#each top?.rotation ?? [] as crop, y (y)}
							{@const win = canopyWin(y)}
							<div
								title="{crop} · year {y + 1}"
								class="absolute top-1/2 flex h-5 -translate-y-1/2 items-center overflow-hidden rounded bg-raise px-1.5 text-[0.625rem] whitespace-nowrap text-ink"
								style="left: {x(hOff() + y * YEAR, span)}%; width: {x(YEAR, span)}%"
							>
								{crop}
								{#if win}
									<div
										class="absolute bottom-0 h-1 bg-accent/60"
										style="left: {x(win[0] - y * YEAR, YEAR)}%; width: {x(win[1] - win[0], YEAR)}%"
									></div>
								{/if}
							</div>
						{/each}
					{:else if row.id === 'water'}
						{#if trace}
							<svg
								class="absolute inset-0 h-full w-full"
								viewBox="0 0 {span} 32"
								preserveAspectRatio="none"
								aria-hidden="true"
							>
								<path
									d="M{hOff()} 32 {trace.water
										.map((v, i) => `L${hOff() + i * BIN + BIN / 2} ${(1 - v) * 30 + 1}`)
										.join(' ')} L{hOff() + trace.water.length * BIN} 32 Z"
									class="fill-accent/20 stroke-accent"
									stroke-width="1.5"
									vector-effect="non-scaling-stroke"
								/>
							</svg>
						{/if}
					{:else}
						{#if hist && row.hist}
							{#each hist[row.hist] as [s, e] (s)}
								<div
									title="{row.hist} · observed · {dayLabel(s, hOff(), y0())} → {dayLabel(e, hOff(), y0())}"
									class="absolute top-1/2 h-5 -translate-y-1/2 rounded-sm"
									style="left: {x(s, span)}%; width: {x(e - s, span)}%; background: {solid(
										row.id === 'stress' ? 'watch' : row.id === 'heat' ? 'alert' : 'mute'
									)}"
								></div>
							{/each}
						{/if}
						{#each fcst(row.id) as [s, e, c] (s)}
							<div
								title="{row.id} · predicted · {dayLabel(hOff() + s, hOff(), y0())} → {dayLabel(hOff() + e, hOff(), y0())}"
								class="absolute top-1/2 h-5 -translate-y-1/2 rounded-sm border"
								style="left: {x(hOff() + s, span)}%; width: {x(e - s, span)}%; background-image: {stripe(
									c
								)}; border-color: color-mix(in oklab, var({COL[c]}) 50%, transparent)"
							></div>
						{/each}
					{/if}
				</div>
			{/each}

			{#if hOff()}
				<div
					class="pointer-events-none absolute inset-y-0 z-10 w-px bg-ink/50"
					style="left: {x(hOff(), span)}%"
				></div>
			{/if}
			<div
				class="pointer-events-none absolute inset-y-0 z-10 w-px bg-accent"
				style="left: {x(Math.min(ui.day, span), span)}%"
			>
				<div
					class="absolute -left-1 top-0 size-2.5 rounded-sm bg-accent"
					style="clip-path: polygon(0 0, 100% 0, 100% 40%, 50% 100%, 0 40%)"
				></div>
			</div>
		</div>
	</div>
</section>
