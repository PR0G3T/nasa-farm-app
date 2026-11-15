import { defineEnvVars } from '@sveltejs/kit/env';

const PROD_API = 'https://41kbfozcezrjypq1ig3vgwro.d3vex.fr';

export const variables = defineEnvVars({
	FARM_API: {
		schema: (value) => value || PROD_API,
		description: 'nasa-farm API base URL — set only for local backend dev'
	}
});
