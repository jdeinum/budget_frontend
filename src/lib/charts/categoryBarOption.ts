import type { EChartsCoreOption } from 'echarts/core';
import { formatCategory, formatCurrency } from '$lib/format';
import { getChartTheme } from './theme';

export interface BarSeriesInput {
	label: string;
	color: string;
	categoryTotals: { category: string; total: number }[];
}

/** Vertical bar chart: total spend per category over each series' range
 * (time-within-range is collapsed — see cumulativeLineOption for the
 * over-time view). A single series gets one bar per category, each its own
 * color from the palette; 2+ series get grouped bars — one color per
 * series, shared across categories, with a legend to tell them apart. */
export function buildCategoryBarOption(seriesList: BarSeriesInput[], isDark: boolean): EChartsCoreOption {
	const theme = getChartTheme(isDark);
	const comparing = seriesList.length > 1;

	const totalFor = (category: string) =>
		seriesList.reduce(
			(sum, s) => sum + (s.categoryTotals.find((c) => c.category === category)?.total ?? 0),
			0
		);
	const categories = [...new Set(seriesList.flatMap((s) => s.categoryTotals.map((c) => c.category)))].sort(
		(a, b) => totalFor(b) - totalFor(a)
	);

	return {
		color: seriesList.map((s) => s.color),
		textStyle: { color: theme.text, fontFamily: 'inherit' },
		tooltip: {
			trigger: 'axis',
			axisPointer: { type: 'shadow' },
			backgroundColor: theme.tooltipBg,
			borderColor: theme.tooltipBorder,
			textStyle: { color: theme.text },
			valueFormatter: (v: unknown) => formatCurrency(v as number, 'USD')
		},
		legend: comparing ? { top: 0, type: 'scroll', textStyle: { color: theme.subtleText } } : undefined,
		grid: { left: 60, right: 16, top: comparing ? 40 : 16, bottom: 72 },
		xAxis: {
			type: 'category',
			data: categories.map((c) => formatCategory(c)),
			axisLine: { lineStyle: { color: theme.axisLine } },
			axisLabel: { color: theme.subtleText, rotate: 30 }
		},
		yAxis: {
			type: 'value',
			axisLabel: { color: theme.subtleText, formatter: '${value}' },
			splitLine: { lineStyle: { color: theme.splitLine } }
		},
		series: seriesList.map((s, i) => ({
			name: s.label,
			type: 'bar',
			barMaxWidth: comparing ? 28 : 48,
			data: categories.map((category) => {
				const total = s.categoryTotals.find((c) => c.category === category)?.total ?? 0;
				// Single series: rainbow by category. Comparing: one flat color per series.
				return comparing
					? total
					: { value: total, itemStyle: { color: theme.seriesColors[i % theme.seriesColors.length] } };
			})
		}))
	};
}
