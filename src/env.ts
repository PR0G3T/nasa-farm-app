import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	FARM_API: {
		schema: (value) => value || 'https://41kbfozcezrjypq1ig3vgwro.d3vex.fr',
		description: 'nasa-farm API base URL — unset = deployed production API'
	}
});
