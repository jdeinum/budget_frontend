export function formatCategory(category: string | null): string {
	if (!category) return 'Uncategorized';
	return category
		.toLowerCase()
		.split('_')
		.map((word) => word[0].toUpperCase() + word.slice(1))
		.join(' ');
}

export function formatCurrency(amount: number, currency: string | null): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: currency ?? 'USD'
	}).format(amount);
}

export function formatDate(date: string): string {
	return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	});
}
