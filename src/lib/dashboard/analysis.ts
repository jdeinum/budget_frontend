import type { TagValue, Transaction } from '$lib/types';

export type Granularity = 'day' | 'week' | 'month';

export interface TransactionFilter {
	startDate: string | null;
	endDate: string | null;
	/** `null` = no account filter (include all). */
	accountIds: Set<string> | null;
	/** AND semantics — a transaction must carry every listed pair. */
	tags: TagValue[];
	/** A transaction carrying *any* one of these is dropped. */
	excludeTags: TagValue[];
	/** Matched against `name`/`merchant_name`/tags — see `matchesSearch`. */
	query: string;
}

/**
 * Case-insensitive, every whitespace-separated term required (AND) — mirrors
 * the backend's FTS5 search semantics (`fts5_query` in `backend/src/search.rs`),
 * applied here against locally-held data instead of a database index. Kept
 * as one shared primitive so every table's search bar behaves consistently.
 */
export function matchesSearch(haystack: string, query: string): boolean {
	const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
	if (terms.length === 0) return true;
	const lower = haystack.toLowerCase();
	return terms.every((term) => lower.includes(term));
}

export function parseDate(date: string): Date {
	return new Date(`${date}T00:00:00`);
}

export function toISODate(date: Date): string {
	return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number): Date {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
}

export function earliestDate(transactions: Transaction[]): string | null {
	return transactions.reduce<string | null>(
		(min, tx) => (min === null || tx.date < min ? tx.date : min),
		null
	);
}

function hasTag(tx: Transaction, name: string, value: string): boolean {
	return tx.tags.some((t) => t.name === name && t.value === value);
}

export function filterTransactions(transactions: Transaction[], filter: TransactionFilter): Transaction[] {
	return transactions.filter((tx) => {
		if (filter.startDate && tx.date < filter.startDate) return false;
		if (filter.endDate && tx.date > filter.endDate) return false;
		if (filter.accountIds && !filter.accountIds.has(tx.account_id)) return false;
		if (filter.tags.some((t) => !hasTag(tx, t.name, t.value))) return false;
		if (filter.excludeTags.some((t) => hasTag(tx, t.name, t.value))) return false;
		const tagWords = tx.tags.map((t) => `${t.name} ${t.value}`).join(' ');
		if (!matchesSearch(`${tx.name ?? ''} ${tx.merchant_name ?? ''} ${tagWords}`, filter.query)) return false;
		return true;
	});
}

export function distinctTags(transactions: Transaction[]): TagValue[] {
	const seen = new Map<string, TagValue>();
	for (const tx of transactions) {
		for (const tag of tx.tags) {
			seen.set(`${tag.name}:${tag.value}`, tag);
		}
	}
	return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name) || a.value.localeCompare(b.value));
}

export function granularityForRange(startDate: string, endDate: string): Granularity {
	const days = (parseDate(endDate).getTime() - parseDate(startDate).getTime()) / 86_400_000;
	if (days <= 31) return 'day';
	if (days <= 180) return 'week';
	return 'month';
}

function startOfWeek(date: Date): Date {
	const day = date.getDay();
	const diff = (day === 0 ? -6 : 1) - day;
	const monday = new Date(date);
	monday.setDate(date.getDate() + diff);
	monday.setHours(0, 0, 0, 0);
	return monday;
}

function bucketKey(date: Date, granularity: Granularity): string {
	switch (granularity) {
		case 'day':
			return date.toISOString().slice(0, 10);
		case 'week':
			return startOfWeek(date).toISOString().slice(0, 10);
		case 'month':
			return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
	}
}

function bucketLabel(key: string, granularity: Granularity): string {
	if (granularity === 'month') {
		const [year, month] = key.split('-').map(Number);
		return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
	}
	return parseDate(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Ordered list of bucket keys spanning `[startDate, endDate]`, even ones with no transactions. */
function bucketRange(startDate: string, endDate: string, granularity: Granularity): string[] {
	const keys: string[] = [];
	const end = parseDate(endDate);
	let cursor = parseDate(startDate);
	if (granularity === 'week') cursor = startOfWeek(cursor);

	while (cursor <= end) {
		const key = bucketKey(cursor, granularity);
		if (keys[keys.length - 1] !== key) keys.push(key);
		if (granularity === 'month') {
			cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
		} else {
			cursor = new Date(cursor.getTime() + (granularity === 'week' ? 7 : 1) * 86_400_000);
		}
	}
	return keys;
}

export interface CategorySeries {
	category: string;
	total: number;
	data: number[];
}

export interface CategoryChartData {
	granularity: Granularity;
	bucketLabels: string[];
	series: CategorySeries[];
}

/** Buckets *spend* (positive amounts only) by category tag over time, for the line chart. */
export function buildCategorySeries(
	transactions: Transaction[],
	startDate: string,
	endDate: string
): CategoryChartData {
	const granularity = granularityForRange(startDate, endDate);
	const bucketKeys = bucketRange(startDate, endDate, granularity);
	const bucketIndex = new Map(bucketKeys.map((k, i) => [k, i]));

	const totalsByCategory = new Map<string, number[]>();

	for (const tx of transactions) {
		if (tx.amount <= 0) continue; // spend only — income would invert the chart
		const category = tx.tags.find((t) => t.name === 'category')?.value ?? 'Uncategorized';
		const key = bucketKey(parseDate(tx.date), granularity);
		const index = bucketIndex.get(key);
		if (index === undefined) continue;

		let series = totalsByCategory.get(category);
		if (!series) {
			series = new Array(bucketKeys.length).fill(0);
			totalsByCategory.set(category, series);
		}
		series[index] += tx.amount;
	}

	const series = [...totalsByCategory.entries()]
		.map(([category, data]) => ({
			category,
			data: data.map((v) => Math.round(v * 100) / 100),
			total: data.reduce((sum, v) => sum + v, 0)
		}))
		.sort((a, b) => b.total - a.total);

	return {
		granularity,
		bucketLabels: bucketKeys.map((k) => bucketLabel(k, granularity)),
		series
	};
}

export interface Totals {
	totalSpent: number;
	totalIncome: number;
	net: number;
	count: number;
	avgPerDay: number;
}

export function computeTotals(transactions: Transaction[], startDate: string, endDate: string): Totals {
	let totalSpent = 0;
	let totalIncome = 0;
	for (const tx of transactions) {
		if (tx.amount > 0) totalSpent += tx.amount;
		else totalIncome += -tx.amount;
	}
	const days = Math.max(
		1,
		Math.round((parseDate(endDate).getTime() - parseDate(startDate).getTime()) / 86_400_000) + 1
	);
	return {
		totalSpent: Math.round(totalSpent * 100) / 100,
		totalIncome: Math.round(totalIncome * 100) / 100,
		net: Math.round((totalIncome - totalSpent) * 100) / 100,
		count: transactions.length,
		avgPerDay: Math.round((totalSpent / days) * 100) / 100
	};
}

/** Daily spend totals for a compact KPI-card sparkline (always day-granularity, unlike the main chart). */
export function dailySpendSparkline(transactions: Transaction[], startDate: string, endDate: string): number[] {
	const bucketKeys = bucketRange(startDate, endDate, 'day');
	const index = new Map(bucketKeys.map((k, i) => [k, i]));
	const data = new Array(bucketKeys.length).fill(0);
	for (const tx of transactions) {
		if (tx.amount <= 0) continue;
		const i = index.get(tx.date);
		if (i !== undefined) data[i] += tx.amount;
	}
	return data.map((v) => Math.round(v * 100) / 100);
}

export interface CumulativeSeries {
	labels: string[];
	/** Raw ISO date per index, aligned with `labels`/`data` — looking up a
	 * hovered point's actual calendar date (as opposed to its display label,
	 * or its "Day N" position when comparing series of different lengths)
	 * requires this, not `labels`. */
	dates: string[];
	data: number[];
}

/** Running total of spend by day across the range, for a pacing/timeline chart. */
export function cumulativeSpend(transactions: Transaction[], startDate: string, endDate: string): CumulativeSeries {
	const bucketKeys = bucketRange(startDate, endDate, 'day');
	const daily = dailySpendSparkline(transactions, startDate, endDate);

	let running = 0;
	const data = daily.map((v) => {
		running += v;
		return Math.round(running * 100) / 100;
	});

	return {
		labels: bucketKeys.map((k) => bucketLabel(k, 'day')),
		dates: bucketKeys,
		data
	};
}

/** Groups spend transactions (amount > 0, the same filter `dailySpendSparkline`
 * uses — income doesn't count toward the cumulative line) by their ISO date,
 * for the pacing chart's per-day tooltip. */
export function transactionsByDay(transactions: Transaction[]): Map<string, Transaction[]> {
	const byDay = new Map<string, Transaction[]>();
	for (const tx of transactions) {
		if (tx.amount <= 0) continue;
		const list = byDay.get(tx.date);
		if (list) list.push(tx);
		else byDay.set(tx.date, [tx]);
	}
	return byDay;
}
