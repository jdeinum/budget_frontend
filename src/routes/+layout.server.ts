import { fetchAllMerchants, fetchAllTransactions, listAccounts, listItems } from '$lib/server/api';
import type { LayoutServerLoad } from './$types';

// Loaded once here and shared by every route via the transactions/merchants/
// accounts/items stores (see $lib/state/*.svelte.ts) — tag edits and renames
// then update those stores locally (they've already round-tripped to the
// backend by the time they touch this data) rather than re-fetching.
export const load: LayoutServerLoad = async () => {
	const [transactions, merchants, accounts, items] = await Promise.all([
		fetchAllTransactions(),
		fetchAllMerchants(),
		listAccounts(),
		listItems()
	]);
	return { transactions, merchants, accounts, items };
};
