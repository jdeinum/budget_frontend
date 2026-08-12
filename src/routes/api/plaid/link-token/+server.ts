import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// No auth/user system exists yet — this app is single-user, so a fixed
// client_user_id is correct today. Revisit if multi-user support is added.
const CLIENT_USER_ID = 'local-user';

export const POST: RequestHandler = async ({ fetch }) => {
	const baseUrl = env.API_BASE_URL ?? 'http://localhost:3000';
	const res = await fetch(`${baseUrl}/plaid/link-token`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ client_user_id: CLIENT_USER_ID })
	});
	if (!res.ok) {
		return json({ error: await res.text() }, { status: res.status });
	}
	return json(await res.json());
};
