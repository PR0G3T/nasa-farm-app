import { error, json } from '@sveltejs/kit';
import { FARM_API } from '$app/env/private';
import { parameters as scenarioParams, planFile, shard, site } from '#lib/farm.js';
import type { RequestHandler } from './$types';

type Body = { id?: unknown; latitude?: unknown; longitude?: unknown; scenario?: unknown };

export const POST: RequestHandler = async ({ request, fetch }) => {
	const { id, latitude, longitude, scenario } = (await request.json()) as Body;
	if (
		typeof id !== 'string' ||
		typeof latitude !== 'number' ||
		typeof longitude !== 'number'
	)
		error(400, 'id, latitude, longitude required');
	const resolved = typeof scenario === 'string' ? scenario : 'baseline';
	const file = await planFile(fetch);

	if (FARM_API) {
		try {
			const response = await fetch(`${FARM_API}/v1/plan`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					points: [{ id, latitude, longitude }],
					...scenarioParams(file, resolved)
				}),
				signal: AbortSignal.timeout(30_000)
			});
			if (response.ok) return json(await response.json());
		} catch {
			/* fall through to static */
		}
	}

	if (!file) error(503, 'no plan index');
	const stored = await shard(fetch, id);
	const match = stored?.scenarios?.[resolved];
	if (!match) error(404, 'no plan for field');
	return json({
		results: [
			{ ...site(match), history: stored?.history, point: { id, latitude, longitude } }
		],
		columns: file.columns,
		directions: file.directions,
		rotations: file.rotations
	});
};
