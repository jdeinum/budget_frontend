import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Re-packs the incoming multipart body into a fresh FormData rather than
// streaming it straight through, so fetch handles the multipart encoding
// (boundary, headers) itself instead of us reasoning about passthrough
// streaming semantics. The browser may send several files all under the
// "file" field name (see ImportStatement.svelte's `multiple` file input) —
// forward every one of them, not just the first.
export const POST: RequestHandler = async ({ params, request, fetch }) => {
	const incoming = await request.formData();
	const files = incoming.getAll('file').filter((f): f is File => f instanceof File);
	if (files.length === 0) {
		return json({ error: 'missing "file" field' }, { status: 400 });
	}

	const outgoing = new FormData();
	for (const file of files) outgoing.append('file', file, file.name);

	const baseUrl = env.API_BASE_URL ?? 'http://localhost:3000';
	const res = await fetch(`${baseUrl}/accounts/${params.id}/statements`, {
		method: 'POST',
		body: outgoing
	});
	if (!res.ok) {
		return json({ error: await res.text() }, { status: res.status });
	}
	return json(await res.json());
};
