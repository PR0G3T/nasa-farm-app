import { FARM_API } from '$app/env/private';
import { names, planFile } from '#lib/farm.js';
import { parse, url } from '#lib/parcels.js';
import type { PageServerLoad } from './$types';

const parcels = async (fetcher: typeof fetch) => {
	try {
		const res = await fetcher(url());
		return res.ok ? parse(await res.json()) : [];
	} catch {
		return [];
	}
};

const live = (fetcher: typeof fetch) =>
	FARM_API
		? fetcher(`${FARM_API}/healthz`, { signal: AbortSignal.timeout(3_000) })
				.then((r) => r.ok)
				.catch(() => false)
		: Promise.resolve(false);

export const load: PageServerLoad = async ({ fetch }) => {
	const [fields, file, up] = await Promise.all([parcels(fetch), planFile(fetch), live(fetch)]);
	return { fields, scenarios: names(file), live: up };
};
