import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Thin same-origin proxy so the browser can page through transactions
// (client-driven "Load more") without needing CORS on the backend or
// exposing API_BASE_URL to the client.
export const GET: RequestHandler = async ({ url, fetch }) => {
	const baseUrl = env.API_BASE_URL ?? 'http://localhost:3000';
	const res = await fetch(`${baseUrl}/transactions${url.search}`);
	if (!res.ok) {
		return json({ error: await res.text() }, { status: res.status });
	}
	return json(await res.json());
};

export const POST: RequestHandler = async ({ request, fetch }) => {
	const body = await request.json();
	const baseUrl = env.API_BASE_URL ?? 'http://localhost:3000';
	const res = await fetch(`${baseUrl}/transactions`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
	if (!res.ok) {
		return json({ error: await res.text() }, { status: res.status });
	}
	return json(await res.json());
};
