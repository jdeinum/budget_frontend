<script lang="ts">
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import { cn } from '$lib/utils';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';

	export interface MultiSelectOption {
		value: string;
		label: string;
		group?: string;
	}

	let {
		options,
		selected = $bindable<string[]>([]),
		placeholder = 'Select…',
		allLabel = 'All',
		class: className = ''
	}: {
		options: MultiSelectOption[];
		selected: string[];
		placeholder?: string;
		allLabel?: string;
		class?: string;
	} = $props();

	let open = $state(false);

	function toggle(value: string) {
		selected = selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value];
	}

	function selectAll() {
		selected = options.map((o) => o.value);
	}

	function clearAll() {
		selected = [];
	}

	let grouped = $derived.by(() => {
		const map = new Map<string, MultiSelectOption[]>();
		for (const opt of options) {
			const key = opt.group ?? '';
			const arr = map.get(key) ?? [];
			arr.push(opt);
			map.set(key, arr);
		}
		return map;
	});

	let summary = $derived(
		selected.length === 0
			? placeholder
			: selected.length === options.length
				? allLabel
				: `${selected.length} selected`
	);
</script>

<Popover.Root bind:open>
	<Popover.Trigger
		class={cn(buttonVariants({ variant: 'outline' }), 'w-full justify-between font-normal', className)}
	>
		<span class="truncate">{summary}</span>
		<ChevronDownIcon class="size-4 shrink-0 opacity-50" />
	</Popover.Trigger>
	<Popover.Content class="w-64 p-0" align="start">
		<Command.Root>
			<Command.Input placeholder="Search…" />
			<div class="flex items-center justify-between border-b px-2 py-1.5 text-xs">
				<button type="button" onclick={selectAll} class="text-primary hover:underline">
					Select all
				</button>
				<button type="button" onclick={clearAll} class="text-muted-foreground hover:underline">
					Clear
				</button>
			</div>
			<Command.List>
				<Command.Empty class="py-4 text-center text-sm text-muted-foreground">No results.</Command.Empty>
				{#each grouped.entries() as [group, opts] (group)}
					<Command.Group heading={group || undefined}>
						{#each opts as opt (opt.value)}
							<Command.Item
								value={opt.label}
								data-checked={selected.includes(opt.value)}
								onSelect={() => toggle(opt.value)}
							>
								<Checkbox checked={selected.includes(opt.value)} class="pointer-events-none" />
								{opt.label}
							</Command.Item>
						{/each}
					</Command.Group>
				{/each}
			</Command.List>
		</Command.Root>
	</Popover.Content>
</Popover.Root>
