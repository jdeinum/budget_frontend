import { getContext, setContext } from 'svelte';
import { invalidateAll } from '$app/navigation';
import type { Item } from '$lib/types';

const KEY = Symbol('items-store');

/**
 * Client-side store of connected Plaid items (bank connections), seeded once
 * from the layout's server-loaded data, mirroring the other stores. The only
 * mutation is `disconnect` — it deletes the item (which revokes it on
 * Plaid's side first, then cascades locally to its accounts/transactions/
 * tags — see `routes/plaid.rs::delete_item`), then `invalidateAll()`s since
 * that's too big a change to patch in place.
 */
export function createItemsStore(initial: Item[]) {
	let items = $state(initial);

	async function disconnect(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
		const res = await fetch(`/api/plaid/items/${id}`, { method: 'DELETE' });
		if (!res.ok) {
			const error = await res.text();
			console.error(`Failed to disconnect item ${id}:`, error);
			return { ok: false, error };
		}
		await invalidateAll();
		return { ok: true };
	}

	function replaceAll(next: Item[]) {
		items = next;
	}

	return {
		get items() {
			return items;
		},
		disconnect,
		replaceAll
	};
}

export type ItemsStore = ReturnType<typeof createItemsStore>;

export function setItemsContext(store: ItemsStore) {
	setContext(KEY, store);
}

export function getItemsContext(): ItemsStore {
	const store = getContext<ItemsStore>(KEY);
	if (!store) throw new Error('getItemsContext() called outside the layout that provides it');
	return store;
}
