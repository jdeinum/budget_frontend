<script lang="ts">
	import { untrack } from 'svelte';
	import type { EChartsCoreOption } from 'echarts/core';

	import KpiCard from '$lib/components/KpiCard.svelte';
	import SeriesEditor from '$lib/components/SeriesEditor.svelte';
	import AddTransaction from '$lib/components/AddTransaction.svelte';
	import Chart from '$lib/charts/Chart.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';

	import { createColorScheme } from '$lib/charts/color-scheme.svelte';
	import { CHART_PALETTE } from '$lib/charts/theme';
	import { buildCategoryBarOption } from '$lib/charts/categoryBarOption';
	import { buildCumulativeLineOption } from '$lib/charts/cumulativeLineOption';
	import {
		buildCategorySeries,
		computeTotals,
		cumulativeSpend,
		earliestDate,
		filterTransactions,
		toISODate,
		transactionsByDay
	} from '$lib/dashboard/analysis';
	import {
		cloneSeries,
		createSeries,
		parseTagKey,
		rangeForPreset,
		type Series
	} from '$lib/dashboard/series';
	import { getTransactionsContext } from '$lib/state/transactions.svelte';
	import { getAccountsContext } from '$lib/state/accounts.svelte';
	import { formatCurrency, formatDate } from '$lib/format';
	import PlusIcon from '@lucide/svelte/icons/plus';

	const store = getTransactionsContext();
	const accountsStore = getAccountsContext();
	const colorScheme = createColorScheme();
	const today = new Date();

	// Every series is the same shape — a date range plus which
	// accounts/tags it's scoped to, plus its own independent set of
	// per-transaction opt-outs (see each series' expandable transactions
	// table). There's no structurally-special "primary" series; by
	// convention seriesList[0] drives the KPIs below and is the only one
	// that can't be removed.
	let seriesList = $state<Series[]>(
		untrack(() => {
			const dateRange = rangeForPreset(
				'90d',
				today,
				earliestDate(store.transactions) ?? toISODate(today)
			);
			return [
				createSeries({
					label: `${formatDate(dateRange.start)} – ${formatDate(dateRange.end)}`,
					color: CHART_PALETTE[0],
					preset: '90d',
					dateRange,
					accountIds: accountsStore.accounts.map((a) => a.id)
				})
			];
		})
	);
	let nextColorIndex = 1;

	function addSeries(next: Series) {
		next.color = CHART_PALETTE[nextColorIndex % CHART_PALETTE.length];
		nextColorIndex += 1;
		seriesList = [...seriesList, next];
	}

	function removeSeries(id: string) {
		seriesList = seriesList.filter((s) => s.id !== id);
	}

	let primary = $derived(seriesList[0]);

	// --- Primary series drives the KPIs -------------------------------------

	let primaryFiltered = $derived(
		filterTransactions(store.transactions, {
			startDate: primary.dateRange.start,
			endDate: primary.dateRange.end,
			accountIds: new Set(primary.accountIds),
			tags: primary.includeTagKeys.map(parseTagKey),
			excludeTags: primary.excludeTagKeys.map(parseTagKey),
			query: primary.query
		})
	);
	let primaryTracked = $derived(
		primaryFiltered.filter((tx) => !primary.excludedTransactionIds.includes(tx.id))
	);
	let totals = $derived(
		computeTotals(primaryTracked, primary.dateRange.start, primary.dateRange.end)
	);

	// --- All series drive the charts, each respecting only its own exclusions ---

	function seriesTransactions(s: Series) {
		const f = filterTransactions(store.transactions, {
			startDate: s.dateRange.start,
			endDate: s.dateRange.end,
			accountIds: new Set(s.accountIds),
			tags: s.includeTagKeys.map(parseTagKey),
			excludeTags: s.excludeTagKeys.map(parseTagKey),
			query: s.query
		});
		return f.filter((tx) => !s.excludedTransactionIds.includes(tx.id));
	}

	let barSeriesInputs = $derived(
		seriesList.map((s) => {
			const txs = seriesTransactions(s);
			const categoryTotals = buildCategorySeries(
				txs,
				s.dateRange.start,
				s.dateRange.end
			).series.map((c) => ({
				category: c.category,
				total: c.total
			}));
			return { label: s.label, color: s.color, categoryTotals };
		})
	);
	let lineSeriesInputs = $derived(
		seriesList.map((s) => {
			const txs = seriesTransactions(s);
			const cum = cumulativeSpend(txs, s.dateRange.start, s.dateRange.end);
			return {
				label: s.label,
				color: s.color,
				cumulative: cum.data,
				dateLabels: cum.labels,
				dates: cum.dates,
				transactionsByDate: transactionsByDay(txs)
			};
		})
	);

	let barChartOption = $derived<EChartsCoreOption>(
		buildCategoryBarOption(barSeriesInputs, colorScheme.isDark)
	);
	let cumulativeChartOption = $derived<EChartsCoreOption>(
		buildCumulativeLineOption(lineSeriesInputs, colorScheme.isDark)
	);
</script>

<svelte:head>
	<title>nil · Transactions</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-6 px-4 py-8">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<h1 class="text-2xl font-semibold tracking-tight">Transactions</h1>
		<AddTransaction />
	</div>

	<div class="space-y-4">
		{#each seriesList as series, i (series.id)}
			<SeriesEditor
				{series}
				removable={i > 0}
				onRemove={() => removeSeries(series.id)}
				onAdd={addSeries}
			/>
		{/each}
	</div>

	<Button
		variant="outline"
		size="sm"
		class="gap-1.5"
		onclick={() => addSeries(cloneSeries(primary))}
	>
		<PlusIcon class="size-4" />
		Add series
	</Button>

	<div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
		<KpiCard
			label="Total spent"
			value={formatCurrency(totals.totalSpent, 'USD')}
			accent="negative"
		/>
		<KpiCard
			label="Total income"
			value={formatCurrency(totals.totalIncome, 'USD')}
			accent="positive"
		/>
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
			<Card.Description>
				{#if seriesList.length > 1}
					Comparing {seriesList.length} series · grouped by category
				{:else}
					Total spend per category across the selected timeframe
				{/if}
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<Chart option={barChartOption} class="h-96 w-full" />
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Spending pace</Card.Title>
			<Card.Description>
				{#if seriesList.length > 1}
					Cumulative spend by day of period, {seriesList.length} series compared
				{:else}
					Cumulative spend across the selected timeframe
				{/if}
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<Chart option={cumulativeChartOption} class="h-72 w-full" />
		</Card.Content>
	</Card.Root>
</div>
