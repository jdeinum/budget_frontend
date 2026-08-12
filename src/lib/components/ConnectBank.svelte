<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { loadPlaidLink } from '$lib/plaid-link';
	import LandmarkIcon from '@lucide/svelte/icons/landmark';

	type Status = 'idle' | 'connecting' | 'exchanging' | 'error';

	let status = $state<Status>('idle');
	let errorMessage = $state<string | null>(null);
	let lastSync = $state<{ added: number; modified: number; removed: number } | null>(null);

	async function connect() {
		status = 'connecting';
		errorMessage = null;
		lastSync = null;

		try {
			await loadPlaidLink();

			const tokenRes = await fetch('/api/plaid/link-token', { method: 'POST' });
			if (!tokenRes.ok) throw new Error(await tokenRes.text());
			const { link_token } = await tokenRes.json();

			const publicToken = await new Promise<string>((resolve, reject) => {
				const handler = window.Plaid!.create({
					token: link_token,
					onSuccess: (publicToken) => resolve(publicToken),
					onExit: (error) => {
						if (error) reject(new Error(error.display_message ?? error.error_message));
						else reject(new Error('cancelled'));
					}
				});
				handler.open();
			});

			status = 'exchanging';
			const itemRes = await fetch('/api/plaid/items', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ public_token: publicToken })
			});
			if (!itemRes.ok) throw new Error(await itemRes.text());
			const { sync } = await itemRes.json();
			lastSync = sync;

			await invalidateAll();
			status = 'idle';
		} catch (err) {
			if (err instanceof Error && err.message === 'cancelled') {
				status = 'idle';
				return;
			}
			status = 'error';
			errorMessage = err instanceof Error ? err.message : 'Failed to connect';
		}
	}
</script>

<div>
	<button
		type="button"
		onclick={connect}
		disabled={status === 'connecting' || status === 'exchanging'}
		class="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
	>
		<LandmarkIcon class="size-4" />
		{#if status === 'connecting'}
			Connecting…
		{:else if status === 'exchanging'}
			Syncing…
		{:else}
			Connect a bank
		{/if}
	</button>

	{#if errorMessage}
		<p class="mt-2 text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
	{:else if lastSync}
		<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
			Connected — synced {lastSync.added} transaction{lastSync.added === 1 ? '' : 's'}.
		</p>
	{/if}
</div>
