<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { getItemsContext } from '$lib/state/items.svelte';
	import { getAccountsContext } from '$lib/state/accounts.svelte';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';

	const itemsStore = getItemsContext();
	const accountsStore = getAccountsContext();

	let confirmOpen = $state(false);
	let pendingItemId = $state<string | null>(null);
	let disconnecting = $state(false);
	let errorMessage = $state<string | null>(null);

	function accountNames(itemId: string): string {
		const names = accountsStore.accounts.filter((a) => a.item_id === itemId).map((a) => a.name);
		return names.length > 0 ? names.join(', ') : 'this connection';
	}

	function requestDisconnect(itemId: string) {
		pendingItemId = itemId;
		errorMessage = null;
		confirmOpen = true;
	}

	async function confirmDisconnect() {
		if (!pendingItemId) return;
		disconnecting = true;
		const result = await itemsStore.disconnect(pendingItemId);
		disconnecting = false;
		if (!result.ok) {
			errorMessage = result.error;
			return;
		}
		confirmOpen = false;
		pendingItemId = null;
	}
</script>

{#if itemsStore.items.length > 0}
	<div class="space-y-2">
		<p class="text-sm font-medium">Connected banks</p>
		{#each itemsStore.items as item (item.id)}
			<div class="flex items-center justify-between rounded-md border px-4 py-2.5 text-sm">
				<span>{accountNames(item.id)}</span>
				<Button
					variant="ghost"
					size="icon"
					class="text-muted-foreground hover:text-destructive size-7"
					onclick={() => requestDisconnect(item.id)}
					aria-label="Disconnect bank"
				>
					<Trash2Icon class="size-4" />
				</Button>
			</div>
		{/each}
	</div>
{/if}

<Dialog.Root bind:open={confirmOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Disconnect this bank?</Dialog.Title>
			<Dialog.Description>
				This removes {pendingItemId ? accountNames(pendingItemId) : 'this connection'} and all of
				its transaction history from nil, and revokes nil's access on Plaid's side. This can't be
				undone.
			</Dialog.Description>
		</Dialog.Header>
		{#if errorMessage}
			<p class="text-destructive text-sm">{errorMessage}</p>
		{/if}
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (confirmOpen = false)}>Cancel</Button>
			<Button variant="destructive" disabled={disconnecting} onclick={confirmDisconnect}>
				{disconnecting ? 'Disconnecting…' : 'Disconnect'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
