// ECharts renders to canvas, so it can't read Tailwind's CSS custom
// properties directly — these mirror the oklch values in layout.css as
// concrete colors usable by chart options.
export interface ChartTheme {
	text: string;
	subtleText: string;
	axisLine: string;
	splitLine: string;
	tooltipBg: string;
	tooltipBorder: string;
	seriesColors: string[];
}

const LIGHT: ChartTheme = {
	text: '#18181b',
	subtleText: '#71717a',
	axisLine: '#d4d4d8',
	splitLine: '#e4e4e7',
	tooltipBg: '#ffffff',
	tooltipBorder: '#e4e4e7',
	seriesColors: [
		'#6366f1',
		'#22c55e',
		'#f59e0b',
		'#ef4444',
		'#06b6d4',
		'#a855f7',
		'#ec4899',
		'#84cc16',
		'#f97316',
		'#14b8a6'
	]
};

const DARK: ChartTheme = {
	text: '#e4e4e7',
	subtleText: '#a1a1aa',
	axisLine: '#3f3f46',
	splitLine: '#27272a',
	tooltipBg: '#27272a',
	tooltipBorder: '#3f3f46',
	seriesColors: LIGHT.seriesColors
};

export function getChartTheme(isDark: boolean): ChartTheme {
	return isDark ? DARK : LIGHT;
}

/** The series color palette, identical in light/dark — for assigning a
 * stable color to a user-defined series at creation time (independent of
 * the current theme, which only affects axis/text/tooltip chrome). */
export const CHART_PALETTE = LIGHT.seriesColors;

/** Tracks `prefers-color-scheme` reactively for chart theming. */
export function watchColorScheme(onChange: (isDark: boolean) => void): () => void {
	const query = window.matchMedia('(prefers-color-scheme: dark)');
	onChange(query.matches);
	const listener = (e: MediaQueryListEvent) => onChange(e.matches);
	query.addEventListener('change', listener);
	return () => query.removeEventListener('change', listener);
}
