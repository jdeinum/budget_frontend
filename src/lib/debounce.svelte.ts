/**
 * A text input's value that updates instantly for display, while
 * `onSettle` only fires `delayMs` after the user stops typing — for search
 * boxes driving filtering (or, once server-connected, a network request)
 * that shouldn't re-run on every keystroke.
 */
export function debouncedInput(initial: string, onSettle: (value: string) => void, delayMs = 250) {
	let draft = $state(initial);
	let timeout: ReturnType<typeof setTimeout> | undefined;

	return {
		get value() {
			return draft;
		},
		set value(next: string) {
			draft = next;
			clearTimeout(timeout);
			timeout = setTimeout(() => onSettle(next), delayMs);
		}
	};
}
