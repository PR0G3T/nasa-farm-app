import { error, json } from '@sveltejs/kit';
import { FARM_API } from '$app/env/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, fetch }) => {
	if (!FARM_API) error(503, 'no field api');
	try {
		const response = await fetch(`${FARM_API}/v1/field/${encodeURIComponent(params.id)}`, {
			signal: AbortSignal.timeout(5_000)
		});
		if (response.ok) return json(await response.json());
		error(response.status === 404 ? 404 : 502, 'field lookup failed');
	} catch (cause) {
		if (cause && typeof cause === 'object' && 'status' in cause) throw cause;
		error(502, 'field api unreachable');
	}
};
