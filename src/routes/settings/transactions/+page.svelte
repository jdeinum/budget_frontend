<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { cn } from '$lib/utils';
	import { formatCategory, formatCurrency, formatDate } from '$lib/format';
	import { buildTagTaxonomy } from '$lib/dashboard/tagTaxonomy';
	import { getTransactionsContext } from '$lib/state/transactions.svelte';
	import { getMerchantsContext } from '$lib/state/merchants.svelte';
	import { getAccountsContext } from '$lib/state/accounts.svelte';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import type { RuleKind, TransactionRule } from '$lib/types';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const transactionsStore = getTransactionsContext();
	const merchantsStore = getMerchantsContext();
	const accountsStore = getAccountsContext();

	let taxonomy = $derived(
		buildTagTaxonomy(transactionsStore.transactions, [
			...merchantsStore.merchants.flatMap((m) => m.tags),
			...accountsStore.accounts.flatMap((a) => a.tags)
		])
	);

	const KIND_OPTIONS: { value: RuleKind; label: string }[] = [
		{ value: 'merchant_contains', label: 'Merchant name' },
		{ value: 'tag', label: 'Tag' },
		{ value: 'account', label: 'Account' },
		{ value: 'transfer', label: 'Transfer' }
	];

	type Refinement = 'none' | 'tag' | 'merchant';

	let kind = $state<RuleKind>('merchant_contains');
	let pattern = $state('');
	let tagName = $state('');
	let tagValue = $state('');
	let accountId = $state('');
	let sourceAccountId = $state('');
	let targetAccountId = $state('');
	let refinement = $state<Refinement>('none');
	let submitting = $state(false);
	let ignoredOpen = $state(false);

	let tagValues = $derived(tagName ? (taxonomy.valuesByName.get(tagName) ?? []) : []);

	let tagNameLabel = $derived(tagName ? formatCategory(tagName) : 'Category…');
	let tagValueLabel = $derived(tagValue ? formatCategory(tagValue) : 'Value…');
	function accountLabel(id: string, placeholder: string): string {
		return accountsStore.accounts.find((a) => a.id === id)?.name ?? placeholder;
	}

	let canSubmit = $derived.by(() => {
		if (kind === 'merchant_contains') return pattern.trim().length > 0;
		if (kind === 'tag') return tagName.trim().length > 0 && tagValue.trim().length > 0;
		if (kind === 'account') return accountId.trim().length > 0;
		// transfer
		if (!sourceAccountId || !targetAccountId || sourceAccountId === targetAccountId) return false;
		if (refinement === 'tag') return tagName.trim().length > 0 && tagValue.trim().length > 0;
		if (refinement === 'merchant') return pattern.trim().length > 0;
		return true;
	});

	function resetForm() {
		pattern = '';
		tagName = '';
		tagValue = '';
		accountId = '';
		sourceAccountId = '';
		targetAccountId = '';
		refinement = 'none';
	}

	async function addRule() {
		if (!canSubmit || submitting) return;
		submitting = true;
		const body: Record<string, unknown> = { kind };
		if (kind === 'merchant_contains') body.pattern = pattern.trim();
		if (kind === 'tag') {
			body.tag_name = tagName;
			body.tag_value = tagValue;
		}
		if (kind === 'account') body.account_id = accountId;
		if (kind === 'transfer') {
			body.source_account_id = sourceAccountId;
			body.target_account_id = targetAccountId;
			if (refinement === 'tag') {
				body.tag_name = tagName;
				body.tag_value = tagValue;
			}
			if (refinement === 'merchant') body.pattern = pattern.trim();
		}

		const res = await fetch('/api/transaction-rules', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
		submitting = false;
		if (!res.ok) {
			console.error('Failed to create rule:', await res.text());
			return;
		}
		resetForm();
		await invalidateAll();
	}

	async function deleteRule(id: string) {
		const res = await fetch(`/api/transaction-rules/${id}`, { method: 'DELETE' });
		if (!res.ok) {
			console.error('Failed to delete rule:', await res.text());
			return;
		}
		await invalidateAll();
	}

	function describeRule(rule: TransactionRule): string {
		switch (rule.kind) {
			case 'merchant_contains':
				return `Merchant name contains "${rule.pattern}"`;
			case 'tag':
				return `Tagged ${formatCategory(rule.tag_name)}: ${formatCategory(rule.tag_value)}`;
			case 'account': {
				const name = accountsStore.accounts.find((a) => a.id === rule.account_id)?.name;
				return `Account is ${name ?? rule.account_id}`;
			}
			case 'transfer': {
				const sourceName =
					accountsStore.accounts.find((a) => a.id === rule.source_account_id)?.name ??
					rule.source_account_id;
				const targetName =
					accountsStore.accounts.find((a) => a.id === rule.target_account_id)?.name ??
					rule.target_account_id;
				let description = `Transfer between ${sourceName} and ${targetName}`;
				if (rule.tag_name) {
					description += `, tagged ${formatCategory(rule.tag_name)}: ${formatCategory(rule.tag_value)}`;
				} else if (rule.pattern) {
					description += `, matching "${rule.pattern}"`;
				}
				return description;
			}
		}
	}
</script>

<svelte:head>
	<title>nil · Settings — Transactions</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h2 class="text-lg font-semibold tracking-tight">Ignore rules</h2>
		<p class="text-muted-foreground text-sm">
			Transactions matching any rule below are hidden from every table, chart, and total.
			Delete a rule to bring its matches back.
		</p>
	</div>

	<Card.Root>
		<Card.Content class="space-y-4">
			<ToggleGroup.Root
				type="single"
				value={kind}
				onValueChange={(v: string) => v && (kind = v as RuleKind)}
			>
				{#each KIND_OPTIONS as option (option.value)}
					<ToggleGroup.Item value={option.value} class="px-3">{option.label}</ToggleGroup.Item>
				{/each}
			</ToggleGroup.Root>

			{#if kind === 'merchant_contains'}
				<Input bind:value={pattern} placeholder="e.g. venmo" class="max-w-sm" />
			{:else if kind === 'tag'}
				<div class="flex flex-wrap gap-2">
					<Select.Root
						type="single"
						value={tagName}
						onValueChange={(v) => {
							tagName = v ?? '';
							tagValue = '';
						}}
					>
						<Select.Trigger class="h-9 w-auto">
							{tagNameLabel}
						</Select.Trigger>
						<Select.Content>
							{#each taxonomy.names as name (name)}
								<Select.Item value={name} label={formatCategory(name)} />
							{/each}
						</Select.Content>
					</Select.Root>
					<Select.Root type="single" bind:value={tagValue} disabled={!tagName}>
						<Select.Trigger class="h-9 w-auto">
							{tagValueLabel}
						</Select.Trigger>
						<Select.Content>
							{#each tagValues as value (value)}
								<Select.Item {value} label={formatCategory(value)} />
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			{:else if kind === 'account'}
				<Select.Root type="single" bind:value={accountId}>
					<Select.Trigger class="h-9 max-w-sm">
						{accountLabel(accountId, 'Account…')}
					</Select.Trigger>
					<Select.Content>
						{#each accountsStore.accounts as account (account.id)}
							<Select.Item value={account.id} label={account.name} />
						{/each}
					</Select.Content>
				</Select.Root>
			{:else}
				<div class="space-y-3">
					<div class="flex flex-wrap gap-2">
						<Select.Root type="single" bind:value={sourceAccountId}>
							<Select.Trigger class="h-9 w-auto">
								{accountLabel(sourceAccountId, 'Source account…')}
							</Select.Trigger>
							<Select.Content>
								{#each accountsStore.accounts as account (account.id)}
									<Select.Item value={account.id} label={account.name} />
								{/each}
							</Select.Content>
						</Select.Root>
						<Select.Root type="single" bind:value={targetAccountId}>
							<Select.Trigger class="h-9 w-auto">
								{accountLabel(targetAccountId, 'Target account…')}
							</Select.Trigger>
							<Select.Content>
								{#each accountsStore.accounts as account (account.id)}
									<Select.Item value={account.id} label={account.name} />
								{/each}
							</Select.Content>
						</Select.Root>
					</div>

					<div class="space-y-2">
						<p class="text-muted-foreground text-xs">Optionally narrow to a tag or merchant name</p>
						<ToggleGroup.Root
							type="single"
							value={refinement}
							onValueChange={(v: string) => v && (refinement = v as Refinement)}
						>
							<ToggleGroup.Item value="none" class="px-3">None</ToggleGroup.Item>
							<ToggleGroup.Item value="tag" class="px-3">Tag</ToggleGroup.Item>
							<ToggleGroup.Item value="merchant" class="px-3">Merchant name</ToggleGroup.Item>
						</ToggleGroup.Root>

						{#if refinement === 'tag'}
							<div class="flex flex-wrap gap-2">
								<Select.Root
									type="single"
									value={tagName}
									onValueChange={(v) => {
										tagName = v ?? '';
										tagValue = '';
									}}
								>
									<Select.Trigger class="h-9 w-auto">
										{tagNameLabel}
									</Select.Trigger>
									<Select.Content>
										{#each taxonomy.names as name (name)}
											<Select.Item value={name} label={formatCategory(name)} />
										{/each}
									</Select.Content>
								</Select.Root>
								<Select.Root type="single" bind:value={tagValue} disabled={!tagName}>
									<Select.Trigger class="h-9 w-auto">
										{tagValueLabel}
									</Select.Trigger>
									<Select.Content>
										{#each tagValues as value (value)}
											<Select.Item {value} label={formatCategory(value)} />
										{/each}
									</Select.Content>
								</Select.Root>
							</div>
						{:else if refinement === 'merchant'}
							<Input bind:value={pattern} placeholder="e.g. venmo" class="max-w-sm" />
						{/if}
					</div>
				</div>
			{/if}

			<Button size="sm" disabled={!canSubmit || submitting} onclick={addRule}>Add rule</Button>
		</Card.Content>
	</Card.Root>

	<div class="space-y-2">
		{#each data.rules as rule (rule.id)}
			<div class="flex items-center justify-between rounded-md border px-4 py-2.5 text-sm">
				<span>{describeRule(rule)}</span>
				<Button
					variant="ghost"
					size="icon"
					class="text-muted-foreground hover:text-destructive size-7"
					onclick={() => deleteRule(rule.id)}
					aria-label="Delete rule"
				>
					<Trash2Icon class="size-4" />
				</Button>
			</div>
		{:else}
			<p class="text-muted-foreground text-sm">No ignore rules yet.</p>
		{/each}
	</div>

	<Collapsible.Root bind:open={ignoredOpen}>
		<Collapsible.Trigger
			class="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm font-medium"
		>
			<ChevronDownIcon class={cn('size-4 transition-transform', ignoredOpen && 'rotate-180')} />
			{data.ignored.length} transaction{data.ignored.length === 1 ? '' : 's'} currently ignored
			{#if data.ignoredMayBeTruncated}
				<span class="text-xs font-normal">(showing first {data.ignored.length})</span>
			{/if}
		</Collapsible.Trigger>
		<Collapsible.Content class="mt-2 max-h-80 overflow-auto rounded-md border">
			<table class="w-full text-sm">
				<tbody class="divide-y">
					{#each data.ignored as tx (tx.id)}
						<tr>
							<td class="text-muted-foreground px-3 py-2 whitespace-nowrap">{formatDate(tx.date)}</td>
							<td class="px-3 py-2">{tx.merchant_name ?? tx.name ?? 'Unknown'}</td>
							<td class="px-3 py-2 text-right font-medium whitespace-nowrap">
								{formatCurrency(tx.amount, tx.iso_currency_code)}
							</td>
						</tr>
					{:else}
						<tr><td class="text-muted-foreground px-3 py-6 text-center">Nothing ignored.</td></tr>
					{/each}
				</tbody>
			</table>
		</Collapsible.Content>
	</Collapsible.Root>
</div>
