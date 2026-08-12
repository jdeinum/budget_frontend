<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { getAccountsContext } from '$lib/state/accounts.svelte';
	import { ACCOUNT_INSTITUTIONS, type AccountInstitution } from '$lib/types';
	import PlusIcon from '@lucide/svelte/icons/plus';

	const accountsStore = getAccountsContext();

	const INSTITUTION_LABELS: Record<AccountInstitution, string> = { neo: 'Neo', amex: 'Amex' };

	let open = $state(false);
	let institution = $state<AccountInstitution>(ACCOUNT_INSTITUTIONS[0]);
	let name = $state('');
	let submitting = $state(false);
	let errorMessage = $state<string | null>(null);

	function openDialog() {
		institution = ACCOUNT_INSTITUTIONS[0];
		name = '';
		submitting = false;
		errorMessage = null;
		open = true;
	}

	async function submit() {
		const trimmed = name.trim();
		if (!trimmed) {
			errorMessage = 'Give the account a name.';
			return;
		}
		submitting = true;
		errorMessage = null;
		const result = await accountsStore.createManual(institution, trimmed);
		submitting = false;
		if (!result.ok) {
			errorMessage = result.error;
			return;
		}
		open = false;
	}
</script>

<button
	type="button"
	onclick={openDialog}
	class="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
>
	<PlusIcon class="size-4" />
	New account
</button>

<Dialog.Root bind:open>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>New account</Dialog.Title>
			<Dialog.Description>
				Creates an account with no connected bank, for statement imports — which institution it's
				with picks which statement format its uploads are matched against.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4">
			<div class="space-y-1.5">
				<Label for="new-account-institution">Institution</Label>
				<Select.Root type="single" bind:value={institution}>
					<Select.Trigger id="new-account-institution" class="w-full">
						{INSTITUTION_LABELS[institution]}
					</Select.Trigger>
					<Select.Content>
						{#each ACCOUNT_INSTITUTIONS as option (option)}
							<Select.Item value={option} label={INSTITUTION_LABELS[option]} />
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<div class="space-y-1.5">
				<Label for="new-account-name">Name</Label>
				<Input
					id="new-account-name"
					bind:value={name}
					placeholder="e.g. Neo Mastercard"
					onkeydown={(e) => e.key === 'Enter' && submit()}
				/>
			</div>
		</div>

		{#if errorMessage}
			<p class="text-sm text-destructive">{errorMessage}</p>
		{/if}

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
			<Button disabled={submitting || !name.trim()} onclick={submit}>
				{submitting ? 'Creating…' : 'Create'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
