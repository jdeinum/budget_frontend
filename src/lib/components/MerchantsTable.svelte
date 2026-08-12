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
	import { cn } from '$lib/utils';
	import { formatCategory, formatCurrency, formatDate } from '$lib/format';
	import { getMerchantsContext } from '$lib/state/merchants.svelte';
	import type { MerchantSummary } from '$lib/dashboard/merchants';
	import type { TagValue } from '$lib/types';

	let {
		merchants,
		onFilterByTag
	}: { merchants: MerchantSummary[]; onFilterByTag?: (tag: TagValue) => void } = $props();
	const merchantsStore = getMerchantsContext();

	const features = tableFeatures({
		rowSortingFeature,
		sortedRowModel: createSortedRowModel(),
		sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic }
	});

	const columns = [
		{ accessorKey: 'name', header: 'Merchant', sortFn: 'alphanumeric' as const },
		{
			id: 'category',
			accessorFn: (row: MerchantSummary) => row.category ?? '',
			header: 'Category',
			sortFn: 'alphanumeric' as const,
			cell: (info: { getValue: () => unknown }) => formatCategory((info.getValue() as string) || null)
		},
		{
			id: 'transactionCount',
			accessorFn: (row: MerchantSummary) => row.transactionCount,
			header: 'Transactions',
			sortFn: 'basic' as const
		},
		{
			id: 'totalSpent',
			accessorFn: (row: MerchantSummary) => row.totalSpent,
			header: 'Total spent',
			sortFn: 'basic' as const,
			cell: (info: { getValue: () => unknown }) => formatCurrency(info.getValue() as number, 'USD')
		},
		{
			id: 'totalIncome',
			accessorFn: (row: MerchantSummary) => row.totalIncome,
			header: 'Total income',
			sortFn: 'basic' as const,
			cell: (info: { getValue: () => unknown }) => formatCurrency(info.getValue() as number, 'USD')
		},
		{
			id: 'lastDate',
			accessorFn: (row: MerchantSummary) => row.lastDate ?? '',
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
			cell: (info: { row: { original: MerchantSummary } }) => {
				const id = info.row.original.id;
				return renderComponent(TagEditor, {
					tags: info.row.original.tags,
					onTag: (name: string, value: string) => merchantsStore.tag(id, name, value),
					onUntag: (name: string) => merchantsStore.untag(id, name),
					onFilterByTag
				});
			}
		}
	];

	const table = createTable({
		features,
		columns,
		get data() {
			return merchants;
		}
	});

	function headerClass(columnId: string, canSort: boolean): string {
		const base =
			columnId === 'transactionCount' ||
			columnId === 'totalSpent' ||
			columnId === 'totalIncome' ||
			columnId === 'actions'
				? 'px-3 py-2 text-right'
				: 'px-3 py-2';
		return canSort ? cn(base, 'cursor-pointer select-none') : base;
	}

	function cellClass(columnId: string): string {
		if (columnId === 'actions') return 'px-3 py-2 text-right';
		if (columnId === 'transactionCount') return 'px-3 py-2 text-right tabular-nums';
		if (columnId === 'totalSpent') {
			return 'px-3 py-2 text-right font-medium tabular-nums whitespace-nowrap';
		}
		if (columnId === 'totalIncome') {
			return 'px-3 py-2 text-right font-medium tabular-nums whitespace-nowrap text-emerald-600 dark:text-emerald-400';
		}
		if (columnId === 'name') return 'px-3 py-2 font-medium';
		return 'text-muted-foreground px-3 py-2';
	}
</script>

<div class="max-h-[40rem] overflow-auto rounded-md border">
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
				<tr>
					{#each row.getAllCells() as cell (cell.id)}
						<td class={cellClass(cell.column.id)}><FlexRender {cell} /></td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
	{#if merchants.length === 0}
		<p class="text-muted-foreground py-12 text-center text-sm">No merchants yet.</p>
	{/if}
</div>
