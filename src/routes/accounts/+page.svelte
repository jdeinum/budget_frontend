<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import AccountsTable from '$lib/components/AccountsTable.svelte';
	import ConnectBank from '$lib/components/ConnectBank.svelte';
	import SyncButton from '$lib/components/SyncButton.svelte';
	import ConnectedBanks from '$lib/components/ConnectedBanks.svelte';
	import ImportStatement from '$lib/components/ImportStatement.svelte';
	import CreateAccount from '$lib/components/CreateAccount.svelte';
	import { getTransactionsContext } from '$lib/state/transactions.svelte';
	import { getAccountsContext } from '$lib/state/accounts.svelte';
	import { summarizeAccounts } from '$lib/dashboard/accounts';
	import { matchesSearch } from '$lib/dashboard/analysis';
	import { debouncedInput } from '$lib/debounce.svelte';
	import SearchIcon from '@lucide/svelte/icons/search';

	const store = getTransactionsContext();
	const accountsStore = getAccountsContext();

	let allSummaries = $derived(summarizeAccounts(accountsStore.accounts, store.transactions));

	let query = $state('');
	const search = debouncedInput('', (v) => (query = v));
	let summaries = $derived(
		allSummaries.filter((a) =>
			matchesSearch(`${a.name} ${a.tags.map((t) => `${t.name} ${t.value}`).join(' ')}`, query)
		)
	);
</script>

<svelte:head>
	<title>nil · Accounts</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-6 px-4 py-8">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">Accounts</h1>
			<p class="text-sm text-muted-foreground">{summaries.length} accounts linked</p>
		</div>

		<div class="flex items-start gap-2">
			<SyncButton />
			<ImportStatement />
			<CreateAccount />
			<ConnectBank />
		</div>
	</div>

	<div class="relative">
		<SearchIcon
			class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
		/>
		<Input
			value={search.value}
			oninput={(e) => (search.value = e.currentTarget.value)}
			placeholder="Search accounts…"
			class="pl-8"
		/>
	</div>

	<Card.Root>
		<Card.Content class="p-0">
			<AccountsTable
				accounts={summaries}
				onFilterByTag={(tag) => (search.value = `${tag.name} ${tag.value}`)}
			/>
		</Card.Content>
	</Card.Root>

	<ConnectedBanks />
</div>
