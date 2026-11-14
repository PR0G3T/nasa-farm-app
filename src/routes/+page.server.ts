import { FARM_API } from '$app/env/private';
import { names, planFile } from '#lib/farm.js';
import { parse, url } from '#lib/parcels.js';
import type { PageServerLoad } from './$types';

const parcels = async (fetcher: typeof fetch) => {
	try {
		const response = await fetcher(url());
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

export const load: PageServerLoad = async ({ fetch }) => {
	const [fields, file, reachable] = await Promise.all([parcels(fetch), planFile(fetch), live(fetch)]);
	return { fields, scenarios: names(file), live: reachable };
};
