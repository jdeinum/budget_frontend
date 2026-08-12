import { getContext, setContext } from 'svelte';
import { invalidateAll } from '$app/navigation';
import type { Account, AccountInstitution, ImportSummary } from '$lib/types';

const KEY = Symbol('accounts-store');

/**
 * Client-side account store, seeded once from the layout's server-loaded
 * data. Plaid accounts are auto-created server-side by sync (see
 * `ConnectBank.svelte`); manual (statement-import) accounts are created
 * here via `createManual`. Beyond that, this store supports renaming and
 * tagging an existing account, both optimistic-then-persisted like the
 * transactions and merchants stores. `tag`/`untag` additionally
 * `invalidateAll()` — an account tag can match a transaction-ignore rule,
 * unlike a rename, which rules never match on — see transactions.svelte.ts.
 */
export function createAccountsStore(initial: Account[]) {
	let accounts = $state(initial);

	function findIndex(id: string): number {
		return accounts.findIndex((a) => a.id === id);
	}

	async function createManual(
		source: AccountInstitution,
		name: string
	): Promise<{ ok: true; account: Account } | { ok: false; error: string }> {
		const res = await fetch('/api/accounts', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ source, name })
		});
		if (!res.ok) {
			return { ok: false, error: await res.text() };
		}
		const account: Account = await res.json();
		accounts = [...accounts, account];
		return { ok: true, account };
	}

	async function deleteManual(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
		const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
		if (!res.ok) {
			return { ok: false, error: await res.text() };
		}
		accounts = accounts.filter((a) => a.id !== id);
		await invalidateAll();
		return { ok: true };
	}

	/** Uploads one or more statement exports into `accountId`, matched
	 * against the account's own declared institution; rows already
	 * imported are skipped rather than re-added. Triggers `invalidateAll()`
	 * on success since it can add transactions the transactions store
	 * needs to pick up. */
	async function uploadStatement(
		accountId: string,
		files: File[]
	): Promise<{ ok: true; summary: ImportSummary } | { ok: false; error: string }> {
		const body = new FormData();
		for (const file of files) body.append('file', file, file.name);
		const res = await fetch(`/api/accounts/${accountId}/statements`, { method: 'POST', body });
		if (!res.ok) {
			return { ok: false, error: await res.text() };
		}
		const summary: ImportSummary = await res.json();
		await invalidateAll();
		return { ok: true, summary };
	}

	async function rename(id: string, name: string) {
		const index = findIndex(id);
		if (index === -1) return;
		const previousName = accounts[index].name;
		accounts[index] = { ...accounts[index], name };

		const res = await fetch(`/api/accounts/${id}/rename`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ name })
		});
		if (!res.ok) {
			console.error(`Failed to rename account ${id}:`, await res.text());
			const current = findIndex(id);
			if (current !== -1) accounts[current] = { ...accounts[current], name: previousName };
		}
	}

	async function tag(id: string, name: string, value: string) {
		const index = findIndex(id);
		if (index === -1) return;
		const a = accounts[index];
		const otherTags = a.tags.filter((t) => t.name !== name);
		accounts[index] = { ...a, tags: [...otherTags, { name, value }] };

		const res = await fetch(`/api/accounts/${id}/tags`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ name, value })
		});
		if (!res.ok) {
			console.error(`Failed to tag account ${id}:`, await res.text());
			return;
		}
		const tags = await res.json();
		const current = findIndex(id);
		if (current !== -1) accounts[current] = { ...accounts[current], tags };
		await invalidateAll();
	}

	async function untag(id: string, name: string) {
		const index = findIndex(id);
		if (index === -1) return;
		const a = accounts[index];
		accounts[index] = { ...a, tags: a.tags.filter((t) => t.name !== name) };

		const res = await fetch(`/api/accounts/${id}/tags/${encodeURIComponent(name)}`, {
			method: 'DELETE'
		});
		if (!res.ok) {
			console.error(`Failed to untag account ${id}:`, await res.text());
			return;
		}
		const tags = await res.json();
		const current = findIndex(id);
		if (current !== -1) accounts[current] = { ...accounts[current], tags };
		await invalidateAll();
	}

	function replaceAll(next: Account[]) {
		accounts = next;
	}

	return {
		get accounts() {
			return accounts;
		},
		createManual,
		deleteManual,
		uploadStatement,
		rename,
		tag,
		untag,
		replaceAll
	};
}

export type AccountsStore = ReturnType<typeof createAccountsStore>;

export function setAccountsContext(store: AccountsStore) {
	setContext(KEY, store);
}

export function getAccountsContext(): AccountsStore {
	const store = getContext<AccountsStore>(KEY);
	if (!store) throw new Error('getAccountsContext() called outside the layout that provides it');
	return store;
}
