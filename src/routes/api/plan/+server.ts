import { error, json } from '@sveltejs/kit';
import { FARM_API } from '$app/env/private';
import { parameters as scenarioParams, pick, planFile } from '#lib/farm.js';
import type { RequestHandler } from './$types';

type Body = { id?: unknown; lat?: unknown; lon?: unknown; scenario?: unknown };

export const POST: RequestHandler = async ({ request, fetch }) => {
	const { id, lat, lon, scenario } = (await request.json()) as Body;
	if (typeof id !== 'string' || typeof lat !== 'number' || typeof lon !== 'number')
		error(400, 'id, lat, lon required');
	const resolved = typeof scenario === 'string' ? scenario : 'baseline';
	const file = await planFile(fetch);

	if (FARM_API) {
		try {
			const response = await fetch(`${FARM_API}/v1/plan`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ points: [{ id, lat, lon }], ...scenarioParams(file, resolved) }),
				signal: AbortSignal.timeout(30_000)
			});
			if (response.ok) return json(await response.json());
		} catch {
			/* fall through to static */
		}
	}

	const match = pick(file, id, resolved);
	if (!match) error(404, 'no plan for field');
	return json({ results: [{ point: { id, lat, lon }, ...match }] });
};
