import { listTransactionRules, listTransactions } from '$lib/server/api';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [rules, ignoredPage] = await Promise.all([
		listTransactionRules(),
		listTransactions({ ignoredOnly: true, limit: 200 })
	]);
	return {
		rules,
		ignored: ignoredPage.items,
		ignoredMayBeTruncated: ignoredPage.next_cursor !== null
	};
};
