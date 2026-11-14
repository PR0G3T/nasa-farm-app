<script lang="ts">
	import IconX from '@tabler/icons-svelte-runes/icons/x';
	import IconSun from '@tabler/icons-svelte-runes/icons/sun';
	import IconMoon from '@tabler/icons-svelte-runes/icons/moon';
	import IconDeviceDesktop from '@tabler/icons-svelte-runes/icons/device-desktop';
	import { setMode, userPrefersMode } from 'mode-watcher';
	import { ui } from '#lib/state.svelte.js';
	import type { Icon } from '@tabler/icons-svelte-runes';

	let dlg: HTMLDialogElement;

	const themes: { id: 'system' | 'light' | 'dark'; label: string; icon: Icon }[] = [
		{ id: 'system', label: 'System', icon: IconDeviceDesktop },
		{ id: 'light', label: 'Light', icon: IconSun },
		{ id: 'dark', label: 'Dark', icon: IconMoon }
	];

	$effect(() => {
		if (ui.settings) dlg.showModal();
		else dlg.close();
	});
</script>

<dialog
	bind:this={dlg}
	closedby="any"
	onclose={() => (ui.settings = false)}
	onclick={(e) => e.target === dlg && dlg.close()}
	class="m-auto w-96 rounded-xl border border-edge bg-panel p-0 text-ink shadow-2xl"
>
	<header class="flex h-12 items-center justify-between border-b border-edge px-4">
		<span class="text-sm font-medium">Settings</span>
		<button
			type="button"
			onclick={() => dlg.close()}
			aria-label="Close settings"
			class="grid size-8 place-items-center rounded-md text-mute transition-colors hover:bg-raise hover:text-ink"
		>
			<IconX size={18} stroke={1.75} />
		</button>
	</header>

	<div class="px-4 py-4">
		<div class="flex items-center justify-between gap-4">
			<span class="text-sm">Appearance</span>
			<div
				class="grid flex-1 grid-cols-3 gap-0.5 rounded-lg border border-edge bg-canvas p-0.5"
			>
				{#each themes as t (t.id)}
					{@const on = userPrefersMode.current === t.id}
					{@const ThemeIcon = t.icon}
					<button
						type="button"
						aria-pressed={on}
						onclick={() => setMode(t.id)}
						class="flex h-9 items-center justify-center gap-1.5 rounded-md text-sm transition-colors {on
							? 'bg-raise text-ink'
							: 'text-mute hover:text-ink'}"
					>
						<ThemeIcon size={16} stroke={1.75} class={on ? 'text-accent' : ''} />
						{t.label}
					</button>
				{/each}
			</div>
		</div>
	</div>
</dialog>
