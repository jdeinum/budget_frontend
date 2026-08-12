<script lang="ts">
	import type { EChartsCoreOption } from 'echarts/core';

	import KpiCard from '$lib/components/KpiCard.svelte';
	import Chart from '$lib/charts/Chart.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { buttonVariants } from '$lib/components/ui/button/index.js';

	import { createColorScheme } from '$lib/charts/color-scheme.svelte';
	import { CHART_PALETTE } from '$lib/charts/theme';
	import { buildCategoryBarOption } from '$lib/charts/categoryBarOption';
	import { buildCategorySeries, computeTotals, filterTransactions, toISODate } from '$lib/dashboard/analysis';
	import { getTransactionsContext } from '$lib/state/transactions.svelte';
	import { formatCurrency } from '$lib/format';

	const store = getTransactionsContext();
	const colorScheme = createColorScheme();

	const now = new Date();
	const monthStart = toISODate(new Date(now.getFullYear(), now.getMonth(), 1));
	const monthEnd = toISODate(now);
	const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

	let filtered = $derived(
		filterTransactions(store.transactions, {
			startDate: monthStart,
			endDate: monthEnd,
			accountIds: null,
			tags: [],
			excludeTags: [],
			query: ''
		})
	);

	let totals = $derived(computeTotals(filtered, monthStart, monthEnd));
	let categoryChart = $derived(buildCategorySeries(filtered, monthStart, monthEnd));

	let barChartOption = $derived<EChartsCoreOption>(
		buildCategoryBarOption(
			[
				{
					label: monthLabel,
					color: CHART_PALETTE[0],
					categoryTotals: categoryChart.series.map((c) => ({ category: c.category, total: c.total }))
				}
			],
			colorScheme.isDark
		)
	);
</script>

<svelte:head>
	<title>nil · Overview</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-6 px-4 py-8">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">Overview</h1>
			<p class="text-muted-foreground text-sm">{monthLabel} · {filtered.length} transactions</p>
		</div>
		<a href="/transactions" class={buttonVariants({ variant: 'outline' })}>View all transactions</a>
	</div>

	<div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
		<KpiCard label="Spent this month" value={formatCurrency(totals.totalSpent, 'USD')} accent="negative" />
		<KpiCard label="Income this month" value={formatCurrency(totals.totalIncome, 'USD')} accent="positive" />
		<KpiCard
			label="Net"
			value={formatCurrency(totals.net, 'USD')}
			accent={totals.net >= 0 ? 'positive' : 'negative'}
		/>
		<KpiCard label="Avg per day" value={formatCurrency(totals.avgPerDay, 'USD')} />
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Spending by category</Card.Title>
			<Card.Description>Month to date</Card.Description>
		</Card.Header>
		<Card.Content>
			<Chart option={barChartOption} class="h-96 w-full" />
		</Card.Content>
	</Card.Root>
</div>
