<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import MerchantsTable from '$lib/components/MerchantsTable.svelte';
	import { getTransactionsContext } from '$lib/state/transactions.svelte';
	import { getMerchantsContext } from '$lib/state/merchants.svelte';
	import { summarizeMerchants } from '$lib/dashboard/merchants';
	import { matchesSearch } from '$lib/dashboard/analysis';
	import { debouncedInput } from '$lib/debounce.svelte';
	import SearchIcon from '@lucide/svelte/icons/search';

	const store = getTransactionsContext();
	const merchantsStore = getMerchantsContext();
	let allMerchants = $derived(summarizeMerchants(merchantsStore.merchants, store.transactions));

	let query = $state('');
	const search = debouncedInput('', (v) => (query = v));
	let merchants = $derived(
		allMerchants.filter((m) =>
			matchesSearch(`${m.name} ${m.tags.map((t) => `${t.name} ${t.value}`).join(' ')}`, query)
		)
	);
</script>

<svelte:head>
	<title>nil · Merchants</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-6 px-4 py-8">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">Merchants</h1>
		<p class="text-muted-foreground text-sm">{merchants.length} merchants</p>
	</div>

	<div class="relative">
		<SearchIcon class="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
		<Input
			value={search.value}
			oninput={(e) => (search.value = e.currentTarget.value)}
			placeholder="Search merchants…"
			class="pl-8"
		/>
	</div>

	<Card.Root>
		<Card.Content class="p-0">
			<MerchantsTable {merchants} onFilterByTag={(tag) => (search.value = `${tag.name} ${tag.value}`)} />
		</Card.Content>
	</Card.Root>
</div>
