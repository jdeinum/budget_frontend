import { getContext, setContext } from 'svelte';
import { invalidateAll } from '$app/navigation';
import type { Merchant } from '$lib/types';

const KEY = Symbol('merchants-store');

/**
 * Client-side merchant store, seeded once from the layout's server-loaded
 * data. Tag edits update local state optimistically and persist through a
 * same-origin proxy to the real backend, mirroring the transactions store —
 * including the `invalidateAll()` after tag/untag, since a merchant tag can
 * now match a transaction-ignore rule too (see transactions.svelte.ts).
 */
export function createMerchantsStore(initial: Merchant[]) {
	let merchants = $state(initial);

	function findIndex(id: string): number {
		return merchants.findIndex((m) => m.id === id);
	}

	async function tag(id: string, name: string, value: string) {
		const index = findIndex(id);
		if (index === -1) return;
		const m = merchants[index];
		const otherTags = m.tags.filter((t) => t.name !== name);
		merchants[index] = { ...m, tags: [...otherTags, { name, value }] };

		const res = await fetch(`/api/merchants/${id}/tags`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ name, value })
		});
		if (!res.ok) {
			console.error(`Failed to tag merchant ${id}:`, await res.text());
			return;
		}
		const tags = await res.json();
		const current = findIndex(id);
		if (current !== -1) merchants[current] = { ...merchants[current], tags };
		await invalidateAll();
	}

	async function untag(id: string, name: string) {
		const index = findIndex(id);
		if (index === -1) return;
		const m = merchants[index];
		merchants[index] = { ...m, tags: m.tags.filter((t) => t.name !== name) };

		const res = await fetch(`/api/merchants/${id}/tags/${encodeURIComponent(name)}`, {
			method: 'DELETE'
		});
		if (!res.ok) {
			console.error(`Failed to untag merchant ${id}:`, await res.text());
			return;
		}
		const tags = await res.json();
		const current = findIndex(id);
		if (current !== -1) merchants[current] = { ...merchants[current], tags };
		await invalidateAll();
	}

	function replaceAll(next: Merchant[]) {
		merchants = next;
	}

	return {
		get merchants() {
			return merchants;
		},
		tag,
		untag,
		replaceAll
	};
}

export type MerchantsStore = ReturnType<typeof createMerchantsStore>;

export function setMerchantsContext(store: MerchantsStore) {
	setContext(KEY, store);
}

export function getMerchantsContext(): MerchantsStore {
	const store = getContext<MerchantsStore>(KEY);
	if (!store) throw new Error('getMerchantsContext() called outside the layout that provides it');
	return store;
}
