<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { cn } from '$lib/utils';
	import RefreshIcon from '@lucide/svelte/icons/refresh-cw';

	type Status = 'idle' | 'syncing' | 'error';

	interface ItemSyncResult {
		item_id: string;
		plaid_item_id: string;
		summary: { added: number; modified: number; removed: number } | null;
		error: string | null;
	}

	let status = $state<Status>('idle');
	let errorMessage = $state<string | null>(null);
	let summary = $state<{ items: number; added: number; modified: number; removed: number } | null>(null);

	async function sync() {
		status = 'syncing';
		errorMessage = null;
		summary = null;

		try {
			const res = await fetch('/api/plaid/items/sync', { method: 'POST' });
			if (!res.ok) throw new Error(await res.text());
			const results: ItemSyncResult[] = await res.json();

			const failed = results.filter((r) => r.error);
			if (failed.length > 0) throw new Error(failed.map((r) => r.error).join('; '));

			summary = results.reduce(
				(acc, r) => ({
					items: acc.items + 1,
					added: acc.added + (r.summary?.added ?? 0),
					modified: acc.modified + (r.summary?.modified ?? 0),
					removed: acc.removed + (r.summary?.removed ?? 0)
				}),
				{ items: 0, added: 0, modified: 0, removed: 0 }
			);

			await invalidateAll();
			status = 'idle';
		} catch (err) {
			status = 'error';
			errorMessage = err instanceof Error ? err.message : 'Failed to sync';
		}
	}
</script>

<div>
	<button
		type="button"
		onclick={sync}
		disabled={status === 'syncing'}
		class="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
	>
		<RefreshIcon class={cn('size-4', status === 'syncing' && 'animate-spin')} />
		{status === 'syncing' ? 'Syncing…' : 'Sync now'}
	</button>

	{#if errorMessage}
		<p class="mt-2 text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
	{:else if summary}
		<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
			Synced {summary.items} item{summary.items === 1 ? '' : 's'} — {summary.added} added, {summary.modified}
			modified{summary.removed > 0 ? `, ${summary.removed} removed` : ''}.
		</p>
	{/if}
</div>
