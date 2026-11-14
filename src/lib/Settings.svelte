<script lang="ts">
	import IconX from '@tabler/icons-svelte-runes/icons/x';
	import IconSun from '@tabler/icons-svelte-runes/icons/sun';
	import IconMoon from '@tabler/icons-svelte-runes/icons/moon';
	import IconDeviceDesktop from '@tabler/icons-svelte-runes/icons/device-desktop';
	import { setMode, userPrefersMode } from 'mode-watcher';
	import { view } from '#lib/state.svelte.js';
	import type { Icon } from '@tabler/icons-svelte-runes';

	let dialog: HTMLDialogElement;

	const themes: { id: 'system' | 'light' | 'dark'; label: string; icon: Icon }[] = [
		{ id: 'system', label: 'System', icon: IconDeviceDesktop },
		{ id: 'light', label: 'Light', icon: IconSun },
		{ id: 'dark', label: 'Dark', icon: IconMoon }
	];

	$effect(() => {
		if (view.settings) dialog.showModal();
		else dialog.close();
	});
</script>

<dialog
	bind:this={dialog}
	closedby="any"
	onclose={() => (view.settings = false)}
	onclick={(event) => event.target === dialog && dialog.close()}
	class="m-auto w-96 rounded-xl border border-edge bg-panel p-0 text-ink shadow-2xl"
>
	<header class="flex h-12 items-center justify-between border-b border-edge px-4">
		<span class="text-sm font-medium">Settings</span>
		<button
			type="button"
			onclick={() => dialog.close()}
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
				{#each themes as theme (theme.id)}
					{@const active = userPrefersMode.current === theme.id}
					{@const ThemeIcon = theme.icon}
					<button
						type="button"
						aria-pressed={active}
						onclick={() => setMode(theme.id)}
						class="flex h-9 items-center justify-center gap-1.5 rounded-md text-sm transition-colors {active
							? 'bg-raise text-ink'
							: 'text-mute hover:text-ink'}"
					>
						<ThemeIcon size={16} stroke={1.75} class={active ? 'text-accent' : ''} />
						{theme.label}
					</button>
				{/each}
			</div>
		</div>
	</div>
</dialog>
