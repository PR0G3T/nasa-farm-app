import { error } from '@sveltejs/kit';
import { parse, url } from '#lib/rpg.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const res = await fetch(url());
	if (!res.ok) error(502, 'Cadastral parcels unavailable');
	return { fields: parse(await res.json()) };
};
