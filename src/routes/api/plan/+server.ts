import { error, json } from '@sveltejs/kit';
import { FARM_API } from '$app/env/private';
import { params as scenarioParams, pick, planFile } from '#lib/farm.js';
import type { RequestHandler } from './$types';

type Body = { id?: unknown; lat?: unknown; lon?: unknown; scenario?: unknown };

export const POST: RequestHandler = async ({ request, fetch }) => {
	const { id, lat, lon, scenario } = (await request.json()) as Body;
	if (typeof id !== 'string' || typeof lat !== 'number' || typeof lon !== 'number')
		error(400, 'id, lat, lon required');
	const s = typeof scenario === 'string' ? scenario : 'baseline';
	const file = await planFile(fetch);

	if (FARM_API) {
		try {
			const res = await fetch(`${FARM_API}/v1/plan`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ points: [{ id, lat, lon }], ...scenarioParams(file, s) }),
				signal: AbortSignal.timeout(30_000)
			});
			if (res.ok) return json(await res.json());
		} catch {
			/* fall through to static */
		}
	}

	const hit = pick(file, id, s);
	if (!hit) error(404, 'no plan for field');
	return json({ results: [{ point: { id, lat, lon }, ...hit }] });
};
