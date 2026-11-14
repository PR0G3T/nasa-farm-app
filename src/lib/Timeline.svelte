<script lang="ts">
	import { recs, sel, ui } from '#lib/state.svelte.js';
	import { BIN, H_HOME, H_MAX, H_MIN, YEAR, clamp, dayAt, dayLabel, ticks, x } from '#lib/tl.js';

	const cur = $derived(sel.field ? recs[sel.field.id]?.[sel.scenario] : undefined);
	const top = $derived(cur?.status === 'ok' ? cur?.top?.[0] : undefined);
	const trace = $derived(top?.trace);
	const span = $derived(trace ? trace.water.length * BIN : YEAR);
	const date = $derived(dayLabel(ui.day));

	const stressLevel = (p: number): 'watch' | 'alert' | null =>
		p < 0.05 ? null : p < 0.35 ? 'watch' : 'alert';
	const stressFill = { watch: 'fill-warn', alert: 'fill-alert' } as const;

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
		{ id: 'rotation', label: 'Rotation' },
		{ id: 'water', label: 'Water' },
		{ id: 'stress', label: 'Stress' },
		{ id: 'frost', label: 'Frost' }
	] as const;

	let area: HTMLElement;
	let h = $state(H_HOME);
	let y0 = 0;
	let h0 = H_HOME;

	const rem = () => parseFloat(getComputedStyle(document.documentElement).fontSize);
	const setH = (v: number) => (h = clamp(v, H_MIN, H_MAX));

	function grabH(e: PointerEvent) {
		y0 = e.clientY;
		h0 = h;
		e.currentTarget instanceof HTMLElement &&
			e.currentTarget.setPointerCapture(e.pointerId);
	}

	function dragH(e: PointerEvent) {
		if (e.buttons === 1) setH(h0 + (y0 - e.clientY) / rem());
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
				{#each ticks(span) as t (t.d)}
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

			<div class="relative h-8 border-b border-edge">
				{#each top?.rotation ?? [] as crop, y (y)}
					{@const win = canopyWin(y)}
					<div
						title="{crop} · year {y + 1}"
						class="absolute top-1/2 flex h-5 -translate-y-1/2 items-center overflow-hidden rounded bg-raise px-1.5 text-[0.625rem] whitespace-nowrap text-ink"
						style="left: {x(y * YEAR, span)}%; width: {x(Math.min(YEAR, span - y * YEAR), span)}%"
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
			</div>

			{#each rows.slice(1) as row (row.id)}
				<div class="relative h-8 border-b border-edge last:border-b-0">
					{#if trace}
						<svg
							class="absolute inset-0 h-full w-full"
							viewBox="0 0 {span} 32"
							preserveAspectRatio="none"
							aria-hidden="true"
						>
							{#if row.id === 'water'}
								<path
									d="M0 32 {trace.water
										.map((v, i) => `L${i * BIN + BIN / 2} ${(1 - v) * 30 + 1}`)
										.join(' ')} L{span} 32 Z"
									class="fill-accent/20 stroke-accent"
									stroke-width="1.5"
									vector-effect="non-scaling-stroke"
								/>
							{:else if row.id === 'stress'}
								{#each trace.stress as p, i (i)}
									{@const lvl = stressLevel(p)}
									{#if lvl}
										<rect
											x={i * BIN}
											y={4}
											width={BIN - 0.5}
											height={24}
											rx={1}
											class="{stressFill[lvl]} opacity-70"
										>
											<title>{Math.round(p * 100)}% stressed · {dayLabel(i * BIN)}</title>
										</rect>
									{/if}
								{/each}
							{:else}
								{#each trace.frost as p, i (i)}
									{#if p > 0}
										<rect
											x={i * BIN + BIN / 2 - 0.75}
											y={8}
											width={1.5}
											height={16}
											class="fill-alert"
										>
											<title>{Math.round(p * 100)}% frost · {dayLabel(i * BIN)}</title>
										</rect>
									{/if}
								{/each}
							{/if}
						</svg>
					{/if}
				</div>
			{/each}

			<div
				class="pointer-events-none absolute inset-y-0 z-10 w-px bg-accent"
				style="left: {x(ui.day, span)}%"
			>
				<div
					class="absolute -left-1 top-0 size-2.5 rounded-sm bg-accent"
					style="clip-path: polygon(0 0, 100% 0, 100% 40%, 50% 100%, 0 40%)"
				></div>
			</div>
		</div>
	</div>
</section>
