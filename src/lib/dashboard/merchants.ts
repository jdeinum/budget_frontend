import { getTag, type Merchant, type TagValue, type Transaction } from '$lib/types';

export interface MerchantSummary {
	id: string;
	name: string;
	category: string | null;
	transactionCount: number;
	totalSpent: number;
	lastDate: string | null;
	tags: TagValue[];
}

/** Joins real merchant entities with their transactions via `merchant_id` —
 * a merchant with no matching transactions yet (e.g. just auto-created)
 * still appears, with zeroed-out stats. */
export function summarizeMerchants(merchants: Merchant[], transactions: Transaction[]): MerchantSummary[] {
	const byMerchantId = new Map<string, Transaction[]>();
	for (const tx of transactions) {
		if (!tx.merchant_id) continue;
		const arr = byMerchantId.get(tx.merchant_id) ?? [];
		arr.push(tx);
		byMerchantId.set(tx.merchant_id, arr);
	}

	return merchants
		.map((m) => {
			const txs = byMerchantId.get(m.id) ?? [];
			const totalSpent = txs.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
			const lastDate = txs.reduce<string | null>(
				(max, t) => (max === null || t.date > max ? t.date : max),
				null
			);
			return {
				id: m.id,
				name: m.name,
				category: txs[0] ? getTag(txs[0].tags, 'category') : null,
				transactionCount: txs.length,
				totalSpent: Math.round(totalSpent * 100) / 100,
				lastDate,
				tags: m.tags
			};
		})
		.sort((a, b) => b.totalSpent - a.totalSpent);
}
