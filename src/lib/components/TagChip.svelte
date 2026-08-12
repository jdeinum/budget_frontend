<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { cn } from '$lib/utils';
	import { formatCategory } from '$lib/format';
	import { tagColorStyle } from '$lib/tagColor';
	import type { TagValue } from '$lib/types';

	let {
		tag,
		onClick,
		onRemove
	}: {
		tag: TagValue;
		onClick?: (tag: TagValue) => void;
		onRemove?: (tag: TagValue) => void;
	} = $props();
</script>

<Badge
	variant="outline"
	style={tagColorStyle(tag.name, tag.value)}
	class={cn('gap-1', onClick && 'cursor-pointer select-none hover:brightness-110')}
	onclick={onClick
		? (e: MouseEvent) => {
				e.stopPropagation();
				onClick(tag);
			}
		: undefined}
	title={onClick ? `Filter by ${formatCategory(tag.name)}: ${formatCategory(tag.value)}` : undefined}
>
	{formatCategory(tag.name)}: {formatCategory(tag.value)}
	{#if onRemove}
		<button
			type="button"
			onclick={(e) => {
				e.stopPropagation();
				onRemove(tag);
			}}
			class="ml-1 opacity-60 hover:opacity-100"
			aria-label="Remove {tag.name} tag"
		>
			×
		</button>
	{/if}
</Badge>
