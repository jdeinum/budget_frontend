<script lang="ts">
	import { untrack } from 'svelte';
	import { Input } from '$lib/components/ui/input/index.js';

	let { name, onRename }: { name: string; onRename: (name: string) => void } = $props();
	let value = $state(untrack(() => name));

	function commit() {
		const trimmed = value.trim();
		if (trimmed && trimmed !== name) onRename(trimmed);
		else value = name;
	}
</script>

<Input
	{value}
	oninput={(e) => (value = e.currentTarget.value)}
	onblur={commit}
	onkeydown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
	class="h-7 w-full border-transparent bg-transparent px-1.5 font-medium shadow-none hover:border-input focus-visible:border-input"
/>
