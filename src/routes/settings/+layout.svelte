<script lang="ts">
	import { page } from '$app/state';
	import { cn } from '$lib/utils';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const sections = [{ href: '/settings/transactions', label: 'Transactions' }];

	function isActive(href: string): boolean {
		return page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
	}
</script>

<svelte:head>
	<title>nil · Settings</title>
</svelte:head>

<div class="mx-auto flex max-w-5xl gap-8 px-4 py-8">
	<nav class="w-44 shrink-0 space-y-1">
		<h1 class="text-muted-foreground px-3 pb-2 text-xs font-semibold tracking-wide uppercase">Settings</h1>
		{#each sections as section (section.href)}
			<a
				href={section.href}
				class={cn(
					'block rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
					isActive(section.href)
						? 'bg-muted text-foreground'
						: 'text-muted-foreground hover:bg-muted hover:text-foreground'
				)}
			>
				{section.label}
			</a>
		{/each}
	</nav>
	<div class="min-w-0 flex-1">
		{@render children()}
	</div>
</div>
