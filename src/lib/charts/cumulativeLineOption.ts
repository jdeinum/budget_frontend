import type { EChartsCoreOption } from 'echarts/core';
import type { CallbackDataParams } from 'echarts/types/dist/shared';
import { formatCurrency } from '$lib/format';
import type { Transaction } from '$lib/types';
import { getChartTheme } from './theme';

export interface LineSeriesInput {
	label: string;
	color: string;
	/** Cumulative daily spend, index 0 = first day of that series' range. */
	cumulative: number[];
	/** Calendar-date labels aligned to `cumulative`, only used when there's a single series. */
	dateLabels: string[];
	/** Raw ISO dates aligned to `cumulative`/`dateLabels` — used to look up
	 * `transactionsByDate` for the hovered point, since `dateLabels` switches
	 * to "Day N" (not a real date) once 2+ series are being compared. */
	dates: string[];
	/** This series' own spend transactions, grouped by ISO date — powers the
	 * tooltip's per-day transaction list. See `transactionsByDay()`. */
	transactionsByDate: Map<string, Transaction[]>;
}

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/** Builds the tooltip's HTML for one hovered series — its color/name/total,
 * plus (if any) the list of transactions that made up that day's spend. */
function formatSeriesTooltip(param: CallbackDataParams, series: LineSeriesInput, textColor: string): string {
	const date = series.dates[param.dataIndex as number];
	const transactions = date ? (series.transactionsByDate.get(date) ?? []) : [];

	const header = `
		<div style="display:flex; align-items:center; gap:6px; margin-top:6px;">
			<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${param.color};"></span>
			<span style="font-weight:600;">${escapeHtml(series.label)}</span>
			<span style="margin-left:auto; font-weight:600;">${formatCurrency(param.value as number, 'USD')}</span>
		</div>
	`;

	if (transactions.length === 0) return header;

	const rows = transactions
		.map(
			(tx) => `
				<div style="display:flex; justify-content:space-between; gap:16px; font-size:11px; opacity:0.75; padding:1px 0;">
					<span>${escapeHtml(tx.merchant_name ?? tx.name ?? 'Unknown')}</span>
					<span>${formatCurrency(tx.amount, tx.iso_currency_code)}</span>
				</div>
			`
		)
		.join('');

	return `${header}<div style="margin:2px 0 4px 14px; max-height:140px; overflow-y:auto; color:${textColor};">${rows}</div>`;
}

/** Running total of spend by day. A single series is plotted against actual
 * calendar dates; comparing 2+ series switches the x-axis to "Day N of the
 * period" so ranges of different lengths/months overlay meaningfully (day 1
 * vs day 1, day 15 vs day 15) instead of misaligning on the calendar. */
export function buildCumulativeLineOption(seriesList: LineSeriesInput[], isDark: boolean): EChartsCoreOption {
	const theme = getChartTheme(isDark);
	const comparing = seriesList.length > 1;

	const maxLen = seriesList.reduce((max, s) => Math.max(max, s.cumulative.length), 0);
	const xLabels = comparing
		? Array.from({ length: maxLen }, (_, i) => `Day ${i + 1}`)
		: (seriesList[0]?.dateLabels ?? []);

	return {
		color: seriesList.map((s) => s.color),
		textStyle: { color: theme.text, fontFamily: 'inherit' },
		tooltip: {
			trigger: 'axis',
			backgroundColor: theme.tooltipBg,
			borderColor: theme.tooltipBorder,
			textStyle: { color: theme.text },
			formatter: (params: CallbackDataParams | CallbackDataParams[]) => {
				const list = Array.isArray(params) ? params : [params];
				const axisLabel = xLabels[list[0]?.dataIndex ?? -1] ?? '';
				const body = list
					.filter((p) => p.value != null && typeof p.seriesIndex === 'number')
					.map((p) => formatSeriesTooltip(p, seriesList[p.seriesIndex as number], theme.text))
					.join('');
				return `<div style="font-weight:600;">${escapeHtml(String(axisLabel))}</div>${body}`;
			}
		},
		legend: comparing ? { top: 0, type: 'scroll', textStyle: { color: theme.subtleText } } : undefined,
		grid: { left: 60, right: 16, top: comparing ? 40 : 16, bottom: 40 },
		xAxis: {
			type: 'category',
			data: xLabels,
			boundaryGap: false,
			axisLine: { lineStyle: { color: theme.axisLine } },
			axisLabel: { color: theme.subtleText }
		},
		yAxis: {
			type: 'value',
			axisLabel: { color: theme.subtleText, formatter: '${value}' },
			splitLine: { lineStyle: { color: theme.splitLine } }
		},
		// Slider only — no `inside` entry, so dragging/scrolling on the plot
		// area itself doesn't zoom, but the slider below it still does.
		dataZoom: [{ type: 'slider', bottom: 4, height: 16 }],
		series: seriesList.map((s) => ({
			name: s.label,
			type: 'line',
			data: s.cumulative,
			showSymbol: false,
			smooth: false,
			lineStyle: { width: 2 },
			areaStyle: comparing ? undefined : { opacity: 0.15 }
		}))
	};
}
