<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Command from '$lib/components/ui/command/index.js';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { cn } from '$lib/utils';
	import { getAccountsContext } from '$lib/state/accounts.svelte';
	import { getTransactionsContext } from '$lib/state/transactions.svelte';
	import { getMerchantsContext } from '$lib/state/merchants.svelte';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import CheckIcon from '@lucide/svelte/icons/check';

	const accountsStore = getAccountsContext();
	const transactionsStore = getTransactionsContext();
	const merchantsStore = getMerchantsContext();

	type Kind = 'expense' | 'income';

	const KIND_LABELS: Record<Kind, string> = { expense: 'Expense', income: 'Income' };

	function todayISO(): string {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}

	let open = $state(false);
	let accountId = $state('');
	let date = $state(todayISO());
	let kind = $state<Kind>('expense');
	let magnitude = $state('');
	let name = $state('');
	let merchantId = $state<string | null>(null);
	let merchantPickerOpen = $state(false);
	let submitting = $state(false);
	let errorMessage = $state<string | null>(null);

	let accountName = $derived(accountsStore.accounts.find((a) => a.id === accountId)?.name);
	let merchantName = $derived(
		merchantId ? (merchantsStore.merchants.find((m) => m.id === merchantId)?.name ?? null) : null
	);

	function openDialog() {
		accountId = accountsStore.accounts[0]?.id ?? '';
		date = todayISO();
		kind = 'expense';
		magnitude = '';
		name = '';
		merchantId = null;
		submitting = false;
		errorMessage = null;
		open = true;
	}

	function pickMerchant(id: string | null) {
		merchantId = id;
		merchantPickerOpen = false;
	}

	async function submit() {
		if (!accountId) {
			errorMessage = 'Choose an account.';
			return;
		}
		const parsedMagnitude = Number(magnitude);
		if (!magnitude || !Number.isFinite(parsedMagnitude) || parsedMagnitude <= 0) {
			errorMessage = 'Enter an amount greater than zero.';
			return;
		}
		const trimmedName = name.trim();
		if (!trimmedName) {
			errorMessage = 'Give the transaction a description.';
			return;
		}

		submitting = true;
		errorMessage = null;
		// Positive = money out (an expense), negative = money in (income) —
		// same convention Plaid and every statement importer normalize to.
		const amount = kind === 'expense' ? parsedMagnitude : -parsedMagnitude;
		const result = await transactionsStore.createManual({
			accountId,
			date,
			amount,
			name: trimmedName,
			merchantId
		});
		submitting = false;
		if (!result.ok) {
			errorMessage = result.error;
			return;
		}
		open = false;
	}
</script>

<Button variant="outline" size="sm" class="gap-1.5" onclick={openDialog}>
	<PlusIcon class="size-4" />
	Add transaction
</Button>

<Dialog.Root bind:open>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Add a transaction</Dialog.Title>
			<Dialog.Description>
				Records a single hand-entered transaction against an existing account — for cash spend or
				anything else Plaid and statement imports never see.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4">
			<div class="space-y-1.5">
				<Label for="add-tx-account">Account</Label>
				<Select.Root type="single" bind:value={accountId}>
					<Select.Trigger id="add-tx-account" class="w-full">
						{accountName ?? 'Choose an account'}
					</Select.Trigger>
					<Select.Content>
						{#each accountsStore.accounts as account (account.id)}
							<Select.Item value={account.id} label={account.name} />
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-1.5">
					<Label for="add-tx-date">Date</Label>
					<Input id="add-tx-date" type="date" bind:value={date} />
				</div>
				<div class="space-y-1.5">
					<Label for="add-tx-kind">Type</Label>
					<Select.Root type="single" bind:value={kind}>
						<Select.Trigger id="add-tx-kind" class="w-full">
							{KIND_LABELS[kind]}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="expense" label="Expense" />
							<Select.Item value="income" label="Income" />
						</Select.Content>
					</Select.Root>
				</div>
			</div>

			<div class="space-y-1.5">
				<Label for="add-tx-amount">Amount</Label>
				<Input
					id="add-tx-amount"
					type="number"
					min="0"
					step="0.01"
					placeholder="0.00"
					bind:value={magnitude}
				/>
			</div>

			<div class="space-y-1.5">
				<Label for="add-tx-name">Description</Label>
				<Input
					id="add-tx-name"
					bind:value={name}
					placeholder="e.g. Cash tip"
					onkeydown={(e) => e.key === 'Enter' && submit()}
				/>
			</div>

			<div class="space-y-1.5">
				<Label for="add-tx-merchant">
					Merchant <span class="text-muted-foreground font-normal">(optional)</span>
				</Label>
				<Popover.Root bind:open={merchantPickerOpen}>
					<Popover.Trigger
						id="add-tx-merchant"
						class={cn(buttonVariants({ variant: 'outline' }), 'w-full justify-between font-normal')}
					>
						<span class="truncate">{merchantName ?? 'None — use the description above'}</span>
						<ChevronDownIcon class="size-4 shrink-0 opacity-50" />
					</Popover.Trigger>
					<Popover.Content class="w-(--bits-popover-anchor-width) p-0" align="start">
						<Command.Root>
							<Command.Input placeholder="Search merchants…" />
							<Command.List>
								<Command.Empty class="py-4 text-center text-sm text-muted-foreground">
									No matching merchant.
								</Command.Empty>
								<Command.Item value="__none__" onSelect={() => pickMerchant(null)}>
									None — use the description above
									{#if merchantId === null}
										<CheckIcon class="ml-auto size-3.5" />
									{/if}
								</Command.Item>
								{#each merchantsStore.merchants as merchant (merchant.id)}
									<Command.Item value={merchant.name} onSelect={() => pickMerchant(merchant.id)}>
										{merchant.name}
										{#if merchantId === merchant.id}
											<CheckIcon class="ml-auto size-3.5" />
										{/if}
									</Command.Item>
								{/each}
							</Command.List>
						</Command.Root>
					</Popover.Content>
				</Popover.Root>
			</div>

			{#if errorMessage}
				<p class="text-sm text-destructive">{errorMessage}</p>
			{/if}
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
			<Button disabled={submitting} onclick={submit}>
				{submitting ? 'Adding…' : 'Add'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
