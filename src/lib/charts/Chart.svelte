<script lang="ts">
	import type { EChartsCoreOption, ECharts } from 'echarts/core';
	import { ensureEchartsRegistered, echarts } from './setup';

	let { option, class: className = '' }: { option: EChartsCoreOption; class?: string } = $props();

	let container: HTMLDivElement | undefined = $state();
	let chart: ECharts | undefined;

	$effect(() => {
		if (!container) return;

		ensureEchartsRegistered();
		chart = echarts.init(container);

		const resizeObserver = new ResizeObserver(() => chart?.resize());
		resizeObserver.observe(container);

		return () => {
			resizeObserver.disconnect();
			chart?.dispose();
			chart = undefined;
		};
	});

	$effect(() => {
		// `option` is read here so this effect reruns whenever the caller's
		// reactive option changes (e.g. filters, theme).
		chart?.setOption(option, true);
	});
</script>

<div bind:this={container} class={className}></div>
