import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, fetch }) => {
	const body = await request.json();
	const baseUrl = env.API_BASE_URL ?? 'http://localhost:3000';
	const res = await fetch(`${baseUrl}/transaction-rules`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
	if (!res.ok) {
		return json({ error: await res.text() }, { status: res.status });
	}
	return json(await res.json());
};
