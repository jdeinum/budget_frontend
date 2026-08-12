<script lang="ts">
	import { page } from '$app/state';
	import { cn } from '$lib/utils';
	import SettingsIcon from '@lucide/svelte/icons/settings';

	const links = [
		{ href: '/accounts', label: 'Accounts' },
		{ href: '/merchants', label: 'Merchants' },
		{ href: '/transactions', label: 'Transactions' }
	];

	function isActive(href: string): boolean {
		return page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
	}
</script>

<header class="bg-card border-b">
	<div class="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
		<a href="/" class="text-xl font-bold tracking-tighter lowercase">nil</a>
		<nav class="flex items-center gap-1">
			{#each links as link (link.href)}
				<a
					href={link.href}
					class={cn(
						'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
						isActive(link.href)
							? 'bg-muted text-foreground'
							: 'text-muted-foreground hover:bg-muted hover:text-foreground'
					)}
				>
					{link.label}
				</a>
			{/each}
			<a
				href="/settings"
				aria-label="Settings"
				class={cn(
					'ml-2 rounded-md border-l py-1.5 pr-1 pl-3 transition-colors',
					isActive('/settings')
						? 'text-foreground'
						: 'text-muted-foreground hover:text-foreground'
				)}
			>
				<SettingsIcon class="size-4" />
			</a>
		</nav>
	</div>
</header>
