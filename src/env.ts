import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	FARM_API: {
		schema: (value) => value || undefined,
		description: 'nasa-farm API base URL — unset = static plan.json only'
	}
});
