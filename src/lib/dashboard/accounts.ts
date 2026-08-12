import type { Account, TagValue, Transaction } from '$lib/types';

export interface AccountSummary {
	id: string;
	name: string;
	transactionCount: number;
	totalSpent: number;
	totalIncome: number;
	lastDate: string | null;
	tags: TagValue[];
}

export function summarizeAccounts(accounts: Account[], transactions: Transaction[]): AccountSummary[] {
	return accounts.map((account) => {
		const txs = transactions.filter((t) => t.account_id === account.id);
		const totalSpent = txs.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
		const totalIncome = txs.filter((t) => t.amount < 0).reduce((sum, t) => sum - t.amount, 0);
		const lastDate = txs.reduce<string | null>(
			(max, t) => (max === null || t.date > max ? t.date : max),
			null
		);
		return {
			id: account.id,
			name: account.name,
			transactionCount: txs.length,
			totalSpent: Math.round(totalSpent * 100) / 100,
			totalIncome: Math.round(totalIncome * 100) / 100,
			lastDate,
			tags: account.tags
		};
	});
}
