<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import Chart from '$lib/charts/Chart.svelte';
	import type { EChartsCoreOption } from 'echarts/core';
	import { cn } from '$lib/utils';

	let {
		label,
		value,
		accent = 'default',
		sparkline,
		sparklineColor = '#6366f1'
	}: {
		label: string;
		value: string;
		accent?: 'default' | 'positive' | 'negative';
		sparkline?: number[];
		sparklineColor?: string;
	} = $props();

	let option = $derived.by((): EChartsCoreOption | null => {
		if (!sparkline || sparkline.length < 2) return null;
		return {
			grid: { left: 0, right: 0, top: 4, bottom: 0 },
			xAxis: { type: 'category', show: false, data: sparkline.map((_, i) => i), boundaryGap: false },
			yAxis: { type: 'value', show: false },
			series: [
				{
					type: 'line',
					data: sparkline,
					showSymbol: false,
					smooth: true,
					lineStyle: { width: 2, color: sparklineColor },
					areaStyle: { color: sparklineColor, opacity: 0.12 }
				}
			],
			tooltip: { show: false }
		};
	});

	const accentClass = {
		default: '',
		positive: 'text-emerald-600 dark:text-emerald-400',
		negative: 'text-rose-600 dark:text-rose-400'
	};
</script>

<Card.Root class="gap-2 py-4">
	<Card.Header>
		<Card.Description>{label}</Card.Description>
		<Card.Title class={cn('text-2xl tabular-nums', accentClass[accent])}>{value}</Card.Title>
	</Card.Header>
	{#if option}
		<Card.Content class="h-10">
			<Chart {option} class="h-full w-full" />
		</Card.Content>
	{/if}
</Card.Root>
