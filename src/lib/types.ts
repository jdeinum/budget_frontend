export interface TagValue {
	name: string;
	value: string;
}

/** Where an account or transaction's data came from. `plaid` is a live
 * sync; `neo`/`amex` are that issuer's statement format (an account
 * declares one of these at creation, which picks the importer its
 * uploads go through); `manual` is a single hand-entered transaction —
 * it never appears on an account, only a transaction. */
export type Source = 'plaid' | 'neo' | 'amex' | 'manual';

/** The institutions `CreateAccount` can create an account as. */
export const ACCOUNT_INSTITUTIONS = ['neo', 'amex'] as const;
export type AccountInstitution = (typeof ACCOUNT_INSTITUTIONS)[number];

export interface Transaction {
	id: string;
	/** `null` for a manually-imported transaction. */
	item_id: string | null;
	source: Source;
	account_id: string;
	amount: number;
	iso_currency_code: string | null;
	date: string;
	datetime: string | null;
	name: string | null;
	merchant_name: string | null;
	pending: boolean;
	payment_channel: string | null;
	merchant_id: string | null;
	ignored: boolean;
	tags: TagValue[];
}

export interface Page<T> {
	items: T[];
	next_cursor: string | null;
}

export interface Merchant {
	id: string;
	name: string;
	entity_id: string | null;
	created_at: string;
	updated_at: string;
	tags: TagValue[];
}

export interface Account {
	id: string;
	/** `null` for a manually-created account. */
	item_id: string | null;
	/** `plaid` for a synced account, or the institution it was declared
	 * as when created manually (`neo`/`amex`) — never `manual`, an
	 * account always has some real institution behind it. */
	source: Source;
	name: string;
	created_at: string;
	updated_at: string;
	tags: TagValue[];
}

export interface FailedFile {
	filename: string;
	error: string;
}

export interface ImportSummary {
	inserted: number;
	skipped_duplicates: number;
	failed: FailedFile[];
}

export interface Item {
	id: string;
	plaid_item_id: string;
	institution_id: string | null;
	cursor: string | null;
	created_at: string;
	updated_at: string;
}

export interface MerchantCategory {
	id: string;
	merchant_id: string;
	category_primary: string | null;
	category_detailed: string | null;
	effective_from: string;
	effective_to: string | null;
	created_at: string;
}

export type RuleKind = 'merchant_contains' | 'tag' | 'account' | 'transfer';

export interface TransactionRule {
	id: string;
	kind: RuleKind;
	pattern: string | null;
	tag_name: string | null;
	tag_value: string | null;
	account_id: string | null;
	source_account_id: string | null;
	target_account_id: string | null;
	created_at: string;
}

export function getTag(tags: TagValue[], name: string): string | null {
	return tags.find((t) => t.name === name)?.value ?? null;
}
