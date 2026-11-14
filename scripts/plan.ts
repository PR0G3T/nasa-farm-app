// Regenerate static/plan.json — parcels from apicarto → nasa-farm export.
// Usage: bun scripts/plan.ts [scenario[:k=v,...]]...
// Default scenarios: baseline, warm (+2°C), dry (-20% precip).

import { fileURLToPath } from 'node:url';
import { parse, url } from '../src/lib/parcels.ts';

const app = fileURLToPath(new URL('..', import.meta.url));
const farm = fileURLToPath(new URL('../../nasa-farm', import.meta.url));
const args = process.argv.slice(2);
const scenarios = args.length
	? args
	: ['baseline', 'warm:delta_t=2', 'dry:precip_scale=0.8'];

const res = await fetch(url());
if (!res.ok) throw new Error(`apicarto ${res.status}`);
const pts = parse(await res.json()).map((f) => ({
	id: f.id,
	name: f.name,
	crop: f.crop,
	ha: f.ha,
	lat: f.center[1],
	lon: f.center[0]
}));
console.log(`${pts.length} parcels → ${scenarios.join(', ')}`);

const envFile = `${farm}/.env`;
const proc = Bun.spawn(
	[
		'uv', 'run', '--directory', farm,
		...(await Bun.file(envFile).exists() ? ['--env-file', envFile] : []),
		'nasa-farm', 'export',
		'--fields', '-', '--out', `${app}/static/plan.json`,
		...scenarios.flatMap((s) => ['--scenario', s])
	],
	{ stdin: 'pipe', stdout: 'inherit', stderr: 'inherit' }
);
proc.stdin.write(JSON.stringify(pts));
proc.stdin.end();
process.exit(await proc.exited);
