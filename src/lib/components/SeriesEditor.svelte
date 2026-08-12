<script lang="ts">
	import { untrack } from 'svelte';
	import { parseDate as parseCalendarDate, type DateValue } from '@internationalized/date';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import { RangeCalendar } from '$lib/components/ui/range-calendar/index.js';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import MultiSelect, { type MultiSelectOption } from '$lib/components/MultiSelect.svelte';
	import TransactionsTable from '$lib/components/TransactionsTable.svelte';
	import { cn } from '$lib/utils';
	import { debouncedInput } from '$lib/debounce.svelte';
	import { formatCategory, formatDate } from '$lib/format';
	import { distinctTags, earliestDate, filterTransactions, toISODate } from '$lib/dashboard/analysis';
	import {
		PRESET_OPTIONS,
		cloneSeries,
		monthLabel,
		monthRangeForValue,
		parseTagKey,
		previousMonthValue,
		previousPeriod,
		rangeForPreset,
		recentMonthOptions,
		type Preset,
		type Series
	} from '$lib/dashboard/series';
	import { getTransactionsContext } from '$lib/state/transactions.svelte';
	import { getAccountsContext } from '$lib/state/accounts.svelte';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import HistoryIcon from '@lucide/svelte/icons/history';
	import SearchIcon from '@lucide/svelte/icons/search';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';

	let {
		series,
		removable = false,
		onRemove,
		onAdd
	}: {
		series: Series;
		removable?: boolean;
		onRemove?: () => void;
		onAdd: (next: Series) => void;
	} = $props();

	const store = getTransactionsContext();
	const accountsStore = getAccountsContext();
	const today = new Date();

	let accountOptions = $derived<MultiSelectOption[]>(
		accountsStore.accounts.map((a) => ({ value: a.id, label: a.name }))
	);
	// Options come from the full unfiltered dataset so the picker doesn't
	// shrink as filters narrow the visible transactions.
	let tagOptions = $derived<MultiSelectOption[]>(
		distinctTags(store.transactions).map((t) => ({
			value: `${t.name}:${t.value}`,
			label: formatCategory(t.value),
			group: formatCategory(t.name)
		}))
	);

	function relabel() {
		if (series.labelIsCustom) return;
		series.label =
			series.preset === 'month' && series.monthValue
				? monthLabel(series.monthValue)
				: `${formatDate(series.dateRange.start)} – ${formatDate(series.dateRange.end)}`;
	}

	function onLabelInput(value: string) {
		if (value.trim() === '') {
			series.labelIsCustom = false;
			relabel();
		} else {
			series.label = value;
			series.labelIsCustom = true;
		}
	}

	function selectPreset(p: Exclude<Preset, 'month' | 'custom'>) {
		series.preset = p;
		series.monthValue = '';
		series.dateRange = rangeForPreset(p, today, earliestDate(store.transactions) ?? toISODate(today));
		relabel();
	}

	const monthOptions = recentMonthOptions(24, today);

	function selectMonth(value: string) {
		if (!value) return;
		series.preset = 'month';
		series.monthValue = value;
		series.dateRange = monthRangeForValue(value, today);
		relabel();
	}

	let customRangeOpen = $state(false);
	let calendarValue = $state<{ start: DateValue | undefined; end: DateValue | undefined }>({
		start: undefined,
		end: undefined
	});
	let calendarPlaceholder = $state<DateValue>(parseCalendarDate(toISODate(today)));

	function applyCustomRange() {
		if (!calendarValue.start || !calendarValue.end) return;
		series.preset = 'custom';
		series.monthValue = '';
		series.dateRange = { start: calendarValue.start.toString(), end: calendarValue.end.toString() };
		relabel();
		customRangeOpen = false;
	}

	function duplicate() {
		onAdd(cloneSeries(series));
	}

	function comparePrevious() {
		// Always an auto-generated label for the shifted period, even if this
		// series' own label was customized — the two periods are different
		// enough that reusing the same custom name would be confusing.
		if (series.preset === 'month' && series.monthValue) {
			const prevValue = previousMonthValue(series.monthValue);
			onAdd(
				cloneSeries(series, {
					monthValue: prevValue,
					dateRange: monthRangeForValue(prevValue, today),
					label: monthLabel(prevValue),
					labelIsCustom: false
				})
			);
		} else {
			const range = previousPeriod(series.dateRange);
			onAdd(
				cloneSeries(series, {
					preset: 'custom',
					monthValue: '',
					dateRange: range,
					label: `${formatDate(range.start)} – ${formatDate(range.end)}`,
					labelIsCustom: false
				})
			);
		}
	}

	// --- This series' own transactions (independent of every other series') ---

	let tableOpen = $state(false);

	let seriesFiltered = $derived(
		filterTransactions(store.transactions, {
			startDate: series.dateRange.start,
			endDate: series.dateRange.end,
			accountIds: new Set(series.accountIds),
			tags: series.includeTagKeys.map(parseTagKey),
			excludeTags: series.excludeTagKeys.map(parseTagKey),
			query: series.query
		})
	);
	let excludedIdSet = $derived(new Set(series.excludedTransactionIds));
	const search = debouncedInput(untrack(() => series.query), (v) => (series.query = v));
	let accountNameById = $derived(new Map(accountsStore.accounts.map((a) => [a.id, a.name])));

	function toggleTracked(id: string) {
		series.excludedTransactionIds = series.excludedTransactionIds.includes(id)
			? series.excludedTransactionIds.filter((x) => x !== id)
			: [...series.excludedTransactionIds, id];
	}
</script>

<Card.Root>
	<Card.Content class="space-y-4">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<div class="flex min-w-0 items-center gap-2">
				<span class="size-2.5 shrink-0 rounded-full" style="background-color: {series.color}"></span>
				<Input
					value={series.label}
					oninput={(e) => onLabelInput(e.currentTarget.value)}
					placeholder="Series name"
					title="Custom name shown on the charts — clear it to go back to the auto-generated date range"
					class="h-7 w-56 border-transparent bg-transparent px-1.5 text-sm font-medium shadow-none hover:border-input focus-visible:border-input"
				/>
			</div>
			<div class="flex items-center gap-1">
				<Button variant="ghost" size="sm" class="gap-1.5" onclick={comparePrevious}>
					<HistoryIcon class="size-4" />
					Previous period
				</Button>
				<Button variant="ghost" size="sm" class="gap-1.5" onclick={duplicate}>
					<CopyIcon class="size-4" />
					Duplicate
				</Button>
				{#if removable}
					<Button
						variant="ghost"
						size="sm"
						onclick={onRemove}
						class="text-muted-foreground hover:text-destructive"
						aria-label="Remove series"
					>
						<Trash2Icon class="size-4" />
					</Button>
				{/if}
			</div>
		</div>

		<div class="flex flex-wrap items-end gap-4">
			<div>
				<p class="mb-2 text-sm font-medium">Time frame</p>
				<div class="flex flex-wrap items-center gap-2">
					<ToggleGroup.Root
						type="single"
						value={series.preset === 'custom' || series.preset === 'month' ? '' : series.preset}
						onValueChange={(v: string) => v && selectPreset(v as Exclude<Preset, 'month' | 'custom'>)}
						class="flex-wrap justify-start"
					>
						{#each PRESET_OPTIONS as p (p.value)}
							<ToggleGroup.Item value={p.value} class="px-3">{p.label}</ToggleGroup.Item>
						{/each}
					</ToggleGroup.Root>

					<select
						value={series.preset === 'month' ? series.monthValue : ''}
						onchange={(e) => selectMonth(e.currentTarget.value)}
						class={cn(
							buttonVariants({ variant: series.preset === 'month' ? 'default' : 'outline' }),
							'h-9 cursor-pointer appearance-none pr-6'
						)}
					>
						<option value="" disabled>Month…</option>
						{#each monthOptions as option (option.value)}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>

					<Popover.Root bind:open={customRangeOpen}>
						<Popover.Trigger
							class={cn(
								buttonVariants({ variant: series.preset === 'custom' ? 'default' : 'outline' }),
								'gap-1.5'
							)}
						>
							<CalendarIcon class="size-4" />
							Custom
						</Popover.Trigger>
						<Popover.Content class="w-auto p-0" align="start">
							<RangeCalendar
								bind:value={calendarValue}
								bind:placeholder={calendarPlaceholder}
								maxValue={parseCalendarDate(toISODate(today))}
								numberOfMonths={2}
							/>
							<div class="flex justify-end gap-2 border-t p-2">
								<Button variant="ghost" size="sm" onclick={() => (customRangeOpen = false)}>
									Cancel
								</Button>
								<Button
									size="sm"
									disabled={!calendarValue.start || !calendarValue.end}
									onclick={applyCustomRange}
								>
									Apply
								</Button>
							</div>
						</Popover.Content>
					</Popover.Root>
				</div>
			</div>

			<div class="min-w-48 flex-1">
				<p class="mb-2 text-sm font-medium">Accounts</p>
				<MultiSelect
					options={accountOptions}
					bind:selected={series.accountIds}
					placeholder="Select accounts…"
					allLabel="All accounts"
				/>
			</div>
			<div class="min-w-48 flex-1">
				<p class="mb-2 text-sm font-medium">Include tags</p>
				<MultiSelect
					options={tagOptions}
					bind:selected={series.includeTagKeys}
					placeholder="Any tag"
					allLabel="All tags"
				/>
			</div>
			<div class="min-w-48 flex-1">
				<p class="mb-2 text-sm font-medium">Exclude tags</p>
				<MultiSelect
					options={tagOptions}
					bind:selected={series.excludeTagKeys}
					placeholder="None"
					allLabel="All tags"
				/>
			</div>
		</div>

		{#if series.includeTagKeys.length > 0 || series.excludeTagKeys.length > 0}
			<div class="space-y-1.5">
				{#if series.includeTagKeys.length > 0}
					<div class="flex flex-wrap items-center gap-1.5">
						<span class="text-muted-foreground text-xs">Include:</span>
						{#each series.includeTagKeys as key (key)}
							{@const { name, value } = parseTagKey(key)}
							<Badge variant="secondary" class="gap-1">
								{formatCategory(name)}: {formatCategory(value)}
								<button
									type="button"
									onclick={() => (series.includeTagKeys = series.includeTagKeys.filter((k) => k !== key))}
									class="ml-1 opacity-60 hover:opacity-100"
									aria-label="Remove filter"
								>
									×
								</button>
							</Badge>
						{/each}
					</div>
				{/if}
				{#if series.excludeTagKeys.length > 0}
					<div class="flex flex-wrap items-center gap-1.5">
						<span class="text-muted-foreground text-xs">Exclude:</span>
						{#each series.excludeTagKeys as key (key)}
							{@const { name, value } = parseTagKey(key)}
							<Badge variant="destructive" class="gap-1">
								{formatCategory(name)}: {formatCategory(value)}
								<button
									type="button"
									onclick={() => (series.excludeTagKeys = series.excludeTagKeys.filter((k) => k !== key))}
									class="ml-1 opacity-60 hover:opacity-100"
									aria-label="Remove filter"
								>
									×
								</button>
							</Badge>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</Card.Content>

	<Collapsible.Root bind:open={tableOpen}>
		<Collapsible.Trigger
			class="text-muted-foreground hover:text-foreground flex w-full items-center gap-1.5 border-t px-6 py-3 text-sm font-medium"
		>
			<ChevronDownIcon class={cn('size-4 transition-transform', tableOpen && 'rotate-180')} />
			Transactions ({seriesFiltered.length})
			{#if series.excludedTransactionIds.length > 0}
				<span class="text-xs font-normal">· {series.excludedTransactionIds.length} excluded from this series</span>
			{/if}
		</Collapsible.Trigger>
		<Collapsible.Content class="px-6 pb-6">
			<div class="relative mb-3">
				<SearchIcon class="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
				<Input
					value={search.value}
					oninput={(e) => (search.value = e.currentTarget.value)}
					placeholder="Search this series' transactions…"
					class="pl-8"
				/>
			</div>
			<p class="text-muted-foreground mb-2 text-xs">
				Click a row to include/exclude it from this series' totals and charts.
			</p>
			<TransactionsTable
				transactions={seriesFiltered}
				{accountNameById}
				excludedIds={excludedIdSet}
				onToggleTracked={toggleTracked}
				onFilterByTag={(tag) => (search.value = `${tag.name} ${tag.value}`)}
			/>
		</Collapsible.Content>
	</Collapsible.Root>
</Card.Root>
