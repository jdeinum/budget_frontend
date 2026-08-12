<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Navbar from '$lib/components/Navbar.svelte';
	import { createTransactionsStore, setTransactionsContext } from '$lib/state/transactions.svelte';
	import { createMerchantsStore, setMerchantsContext } from '$lib/state/merchants.svelte';
	import { createAccountsStore, setAccountsContext } from '$lib/state/accounts.svelte';
	import { createItemsStore, setItemsContext } from '$lib/state/items.svelte';
	import { untrack } from 'svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	// Seeded once when the layout mounts; persists across client-side
	// navigation between routes since they all share this one layout instance.
	const transactionsStore = createTransactionsStore(untrack(() => data.transactions));
	setTransactionsContext(transactionsStore);
	const merchantsStore = createMerchantsStore(untrack(() => data.merchants));
	setMerchantsContext(merchantsStore);
	const accountsStore = createAccountsStore(untrack(() => data.accounts));
	setAccountsContext(accountsStore);
	const itemsStore = createItemsStore(untrack(() => data.items));
	setItemsContext(itemsStore);

	// A server-side change can affect many rows at once outside of any
	// store's own optimistic tag/rename methods — a transaction-rule edit
	// flips `ignored` on a batch of transactions, and connecting a new bank
	// (`ConnectBank.svelte`) creates accounts/merchants/transactions that
	// didn't exist in this layout's original data. Both call `invalidateAll()`
	// afterward, which reruns `+layout.server.ts` and updates `data` — these
	// effects resync every store from that fresh data. They only fire when
	// `data.*` actually changes (a fresh `load`), not on a store's own
	// in-place mutations, which don't touch `data`.
	$effect(() => {
		transactionsStore.replaceAll(data.transactions);
	});
	$effect(() => {
		merchantsStore.replaceAll(data.merchants);
	});
	$effect(() => {
		accountsStore.replaceAll(data.accounts);
	});
	$effect(() => {
		itemsStore.replaceAll(data.items);
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="bg-background min-h-screen">
	<Navbar />
	<main>
		{@render children()}
	</main>
</div>
