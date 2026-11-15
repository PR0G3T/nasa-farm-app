import { FARM_API } from '$app/env/private';
import { names, planFile } from '#lib/farm.js';
import type { Stats } from '#lib/layers.js';
import { parse } from '#lib/parcels.js';
import type { PageServerLoad } from './$types';

const parcels = async (fetcher: typeof fetch) => {
	try {
		const response = await fetcher('/fields.geojson');
		return response.ok ? parse(await response.json()) : [];
	} catch {
		return [];
	}
};

const live = (fetcher: typeof fetch) =>
	FARM_API
		? fetcher(`${FARM_API}/healthz`, { signal: AbortSignal.timeout(3_000) })
				.then((response) => response.ok)
				.catch(() => false)
		: Promise.resolve(false);

const catalog = async (fetcher: typeof fetch): Promise<Stats> => {
	try {
		const response = await fetcher('/layers.json');
		if (!response.ok) return {};
		const payload = (await response.json()) as { stats?: Stats };
		return payload.stats ?? {};
	} catch {
		return {};
	}
};

export const load: PageServerLoad = async ({ fetch }) => {
	const [fields, file, reachable, stats] = await Promise.all([
		parcels(fetch),
		planFile(fetch),
		live(fetch),
		catalog(fetch)
	]);
	return { fields, scenarios: names(file), live: reachable, stats };
};
