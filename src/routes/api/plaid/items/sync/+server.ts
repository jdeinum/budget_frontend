import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ fetch }) => {
	const baseUrl = env.API_BASE_URL ?? 'http://localhost:3000';
	const res = await fetch(`${baseUrl}/plaid/items/sync`, { method: 'POST' });
	if (!res.ok) {
		return json({ error: await res.text() }, { status: res.status });
	}
	return json(await res.json());
};
