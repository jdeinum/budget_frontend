import { getContext, setContext } from 'svelte';
import { invalidateAll } from '$app/navigation';
import type { Transaction } from '$lib/types';

const KEY = Symbol('transactions-store');

/**
 * Client-side transaction store, seeded once from the layout's server-loaded
 * data and shared across every route via context. Tag edits update local
 * state optimistically and persist through a same-origin proxy to the real
 * backend (the browser can't reach it directly / read server-only env vars).
 *
 * A tag change can flip a transaction's `ignored` status (see the
 * transaction-ignore-rules feature) — that recompute happens server-side, so
 * after the tag/untag round-trips we also `invalidateAll()` to refresh
 * `+layout.server.ts`'s data. Combined with the `$effect`/`replaceAll` wiring
 * in `+layout.svelte`, this keeps series tables and charts (which all derive
 * from this store) in sync with the newly-ignored/un-ignored set, not just
 * the tag chip itself.
 */
export function createTransactionsStore(initial: Transaction[]) {
	let transactions = $state(initial);

	function findIndex(id: string): number {
		return transactions.findIndex((t) => t.id === id);
	}

	/** Adds a single hand-entered transaction — the "Add transaction"
	 * button's action. `invalidateAll()` rather than a local prepend since
	 * a matching ignore rule can affect it immediately (see `tag` below),
	 * and because it can belong to a series' date range/account filters
	 * this store's callers derive from `transactions` reactively. */
	async function createManual(input: {
		accountId: string;
		date: string;
		amount: number;
		name: string;
		merchantId?: string | null;
	}): Promise<{ ok: true } | { ok: false; error: string }> {
		const res = await fetch('/api/transactions', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				account_id: input.accountId,
				date: input.date,
				amount: input.amount,
				name: input.name,
				merchant_id: input.merchantId || null
			})
		});
		if (!res.ok) {
			return { ok: false, error: await res.text() };
		}
		await invalidateAll();
		return { ok: true };
	}

	async function tag(id: string, name: string, value: string) {
		const index = findIndex(id);
		if (index === -1) return;
		const tx = transactions[index];
		const otherTags = tx.tags.filter((t) => t.name !== name);
		transactions[index] = { ...tx, tags: [...otherTags, { name, value }] };

		const res = await fetch(`/api/transactions/${id}/tags`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ name, value })
		});
		if (!res.ok) {
			console.error(`Failed to tag transaction ${id}:`, await res.text());
			return;
		}
		const tags = await res.json();
		const current = findIndex(id);
		if (current !== -1) transactions[current] = { ...transactions[current], tags };
		await invalidateAll();
	}

	async function untag(id: string, name: string) {
		const index = findIndex(id);
		if (index === -1) return;
		const tx = transactions[index];
		transactions[index] = { ...tx, tags: tx.tags.filter((t) => t.name !== name) };

		const res = await fetch(`/api/transactions/${id}/tags/${encodeURIComponent(name)}`, {
			method: 'DELETE'
		});
		if (!res.ok) {
			console.error(`Failed to untag transaction ${id}:`, await res.text());
			return;
		}
		const tags = await res.json();
		const current = findIndex(id);
		if (current !== -1) transactions[current] = { ...transactions[current], tags };
		await invalidateAll();
	}

	function replaceAll(next: Transaction[]) {
		transactions = next;
	}

	return {
		get transactions() {
			return transactions;
		},
		createManual,
		tag,
		untag,
		replaceAll
	};
}

export type TransactionsStore = ReturnType<typeof createTransactionsStore>;

export function setTransactionsContext(store: TransactionsStore) {
	setContext(KEY, store);
}

export function getTransactionsContext(): TransactionsStore {
	const store = getContext<TransactionsStore>(KEY);
	if (!store)
		throw new Error('getTransactionsContext() called outside the layout that provides it');
	return store;
}
