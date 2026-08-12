import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import {
	DataZoomComponent,
	GridComponent,
	LegendComponent,
	TooltipComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

let registered = false;

/** Registers only the ECharts modules the dashboard actually uses (tree-shaken). */
export function ensureEchartsRegistered() {
	if (registered) return;
	echarts.use([
		LineChart,
		BarChart,
		GridComponent,
		TooltipComponent,
		LegendComponent,
		DataZoomComponent,
		CanvasRenderer
	]);
	registered = true;
}

export { echarts };
