import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// Re-exported for the generated shadcn-svelte components under
// $lib/components/ui, which import these type helpers from $lib/utils.
export type {
	WithElementRef,
	WithoutChild,
	WithoutChildren,
	WithoutChildrenOrChild
} from 'bits-ui';
