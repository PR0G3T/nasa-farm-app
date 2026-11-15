// Regenerate static/plan.json + static/plan/{id}.json — CSB fields
// (static/fields.geojson, see scripts/fields.ts) → nasa-farm export
// (index + per-field shards).
// Usage: bun scripts/plan.ts [scenario[:k=v,...]]...
// Default scenarios: baseline, warm (+2°C), dry (-20% precip).

import { fileURLToPath } from 'node:url';
import { parse } from '../src/lib/parcels.ts';

const app = fileURLToPath(new URL('..', import.meta.url));
const farm = fileURLToPath(new URL('../../nasa-farm', import.meta.url));
const inputs = process.argv.slice(2);
const scenarios = inputs.length
	? inputs
	: ['baseline', 'warm:delta_t=2', 'dry:precip_scale=0.8'];

const collection = await Bun.file(`${app}/static/fields.geojson`).json();
const points = parse(collection).map((field) => ({
	id: field.id,
	name: field.name,
	crop: field.crop,
	ha: field.ha,
	latitude: field.center[1],
	longitude: field.center[0]
}));
console.log(`${points.length} fields → ${scenarios.join(', ')}`);

const envFile = `${farm}/.env`;
const child = Bun.spawn(
	[
		'uv', 'run', '--directory', farm,
		...(await Bun.file(envFile).exists() ? ['--env-file', envFile] : []),
		'nasa-farm', 'export',
		'--fields', '-', '--out', `${app}/static/plan.json`,
		'--crops', 'maize,soybean,wheat,alfalfa,sorghum,clover,fallow',
		...scenarios.flatMap((scenario) => ['--scenario', scenario])
	],
	{ stdin: 'pipe', stdout: 'inherit', stderr: 'inherit' }
);
child.stdin.write(JSON.stringify(points));
child.stdin.end();
process.exit(await child.exited);
