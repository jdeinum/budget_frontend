/** Reactive `prefers-color-scheme` tracker for theming canvas-based charts,
 * which can't read CSS custom properties the way the rest of the UI does. */
export function createColorScheme() {
	let isDark = $state(
		typeof window !== 'undefined'
			? window.matchMedia('(prefers-color-scheme: dark)').matches
			: false
	);

	$effect(() => {
		const query = window.matchMedia('(prefers-color-scheme: dark)');
		const listener = (e: MediaQueryListEvent) => (isDark = e.matches);
		query.addEventListener('change', listener);
		return () => query.removeEventListener('change', listener);
	});

	return {
		get isDark() {
			return isDark;
		}
	};
}
