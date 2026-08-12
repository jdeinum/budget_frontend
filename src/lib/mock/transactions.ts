import type { Transaction } from '$lib/types';

// Deterministic PRNG (mulberry32) so the mock dataset — and therefore the
// charts — look the same across reloads/dev-server restarts, without needing
// a fixture file. Swap this module out for the real API once the backend is
// wired back in; nothing else depends on how transactions are sourced.
function mulberry32(seed: number) {
	return function () {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export interface Account {
	id: string;
	itemId: string;
	name: string;
}

export const ACCOUNTS: Account[] = [
	{ id: 'acc-checking', itemId: 'item-checking', name: 'Chase Total Checking' },
	{ id: 'acc-credit', itemId: 'item-credit', name: 'Chase Sapphire Preferred' },
	{ id: 'acc-savings', itemId: 'item-savings', name: 'Ally Online Savings' }
];

export function getMockAccounts(): Account[] {
	return ACCOUNTS;
}

interface CategoryConfig {
	category: string;
	detail: string;
	merchants: string[];
	amountRange: [number, number];
	/** Money in (negative amount), e.g. payroll deposits. */
	isIncome?: boolean;
	pattern:
		| { kind: 'weekly'; timesPerWeek: number }
		| { kind: 'monthly'; dayOfMonth: number; jitterDays?: number }
		| { kind: 'biweekly' }
		| { kind: 'sporadic'; chancePerWeek: number };
	paymentChannel: 'online' | 'in store';
	accountId: string;
}

const CATEGORIES: CategoryConfig[] = [
	{
		category: 'FOOD_AND_DRINK',
		detail: 'COFFEE_SHOP',
		merchants: ['Blue Bottle Coffee', 'Starbucks', 'Philz Coffee'],
		amountRange: [4, 12],
		pattern: { kind: 'weekly', timesPerWeek: 4 },
		paymentChannel: 'in store',
		accountId: 'acc-credit'
	},
	{
		category: 'FOOD_AND_DRINK',
		detail: 'GROCERIES',
		merchants: ['Whole Foods', "Trader Joe's", 'Safeway'],
		amountRange: [35, 140],
		pattern: { kind: 'weekly', timesPerWeek: 2 },
		paymentChannel: 'in store',
		accountId: 'acc-credit'
	},
	{
		category: 'FOOD_AND_DRINK',
		detail: 'RESTAURANT',
		merchants: ['Chipotle', 'Local Bistro', 'Ramen House', 'Pizzeria Napoli'],
		amountRange: [15, 75],
		pattern: { kind: 'weekly', timesPerWeek: 2 },
		paymentChannel: 'in store',
		accountId: 'acc-credit'
	},
	{
		category: 'TRANSPORTATION',
		detail: 'RIDESHARE',
		merchants: ['Uber', 'Lyft'],
		amountRange: [8, 45],
		pattern: { kind: 'weekly', timesPerWeek: 2 },
		paymentChannel: 'online',
		accountId: 'acc-credit'
	},
	{
		category: 'TRANSPORTATION',
		detail: 'GAS',
		merchants: ['Shell', 'Chevron', '76'],
		amountRange: [35, 70],
		pattern: { kind: 'weekly', timesPerWeek: 1 },
		paymentChannel: 'in store',
		accountId: 'acc-credit'
	},
	{
		category: 'GENERAL_MERCHANDISE',
		detail: 'ONLINE_MARKETPLACES',
		merchants: ['Amazon', 'Etsy'],
		amountRange: [15, 180],
		pattern: { kind: 'sporadic', chancePerWeek: 1.5 },
		paymentChannel: 'online',
		accountId: 'acc-credit'
	},
	{
		category: 'GENERAL_MERCHANDISE',
		detail: 'SUPERSTORES',
		merchants: ['Target', 'Costco', 'Walmart'],
		amountRange: [30, 220],
		pattern: { kind: 'weekly', timesPerWeek: 1 },
		paymentChannel: 'in store',
		accountId: 'acc-credit'
	},
	{
		category: 'ENTERTAINMENT',
		detail: 'TV_AND_MOVIES',
		merchants: ['Netflix', 'Max', 'Disney+'],
		amountRange: [9, 20],
		pattern: { kind: 'monthly', dayOfMonth: 5 },
		paymentChannel: 'online',
		accountId: 'acc-credit'
	},
	{
		category: 'ENTERTAINMENT',
		detail: 'MUSIC_AND_AUDIO',
		merchants: ['Spotify'],
		amountRange: [11, 11],
		pattern: { kind: 'monthly', dayOfMonth: 12 },
		paymentChannel: 'online',
		accountId: 'acc-credit'
	},
	{
		category: 'RENT_AND_UTILITIES',
		detail: 'RENT',
		merchants: ['Meridian Property Management'],
		amountRange: [2100, 2100],
		pattern: { kind: 'monthly', dayOfMonth: 1 },
		paymentChannel: 'online',
		accountId: 'acc-checking'
	},
	{
		category: 'RENT_AND_UTILITIES',
		detail: 'GAS_AND_ELECTRICITY',
		merchants: ['PG&E'],
		amountRange: [60, 190],
		pattern: { kind: 'monthly', dayOfMonth: 18, jitterDays: 3 },
		paymentChannel: 'online',
		accountId: 'acc-checking'
	},
	{
		category: 'RENT_AND_UTILITIES',
		detail: 'INTERNET_AND_CABLE',
		merchants: ['Comcast Xfinity'],
		amountRange: [80, 80],
		pattern: { kind: 'monthly', dayOfMonth: 22 },
		paymentChannel: 'online',
		accountId: 'acc-checking'
	},
	{
		category: 'TRAVEL',
		detail: 'LODGING',
		merchants: ['Airbnb', 'Marriott', 'Hilton'],
		amountRange: [180, 900],
		pattern: { kind: 'sporadic', chancePerWeek: 0.2 },
		paymentChannel: 'online',
		accountId: 'acc-credit'
	},
	{
		category: 'TRAVEL',
		detail: 'FLIGHTS',
		merchants: ['United Airlines', 'Delta', 'Alaska Airlines'],
		amountRange: [150, 650],
		pattern: { kind: 'sporadic', chancePerWeek: 0.15 },
		paymentChannel: 'online',
		accountId: 'acc-credit'
	},
	{
		category: 'MEDICAL',
		detail: 'PHARMACIES',
		merchants: ['CVS Pharmacy', 'Walgreens'],
		amountRange: [12, 60],
		pattern: { kind: 'sporadic', chancePerWeek: 0.4 },
		paymentChannel: 'in store',
		accountId: 'acc-credit'
	},
	{
		category: 'PERSONAL_CARE',
		detail: 'GYMS_AND_FITNESS_CENTERS',
		merchants: ['Equinox'],
		amountRange: [180, 180],
		pattern: { kind: 'monthly', dayOfMonth: 3 },
		paymentChannel: 'online',
		accountId: 'acc-checking'
	},
	{
		category: 'PERSONAL_CARE',
		detail: 'HAIR_AND_BEAUTY',
		merchants: ['Great Clips', 'The Blowout Bar'],
		amountRange: [25, 90],
		pattern: { kind: 'sporadic', chancePerWeek: 0.25 },
		paymentChannel: 'in store',
		accountId: 'acc-credit'
	},
	{
		category: 'INCOME',
		detail: 'PAYCHECK',
		merchants: ['Acme Corp Payroll'],
		amountRange: [-3200, -2600],
		isIncome: true,
		pattern: { kind: 'biweekly' },
		paymentChannel: 'online',
		accountId: 'acc-checking'
	},
	{
		category: 'INCOME',
		detail: 'INTEREST',
		merchants: ['Ally Bank'],
		amountRange: [-9, -2],
		isIncome: true,
		pattern: { kind: 'monthly', dayOfMonth: 28 },
		paymentChannel: 'online',
		accountId: 'acc-savings'
	}
];

function toDateOnly(date: Date): string {
	return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
}

function occurrenceDates(
	config: CategoryConfig,
	start: Date,
	end: Date,
	rand: () => number
): Date[] {
	const dates: Date[] = [];
	const totalDays = Math.round((end.getTime() - start.getTime()) / 86_400_000);

	switch (config.pattern.kind) {
		case 'weekly': {
			for (let day = 0; day <= totalDays; day++) {
				if (rand() < config.pattern.timesPerWeek / 7) {
					dates.push(addDays(start, day));
				}
			}
			break;
		}
		case 'sporadic': {
			for (let day = 0; day <= totalDays; day++) {
				if (rand() < config.pattern.chancePerWeek / 7) {
					dates.push(addDays(start, day));
				}
			}
			break;
		}
		case 'biweekly': {
			for (let day = 0; day <= totalDays; day += 14) {
				dates.push(addDays(start, day));
			}
			break;
		}
		case 'monthly': {
			const cursor = new Date(start.getFullYear(), start.getMonth(), config.pattern.dayOfMonth);
			while (cursor <= end) {
				if (cursor >= start) {
					const jitter = config.pattern.jitterDays
						? Math.floor((rand() - 0.5) * 2 * config.pattern.jitterDays)
						: 0;
					dates.push(addDays(cursor, jitter));
				}
				cursor.setMonth(cursor.getMonth() + 1);
			}
			break;
		}
	}
	return dates;
}

function pick<T>(items: T[], rand: () => number): T {
	return items[Math.floor(rand() * items.length)];
}

/** Generates a realistic, seeded-deterministic dataset spanning `days` up to today. */
export function generateMockTransactions(days = 365, seed = 20260809): Transaction[] {
	const rand = mulberry32(seed);
	const end = new Date();
	end.setHours(0, 0, 0, 0);
	const start = addDays(end, -days);

	const transactions: Transaction[] = [];
	let counter = 0;

	const accountsById = new Map(ACCOUNTS.map((a) => [a.id, a]));

	for (const config of CATEGORIES) {
		const account = accountsById.get(config.accountId)!;
		for (const date of occurrenceDates(config, start, end, rand)) {
			const [min, max] = config.amountRange;
			const amount = Math.round((min + rand() * (max - min)) * 100) / 100;
			const merchant = pick(config.merchants, rand);
			counter += 1;

			transactions.push({
				id: `mock-${counter}-${date.getTime()}`,
				item_id: account.itemId,
				source: 'plaid',
				account_id: account.id,
				amount,
				iso_currency_code: 'USD',
				date: toDateOnly(date),
				datetime: null,
				name: merchant,
				merchant_name: merchant,
				pending: date.getTime() > addDays(end, -2).getTime() && rand() < 0.3,
				payment_channel: config.paymentChannel,
				merchant_id: null,
				ignored: false,
				tags: [
					{ name: 'category', value: config.category },
					{ name: 'category_detail', value: config.detail }
				]
			});
		}
	}

	return transactions.sort((a, b) => b.date.localeCompare(a.date));
}
