<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Command from '$lib/components/ui/command/index.js';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { cn } from '$lib/utils';
	import { formatCategory } from '$lib/format';
	import { tagColorSolid } from '$lib/tagColor';
	import TagChip from '$lib/components/TagChip.svelte';
	import { getTransactionsContext } from '$lib/state/transactions.svelte';
	import { getMerchantsContext } from '$lib/state/merchants.svelte';
	import { getAccountsContext } from '$lib/state/accounts.svelte';
	import { buildTagTaxonomy } from '$lib/dashboard/tagTaxonomy';
	import TagIcon from '@lucide/svelte/icons/tag';
	import CheckIcon from '@lucide/svelte/icons/check';
	import type { TagValue } from '$lib/types';

	let {
		tags,
		onTag,
		onUntag,
		onFilterByTag
	}: {
		tags: TagValue[];
		onTag: (name: string, value: string) => void;
		onUntag: (name: string) => void;
		onFilterByTag?: (tag: TagValue) => void;
	} = $props();

	const transactionsStore = getTransactionsContext();
	const merchantsStore = getMerchantsContext();
	const accountsStore = getAccountsContext();

	// The full known taxonomy (every category and every value seen anywhere),
	// not just this entity's own tags — powers the combobox below.
	let taxonomy = $derived(
		buildTagTaxonomy(transactionsStore.transactions, [
			...merchantsStore.merchants.flatMap((m) => m.tags),
			...accountsStore.accounts.flatMap((a) => a.tags)
		])
	);

	const VISIBLE_CHIPS = 3;
	let visibleTags = $derived(tags.slice(0, VISIBLE_CHIPS));
	let overflowCount = $derived(Math.max(0, tags.length - VISIBLE_CHIPS));

	let open = $state(false);
	let search = $state('');
	let newName = $state('');
	let newValue = $state('');

	function isApplied(name: string, value: string): boolean {
		return tags.some((t) => t.name === name && t.value === value);
	}

	/** Picking a value toggles it: applied → untag, unapplied → tag (replacing
	 * any existing value under that name, since tags are single-valued per name). */
	function toggleTag(name: string, value: string) {
		if (isApplied(name, value)) onUntag(name);
		else onTag(name, value);
		search = '';
	}

	function addNewTag() {
		const name = newName.trim();
		const value = newValue.trim();
		if (!name || !value) return;
		onTag(name, value);
		newName = '';
		newValue = '';
		search = '';
	}
</script>

<div class="flex flex-wrap items-center justify-end gap-1">
	{#each visibleTags as tag (tag.name)}
		<TagChip {tag} onClick={onFilterByTag} />
	{/each}
	{#if overflowCount > 0}
		<button
			type="button"
			onclick={(e) => {
				e.stopPropagation();
				open = true;
			}}
			class="text-muted-foreground px-1 text-xs hover:underline"
		>
			+{overflowCount}
		</button>
	{/if}
	<Dialog.Root bind:open>
		<Dialog.Trigger
			class={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'size-7 shrink-0')}
			aria-label="Edit tags"
		>
			<TagIcon class="size-3.5" />
		</Dialog.Trigger>
		<Dialog.Content class="flex max-h-[85vh] w-full flex-col overflow-hidden sm:max-w-md">
			<Dialog.Header>
				<Dialog.Title>Tags</Dialog.Title>
				<Dialog.Description>Add a tag, or reuse one from an existing category.</Dialog.Description>
			</Dialog.Header>

			<div class="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
				<div>
					<p class="mb-2 text-sm font-medium">Applied</p>
					<div class="flex flex-wrap gap-1.5">
						{#each tags as tag (tag.name)}
							<TagChip {tag} onRemove={() => onUntag(tag.name)} />
						{:else}
							<p class="text-muted-foreground text-xs">No tags yet.</p>
						{/each}
					</div>
				</div>

				{#if taxonomy.names.length > 0}
					<div class="space-y-2">
						<p class="text-sm font-medium">Reuse an existing tag</p>
						<Command.Root class="rounded-lg border">
							<Command.Input placeholder="Search tags…" bind:value={search} />
							<Command.List>
								<Command.Empty>
									<p class="text-muted-foreground px-2 py-1.5 text-xs">No matching tag.</p>
								</Command.Empty>
								{#each taxonomy.names as name (name)}
									<Command.Group heading={formatCategory(name)}>
										{#each taxonomy.valuesByName.get(name) ?? [] as value (value)}
											{@const applied = isApplied(name, value)}
											<Command.Item
												value={`${name}:${value}`}
												keywords={[name, value, formatCategory(name), formatCategory(value)]}
												onSelect={() => toggleTag(name, value)}
											>
												<span
													class="size-2.5 shrink-0 rounded-full"
													style="background-color: {tagColorSolid(name, value)}"
												></span>
												{formatCategory(value)}
												{#if applied}
													<CheckIcon class="ml-auto size-3.5" />
												{/if}
											</Command.Item>
										{/each}
									</Command.Group>
								{/each}
							</Command.List>
						</Command.Root>
					</div>
				{/if}

				<div class="space-y-2">
					<p class="text-sm font-medium">
						{taxonomy.names.length > 0 ? 'Or create a new tag' : 'Create a tag'}
					</p>
					<div class="flex gap-1.5">
						<Input
							placeholder="category"
							list="tag-editor-name-options"
							bind:value={newName}
							class="h-8 flex-1"
							autocomplete="off"
						/>
						<datalist id="tag-editor-name-options">
							{#each taxonomy.names as name (name)}
								<option value={name}>{formatCategory(name)}</option>
							{/each}
						</datalist>
						<Input
							placeholder="value"
							bind:value={newValue}
							class="h-8 flex-1"
							autocomplete="off"
							onkeydown={(e) => e.key === 'Enter' && addNewTag()}
						/>
						<Button
							size="sm"
							class="shrink-0"
							disabled={!newName.trim() || !newValue.trim()}
							onclick={addNewTag}
						>
							Add
						</Button>
					</div>
				</div>
			</div>
		</Dialog.Content>
	</Dialog.Root>
</div>
