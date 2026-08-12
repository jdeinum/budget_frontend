<script lang="ts">
	import {
		createTable,
		tableFeatures,
		rowSortingFeature,
		createSortedRowModel,
		sortFn_alphanumeric,
		sortFn_basic,
		renderComponent,
		FlexRender
	} from '@tanstack/svelte-table';
	import TagEditor from '$lib/components/TagEditor.svelte';
	import AccountNameCell from '$lib/components/AccountNameCell.svelte';
	import { cn } from '$lib/utils';
	import { formatCurrency, formatDate } from '$lib/format';
	import { getAccountsContext } from '$lib/state/accounts.svelte';
	import type { AccountSummary } from '$lib/dashboard/accounts';
	import type { TagValue } from '$lib/types';

	let {
		accounts,
		onFilterByTag
	}: { accounts: AccountSummary[]; onFilterByTag?: (tag: TagValue) => void } = $props();
	const accountsStore = getAccountsContext();

	const features = tableFeatures({
		rowSortingFeature,
		sortedRowModel: createSortedRowModel(),
		sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic }
	});

	const columns = [
		{
			accessorKey: 'name',
			header: 'Account',
			sortFn: 'alphanumeric' as const,
			cell: (info: { row: { original: AccountSummary } }) =>
				renderComponent(AccountNameCell, {
					name: info.row.original.name,
					onRename: (name: string) => accountsStore.rename(info.row.original.id, name)
				})
		},
		{
			id: 'transactionCount',
			accessorFn: (row: AccountSummary) => row.transactionCount,
			header: 'Transactions',
			sortFn: 'basic' as const
		},
		{
			id: 'totalSpent',
			accessorFn: (row: AccountSummary) => row.totalSpent,
			header: 'Total spent',
			sortFn: 'basic' as const,
			cell: (info: { getValue: () => unknown }) => formatCurrency(info.getValue() as number, 'USD')
		},
		{
			id: 'totalIncome',
			accessorFn: (row: AccountSummary) => row.totalIncome,
			header: 'Total income',
			sortFn: 'basic' as const,
			cell: (info: { getValue: () => unknown }) => formatCurrency(info.getValue() as number, 'USD')
		},
		{
			id: 'lastDate',
			accessorFn: (row: AccountSummary) => row.lastDate ?? '',
			header: 'Last activity',
			sortFn: 'alphanumeric' as const,
			cell: (info: { getValue: () => unknown }) => {
				const v = info.getValue() as string;
				return v ? formatDate(v) : '—';
			}
		},
		{
			id: 'actions',
			header: '',
			enableSorting: false,
			cell: (info: { row: { original: AccountSummary } }) => {
				const id = info.row.original.id;
				return renderComponent(TagEditor, {
					tags: info.row.original.tags,
					onTag: (name: string, value: string) => accountsStore.tag(id, name, value),
					onUntag: (name: string) => accountsStore.untag(id, name),
					onFilterByTag
				});
			}
		}
	];

	const table = createTable({
		features,
		columns,
		get data() {
			return accounts;
		}
	});

	function headerClass(columnId: string, canSort: boolean): string {
		const base =
			columnId === 'transactionCount' || columnId === 'totalSpent' || columnId === 'totalIncome' || columnId === 'actions'
				? 'px-3 py-2 text-right'
				: 'px-3 py-2';
		return canSort ? cn(base, 'cursor-pointer select-none') : base;
	}

	function cellClass(columnId: string): string {
		if (columnId === 'actions') return 'px-3 py-2 text-right';
		if (columnId === 'transactionCount') return 'px-3 py-2 text-right tabular-nums';
		if (columnId === 'totalSpent') {
			return 'px-3 py-2 text-right font-medium tabular-nums whitespace-nowrap text-rose-600 dark:text-rose-400';
		}
		if (columnId === 'totalIncome') {
			return 'px-3 py-2 text-right font-medium tabular-nums whitespace-nowrap text-emerald-600 dark:text-emerald-400';
		}
		if (columnId === 'name') return 'px-3 py-2 font-medium';
		return 'text-muted-foreground px-3 py-2';
	}
</script>

<div class="overflow-auto rounded-md border">
	<table class="w-full text-sm">
		<thead class="bg-card">
			{#each table.getHeaderGroups() as group (group.id)}
				<tr class="text-muted-foreground border-b text-left text-xs uppercase">
					{#each group.headers as header (header.id)}
						<th
							class={headerClass(header.column.id, header.column.getCanSort())}
							onclick={header.column.getToggleSortingHandler()}
						>
							{#if !header.isPlaceholder}
								<FlexRender {header} />
								{#if header.column.getIsSorted() === 'asc'}
									↑
								{:else if header.column.getIsSorted() === 'desc'}
									↓
								{/if}
							{/if}
						</th>
					{/each}
				</tr>
			{/each}
		</thead>
		<tbody class="divide-y">
			{#each table.getRowModel().rows as row (row.id)}
				<tr>
					{#each row.getAllCells() as cell (cell.id)}
						<td class={cellClass(cell.column.id)}><FlexRender {cell} /></td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
	{#if accounts.length === 0}
		<p class="text-muted-foreground py-12 text-center text-sm">No accounts yet.</p>
	{/if}
</div>
