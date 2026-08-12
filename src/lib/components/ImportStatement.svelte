<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { getAccountsContext } from '$lib/state/accounts.svelte';
	import { ACCOUNT_INSTITUTIONS, type AccountInstitution, type ImportSummary } from '$lib/types';
	import UploadIcon from '@lucide/svelte/icons/upload';

	const accountsStore = getAccountsContext();

	const INSTITUTION_LABELS: Record<AccountInstitution, string> = { neo: 'Neo', amex: 'Amex' };

	// Sentinel value for the "create a new account" option in the account
	// select — not a real account id, so it can't collide with one.
	const NEW_ACCOUNT = '__new__';

	let open = $state(false);
	let selectedAccountId = $state(NEW_ACCOUNT);
	let newAccountInstitution = $state<AccountInstitution>(ACCOUNT_INSTITUTIONS[0]);
	let newAccountName = $state('');
	let files = $state<FileList | undefined>();
	let submitting = $state(false);
	let errorMessage = $state<string | null>(null);
	let lastSummary = $state<ImportSummary | null>(null);

	let selectedAccountLabel = $derived(
		selectedAccountId === NEW_ACCOUNT
			? '+ New account…'
			: (accountsStore.accounts.find((a) => a.id === selectedAccountId)?.name ?? '')
	);

	function openDialog() {
		selectedAccountId = accountsStore.accounts[0]?.id ?? NEW_ACCOUNT;
		newAccountInstitution = ACCOUNT_INSTITUTIONS[0];
		newAccountName = '';
		files = undefined;
		submitting = false;
		errorMessage = null;
		lastSummary = null;
		open = true;
	}

	async function submit() {
		const selectedFiles = files ? Array.from(files) : [];
		if (selectedFiles.length === 0) {
			errorMessage = 'Choose at least one file to upload.';
			return;
		}

		let accountId = selectedAccountId;
		if (accountId === NEW_ACCOUNT) {
			const name = newAccountName.trim();
			if (!name) {
				errorMessage = 'Name the new account.';
				return;
			}
			submitting = true;
			errorMessage = null;
			const created = await accountsStore.createManual(newAccountInstitution, name);
			if (!created.ok) {
				submitting = false;
				errorMessage = created.error;
				return;
			}
			accountId = created.account.id;
			selectedAccountId = accountId;
		}

		submitting = true;
		errorMessage = null;
		lastSummary = null;

		const result = await accountsStore.uploadStatement(accountId, selectedFiles);
		submitting = false;
		if (!result.ok) {
			errorMessage = result.error;
			return;
		}

		files = undefined;
		// A clean run (nothing failed) closes the dialog; a partial failure
		// stays open so the per-file errors are visible instead of vanishing
		// with it.
		if (result.summary.failed.length === 0) {
			open = false;
		} else {
			lastSummary = result.summary;
		}
	}
</script>

<Button variant="outline" onclick={openDialog}>
	<UploadIcon class="size-4" />
	Import statement
</Button>

<Dialog.Root bind:open>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Import a statement</Dialog.Title>
			<Dialog.Description>
				Upload one or more CSV exports from your bank or card issuer — each is matched against the
				selected account's institution. Transactions you've already imported are skipped, so it's
				safe to re-upload an overlapping statement.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4">
			<div class="space-y-1.5">
				<Label for="import-account">Account</Label>
				<Select.Root type="single" bind:value={selectedAccountId}>
					<Select.Trigger id="import-account" class="w-full">
						{selectedAccountLabel}
					</Select.Trigger>
					<Select.Content>
						{#each accountsStore.accounts as account (account.id)}
							<Select.Item value={account.id} label={account.name} />
						{/each}
						<Select.Item value={NEW_ACCOUNT} label="+ New account…" />
					</Select.Content>
				</Select.Root>
			</div>

			{#if selectedAccountId === NEW_ACCOUNT}
				<div class="space-y-1.5">
					<Label for="new-account-institution">Institution</Label>
					<Select.Root type="single" bind:value={newAccountInstitution}>
						<Select.Trigger id="new-account-institution" class="w-full">
							{INSTITUTION_LABELS[newAccountInstitution]}
						</Select.Trigger>
						<Select.Content>
							{#each ACCOUNT_INSTITUTIONS as option (option)}
								<Select.Item value={option} label={INSTITUTION_LABELS[option]} />
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<div class="space-y-1.5">
					<Label for="new-account-name">New account name</Label>
					<Input
						id="new-account-name"
						bind:value={newAccountName}
						placeholder="e.g. Neo Mastercard"
					/>
				</div>
			{/if}

			<div class="space-y-1.5">
				<Label for="statement-file">Statement file{files && files.length > 1 ? 's' : ''}</Label>
				<Input id="statement-file" type="file" accept=".csv" multiple bind:files />
			</div>

			{#if errorMessage}
				<p class="text-sm text-destructive">{errorMessage}</p>
			{:else if lastSummary}
				<div class="space-y-1 text-sm">
					<p class="text-muted-foreground">
						Imported {lastSummary.inserted} transaction{lastSummary.inserted === 1
							? ''
							: 's'}{#if lastSummary.skipped_duplicates > 0}
							, skipped {lastSummary.skipped_duplicates} already seen{/if}.
					</p>
					{#each lastSummary.failed as failure (failure.filename)}
						<p class="text-destructive">{failure.filename}: {failure.error}</p>
					{/each}
				</div>
			{/if}
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)}>Close</Button>
			<Button disabled={submitting || !files?.length} onclick={submit}>
				{submitting ? 'Importing…' : 'Import'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
