<script lang="ts">
	import {
		createTable,
		tableFeatures,
		rowSortingFeature,
		createSortedRowModel,
		sortFn_alphanumeric,
		sortFn_basic,
		sortFn_datetime,
		renderComponent,
		FlexRender
	} from '@tanstack/svelte-table';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import TagEditor from '$lib/components/TagEditor.svelte';
	import { cn } from '$lib/utils';
	import { formatCategory, formatCurrency, formatDate } from '$lib/format';
	import { getTag, type Transaction, type TagValue } from '$lib/types';
	import { getTransactionsContext } from '$lib/state/transactions.svelte';

	let {
		transactions,
		accountNameById,
		excludedIds,
		onToggleTracked,
		onFilterByTag
	}: {
		transactions: Transaction[];
		accountNameById: Map<string, string>;
		/** Ids currently excluded from the KPIs/charts above the table. */
		excludedIds: Set<string>;
		onToggleTracked: (id: string) => void;
		onFilterByTag?: (tag: TagValue) => void;
	} = $props();

	const store = getTransactionsContext();

	const features = tableFeatures({
		rowSortingFeature,
		sortedRowModel: createSortedRowModel(),
		sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic, datetime: sortFn_datetime }
	});

	const columns = [
		{
			accessorKey: 'date',
			header: 'Date',
			sortFn: 'datetime' as const,
			cell: (info: { getValue: () => unknown }) => formatDate(info.getValue() as string)
		},
		{
			id: 'merchant',
			accessorFn: (row: Transaction) => row.merchant_name ?? row.name ?? 'Unknown',
			header: 'Merchant',
			sortFn: 'alphanumeric' as const
		},
		{
			id: 'category',
			accessorFn: (row: Transaction) => getTag(row.tags, 'category') ?? '',
			header: 'Category',
			sortFn: 'alphanumeric' as const,
			cell: (info: { getValue: () => unknown }) => formatCategory((info.getValue() as string) || null)
		},
		{
			id: 'account',
			accessorFn: (row: Transaction) => accountNameById.get(row.account_id) ?? row.account_id,
			header: 'Account',
			sortFn: 'alphanumeric' as const
		},
		{
			accessorKey: 'amount',
			header: 'Amount',
			sortFn: 'basic' as const,
			cell: (info: { getValue: () => unknown; row: { original: Transaction } }) =>
				formatCurrency(info.getValue() as number, info.row.original.iso_currency_code)
		},
		{
			id: 'actions',
			header: '',
			enableSorting: false,
			cell: (info: { row: { original: Transaction } }) => {
				const id = info.row.original.id;
				return renderComponent(TagEditor, {
					tags: info.row.original.tags,
					onTag: (name: string, value: string) => store.tag(id, name, value),
					onUntag: (name: string) => store.untag(id, name),
					onFilterByTag
				});
			}
		}
	];

	const table = createTable({
		features,
		columns,
		get data() {
			return transactions;
		}
	});

	function headerClass(columnId: string, canSort: boolean): string {
		const base = columnId === 'amount' || columnId === 'actions' ? 'px-3 py-2 text-right' : 'px-3 py-2';
		return canSort ? cn(base, 'cursor-pointer select-none') : base;
	}

	function cellClass(columnId: string, amount: number): string {
		if (columnId === 'amount') {
			return cn(
				'px-3 py-2 text-right font-medium whitespace-nowrap',
				amount < 0 && 'text-emerald-600 dark:text-emerald-400'
			);
		}
		if (columnId === 'actions') return 'px-3 py-2 text-right';
		if (columnId === 'date') return 'text-muted-foreground px-3 py-2 whitespace-nowrap';
		return 'px-3 py-2';
	}
</script>

<div class="max-h-[32rem] overflow-auto rounded-md border">
	<table class="w-full text-sm">
		<thead class="bg-card sticky top-0">
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
				<tr
					class={cn(
						'hover:bg-muted/40 cursor-pointer transition-opacity',
						excludedIds.has(row.original.id) && 'opacity-40'
					)}
					title={excludedIds.has(row.original.id)
						? 'Excluded from totals/charts — click to include'
						: 'Click to exclude from totals/charts'}
					onclick={() => onToggleTracked(row.original.id)}
				>
					{#each row.getAllCells() as cell (cell.id)}
						<td
							class={cellClass(cell.column.id, row.original.amount)}
							onclick={cell.column.id === 'actions' ? (e) => e.stopPropagation() : undefined}
						>
							<FlexRender {cell} />
							{#if cell.column.id === 'merchant' && row.original.pending}
								<Badge variant="outline" class="ml-2">Pending</Badge>
							{/if}
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
	{#if transactions.length === 0}
		<p class="text-muted-foreground py-12 text-center text-sm">No transactions match these filters.</p>
	{/if}
</div>
