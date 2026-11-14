<script lang="ts">
	import { events } from '#lib/data.js';
	import { ui } from '#lib/state.svelte.js';
	import {
		DAYS,
		H_HOME,
		H_MAX,
		H_MIN,
		clamp,
		dayAt,
		dayLabel,
		lanes,
		months,
		weeks,
		x
	} from '#lib/tl.js';

	const rows = $derived([
		{ label: 'Imagery', evs: events.filter((e) => e.track === 'imagery') },
		...lanes(events.filter((e) => e.track === 'ops'))
	]);
	const date = $derived(dayLabel(ui.day));

	const fills = {
		low: 'bg-raise text-ink',
		watch: 'bg-warn text-onwarn',
		alert: 'bg-alert text-onalert'
	};
	const marks = { low: 'bg-mute', watch: 'bg-warn', alert: 'bg-alert' };

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
		ui.day = dayAt((e.clientX - left) / width);
	}

	function grab(e: PointerEvent) {
		area.setPointerCapture(e.pointerId);
		seek(e);
	}

	function step(e: KeyboardEvent) {
		const d = e.shiftKey ? 7 : 1;
		if (e.key === 'ArrowLeft') ui.day = clamp(ui.day - d, 0, DAYS);
		if (e.key === 'ArrowRight') ui.day = clamp(ui.day + d, 0, DAYS);
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
			{#each rows as row, i (i)}
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
			aria-valuemax={DAYS}
			aria-valuenow={ui.day}
			tabindex="0"
			onpointerdown={grab}
			onpointermove={(e) => e.buttons === 1 && seek(e)}
			onkeydown={step}
			class="relative flex-1 touch-none"
		>
			<div class="relative h-6 border-b border-edge">
				{#each weeks as d (d)}
					<div
						class="absolute bottom-0 h-1.5 w-px bg-mute/40"
						style="left: {x(d)}%"
					></div>
				{/each}
				{#each months as m (m.label)}
					<div class="absolute bottom-0 h-2.5 w-px bg-mute" style="left: {x(m.d)}%"></div>
					<span
						class="absolute bottom-2 pl-1 text-[0.625rem] leading-none text-mute"
						style="left: {x(m.d)}%">{m.label}</span
					>
				{/each}
			</div>

			{#each rows as row, i (i)}
				<div class="relative h-8 border-b border-edge last:border-b-0">
					{#each row.evs as ev (ev.id)}
						{@const lvl = ev.level ?? 'low'}
						{#if ev.end}
							<div
								title="{ev.field ? `${ev.field} · ` : ''}{ev.label} · day {ev.start}–{ev.end}"
								class="absolute top-1/2 flex h-5 -translate-y-1/2 items-center overflow-hidden rounded px-1.5 text-[0.625rem] whitespace-nowrap {fills[
									lvl
								]}"
								style="left: {x(ev.start)}%; width: {x(ev.end - ev.start)}%"
							>
								{ev.label}
							</div>
						{:else}
							<div
								title="{ev.field ? `${ev.field} · ` : ''}{ev.label} · day {ev.start}"
								class="absolute top-1/2 h-4 -translate-y-1/2 {ev.level
									? `w-0.5 ${marks[lvl]}`
									: 'w-px bg-mute'}"
								style="left: {x(ev.start)}%"
							></div>
						{/if}
					{/each}
				</div>
			{/each}

			<div
				class="pointer-events-none absolute inset-y-0 z-10 w-px bg-accent"
				style="left: {x(ui.day)}%"
			>
				<div
					class="absolute -left-1 top-0 size-2.5 rounded-sm bg-accent"
					style="clip-path: polygon(0 0, 100% 0, 100% 40%, 50% 100%, 0 40%)"
				></div>
			</div>
		</div>
	</div>
</section>
