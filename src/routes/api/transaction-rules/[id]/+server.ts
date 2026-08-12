import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params, fetch }) => {
	const baseUrl = env.API_BASE_URL ?? 'http://localhost:3000';
	const res = await fetch(`${baseUrl}/transaction-rules/${params.id}`, { method: 'DELETE' });
	if (!res.ok) {
		return json({ error: await res.text() }, { status: res.status });
	}
	return new Response(null, { status: res.status });
};
