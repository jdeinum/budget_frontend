import { env } from '$env/dynamic/private';
import type { Account, Item, Merchant, MerchantCategory, Page, Transaction, TransactionRule } from '$lib/types';

// This module is for server-side `load` functions only, where throwing on a
// non-OK response is the right behavior (SvelteKit turns it into a 500).
// Browser-triggered mutations (tagging, renaming) instead go through
// same-origin proxy routes under routes/api/, which do their own raw fetch
// so the backend's real status code (e.g. a 404) reaches the browser
// unchanged — see routes/api/plaid/items/+server.ts for the pattern.

function baseUrl(): string {
	return env.API_BASE_URL ?? 'http://localhost:3000';
}

async function get<T>(path: string): Promise<T> {
	const res = await fetch(`${baseUrl()}${path}`);
	if (!res.ok) {
		throw new Error(`${path} -> ${res.status} ${await res.text()}`);
	}
	return res.json();
}

async function post<T>(path: string): Promise<T> {
	const res = await fetch(`${baseUrl()}${path}`, { method: 'POST' });
	if (!res.ok) {
		throw new Error(`${path} -> ${res.status} ${await res.text()}`);
	}
	return res.json();
}

export interface ItemSyncResult {
	item_id: string;
	plaid_item_id: string;
	summary: { added: number; modified: number; removed: number } | null;
	error: string | null;
}

export function syncAllItems(): Promise<ItemSyncResult[]> {
	return post('/plaid/items/sync');
}

export interface TransactionsQuery {
	startDate?: string;
	endDate?: string;
	tags?: Array<{ name: string; value: string }>;
	excludeTags?: Array<{ name: string; value: string }>;
	q?: string;
	/** `field:dir`, e.g. `amount:asc`. Defaults to `date:desc` on the backend. */
	sort?: string;
	cursor?: string;
	limit?: number;
	/** Returns only ignored transactions instead of the normal default of excluding them. */
	ignoredOnly?: boolean;
}

function tagsParam(tags: Array<{ name: string; value: string }>): string {
	return tags.map((t) => `${t.name}:${t.value}`).join(',');
}

export function listTransactions(query: TransactionsQuery = {}): Promise<Page<Transaction>> {
	const params = new URLSearchParams();
	if (query.startDate) params.set('start_date', query.startDate);
	if (query.endDate) params.set('end_date', query.endDate);
	if (query.tags?.length) params.set('tags', tagsParam(query.tags));
	if (query.excludeTags?.length) params.set('exclude_tags', tagsParam(query.excludeTags));
	if (query.q) params.set('q', query.q);
	if (query.sort) params.set('sort', query.sort);
	if (query.cursor) params.set('cursor', query.cursor);
	if (query.limit) params.set('limit', String(query.limit));
	if (query.ignoredOnly) params.set('ignored_only', 'true');
	const qs = params.size ? `?${params}` : '';
	return get(`/transactions${qs}`);
}

/** Pages through `listTransactions` until `next_cursor` is null, into one
 * flat array — the multi-series comparison feature on `/transactions` needs
 * the full matching dataset client-side to slice by date/account/tag
 * combinations instantly with no round trip per toggle. Capped at
 * `maxPages` as a safety backstop against runaway datasets. */
export async function fetchAllTransactions(
	query: TransactionsQuery = {},
	maxPages = 20
): Promise<Transaction[]> {
	const all: Transaction[] = [];
	let cursor: string | undefined;
	for (let page = 0; page < maxPages; page++) {
		const result = await listTransactions({ ...query, cursor, limit: 200 });
		all.push(...result.items);
		if (!result.next_cursor) break;
		cursor = result.next_cursor;
	}
	return all;
}

export interface MerchantsQuery {
	cursor?: string;
	limit?: number;
	q?: string;
}

export function listMerchants(query: MerchantsQuery = {}): Promise<Page<Merchant>> {
	const params = new URLSearchParams();
	if (query.cursor) params.set('cursor', query.cursor);
	if (query.limit) params.set('limit', String(query.limit));
	if (query.q) params.set('q', query.q);
	const qs = params.size ? `?${params}` : '';
	return get(`/merchants${qs}`);
}

export async function fetchAllMerchants(query: MerchantsQuery = {}, maxPages = 20): Promise<Merchant[]> {
	const all: Merchant[] = [];
	let cursor: string | undefined;
	for (let page = 0; page < maxPages; page++) {
		const result = await listMerchants({ ...query, cursor, limit: 200 });
		all.push(...result.items);
		if (!result.next_cursor) break;
		cursor = result.next_cursor;
	}
	return all;
}

export function merchantCategories(merchantId: string): Promise<MerchantCategory[]> {
	return get(`/merchants/${merchantId}/categories`);
}

export function listAccounts(): Promise<Account[]> {
	return get('/accounts');
}

export function listTransactionRules(): Promise<TransactionRule[]> {
	return get('/transaction-rules');
}

export function listItems(): Promise<Item[]> {
	return get('/plaid/items');
}
