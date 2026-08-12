import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// Standalone Node server for the Docker image (see ../Dockerfile) —
			// runs as `node build`, no host-platform adapter needed.
			adapter: adapter()
		})
	],
	ssr: {
		// bits-ui (the shadcn-svelte primitives) ships raw .svelte source rather
		// than precompiled JS. Without this, Vite's SSR module loader treats it
		// as an external node_modules dependency and hands it to Node's native
		// loader, which can't parse .svelte files ("Unknown file extension").
		// noExternal forces Vite to transform it like any other app source file.
		noExternal: ['bits-ui']
	},
	server: {
		watch: {
			// .direnv/flake-inputs holds the entire nixpkgs source tree pulled in
			// by the dev shell's flake — hundreds of thousands of files. Vite's
			// watcher walking it exhausts the OS file-watcher limit (ENOSPC) and
			// crashes the dev server; none of it is app source, so exclude it.
			ignored: ['**/.direnv/**']
		}
	}
});
