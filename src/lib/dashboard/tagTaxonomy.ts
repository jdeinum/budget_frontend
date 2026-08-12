import type { TagValue, Transaction } from '$lib/types';

export interface TagTaxonomy {
	/** Distinct tag names ("categories"), sorted. */
	names: string[];
	/** Distinct values seen under each name, sorted. */
	valuesByName: Map<string, string[]>;
}

/** Builds the full known tag taxonomy from every transaction's tags plus
 * every merchant/account tag, for browsing and autocomplete. */
export function buildTagTaxonomy(transactions: Transaction[], otherTags: TagValue[]): TagTaxonomy {
	const byName = new Map<string, Set<string>>();

	function add(name: string, value: string) {
		const values = byName.get(name) ?? new Set<string>();
		values.add(value);
		byName.set(name, values);
	}

	for (const tx of transactions) {
		for (const tag of tx.tags) add(tag.name, tag.value);
	}
	for (const tag of otherTags) add(tag.name, tag.value);

	const names = [...byName.keys()].sort();
	const valuesByName = new Map(names.map((name) => [name, [...byName.get(name)!].sort()]));

	return { names, valuesByName };
}
