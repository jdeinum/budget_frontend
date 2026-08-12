import type { TagValue } from '$lib/types';
import { addDays, parseDate, toISODate } from './analysis';

export interface DateRange {
	start: string;
	end: string;
}

export type Preset = '7d' | '30d' | '90d' | '6m' | '1y' | 'all' | 'month' | 'custom';

export const PRESET_OPTIONS: { value: Exclude<Preset, 'month' | 'custom'>; label: string }[] = [
	{ value: '7d', label: '7D' },
	{ value: '30d', label: '30D' },
	{ value: '90d', label: '90D' },
	{ value: '6m', label: '6M' },
	{ value: '1y', label: '1Y' },
	{ value: 'all', label: 'All' }
];

const DAYS_BACK: Record<Exclude<Preset, 'all' | 'month' | 'custom'>, number> = {
	'7d': 6,
	'30d': 29,
	'90d': 89,
	'6m': 179,
	'1y': 364
};

export function rangeForPreset(
	preset: Exclude<Preset, 'month' | 'custom'>,
	today: Date,
	earliestStart: string
): DateRange {
	const end = new Date(today);
	end.setHours(0, 0, 0, 0);
	if (preset === 'all') {
		return { start: earliestStart, end: toISODate(end) };
	}
	return { start: toISODate(addDays(end, -DAYS_BACK[preset])), end: toISODate(end) };
}

/**
 * A single independently-configured "view" of the transaction set — a date
 * range plus which accounts/tags it's scoped to. Every comparison series is
 * this same shape (there's no structurally-special "primary" series; by
 * convention the first one in the list drives the transactions table/KPIs).
 */
export interface Series {
	id: string;
	label: string;
	/** Once true, date/preset changes stop auto-regenerating `label` —
	 * set whenever the user types a custom name, cleared if they blank it out. */
	labelIsCustom: boolean;
	color: string;
	preset: Preset;
	/** `YYYY-MM`, only meaningful when `preset === 'month'`. */
	monthValue: string;
	dateRange: DateRange;
	accountIds: string[];
	includeTagKeys: string[];
	excludeTagKeys: string[];
	/** Free-text search, matched against name/merchant_name — mirrors the
	 * backend's `q=` param; combined (AND) with this series' other filters. */
	query: string;
	/** Ad-hoc per-transaction opt-outs, scoped to this series alone — see
	 * this series' own expandable transactions table. */
	excludedTransactionIds: string[];
}

export function createSeries(params: {
	label: string;
	color: string;
	preset: Preset;
	monthValue?: string;
	dateRange: DateRange;
	accountIds: string[];
	includeTagKeys?: string[];
	excludeTagKeys?: string[];
}): Series {
	return {
		id: crypto.randomUUID(),
		label: params.label,
		labelIsCustom: false,
		color: params.color,
		preset: params.preset,
		monthValue: params.monthValue ?? '',
		dateRange: params.dateRange,
		accountIds: params.accountIds,
		includeTagKeys: params.includeTagKeys ?? [],
		excludeTagKeys: params.excludeTagKeys ?? [],
		query: '',
		excludedTransactionIds: []
	};
}

/** Deep-ish clone of a series with a fresh id — for "Duplicate"/"Previous period" shortcuts.
 * Per-transaction exclusions are deliberately NOT carried over: a new series
 * is a fresh view, possibly over an entirely different set of transactions. */
export function cloneSeries(series: Series, overrides: Partial<Series> = {}): Series {
	return {
		...series,
		accountIds: [...series.accountIds],
		includeTagKeys: [...series.includeTagKeys],
		excludeTagKeys: [...series.excludeTagKeys],
		excludedTransactionIds: [],
		...overrides,
		id: crypto.randomUUID()
	};
}

export function parseTagKey(key: string): TagValue {
	const [name, ...rest] = key.split(':');
	return { name, value: rest.join(':') };
}

export interface MonthOption {
	/** `YYYY-MM`. */
	value: string;
	label: string;
	range: DateRange;
}

/** A calendar month's bounds, clamped to `today` if the month is the current one (or future). */
export function monthRange(year: number, month0: number, today: Date): DateRange {
	const start = new Date(year, month0, 1);
	const lastDayOfMonth = new Date(year, month0 + 1, 0);
	const end = lastDayOfMonth > today ? today : lastDayOfMonth;
	return { start: toISODate(start), end: toISODate(end) };
}

function monthValueOf(date: Date): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** The last `count` calendar months (including the current one), most recent first. */
export function recentMonthOptions(count: number, today: Date): MonthOption[] {
	const options: MonthOption[] = [];
	for (let i = 0; i < count; i++) {
		const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
		options.push({
			value: monthValueOf(d),
			label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
			range: monthRange(d.getFullYear(), d.getMonth(), today)
		});
	}
	return options;
}

export function monthRangeForValue(value: string, today: Date): DateRange {
	const [year, month] = value.split('-').map(Number);
	return monthRange(year, month - 1, today);
}

export function previousMonthValue(value: string): string {
	const [year, month] = value.split('-').map(Number);
	const d = new Date(year, month - 1 - 1, 1);
	return monthValueOf(d);
}

export function monthLabel(value: string): string {
	const [year, month] = value.split('-').map(Number);
	return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/** The period of the same length immediately preceding `range` (day-count based —
 * use `previousMonthValue` + `monthRangeForValue` instead when comparing calendar months). */
export function previousPeriod(range: DateRange): DateRange {
	const start = parseDate(range.start);
	const end = parseDate(range.end);
	const spanDays = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
	return {
		start: toISODate(addDays(start, -spanDays)),
		end: toISODate(addDays(start, -1))
	};
}
