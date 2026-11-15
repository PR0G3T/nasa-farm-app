// Regenerate static/fields.geojson — USDA CSB field boundaries
// (+ real CDL rotation history) for the demo window, via `nasa-farm fields`.
// Usage: bun scripts/fields.ts [extra nasa-farm fields args...]

import { fileURLToPath } from 'node:url';

const app = fileURLToPath(new URL('..', import.meta.url));
const farm = fileURLToPath(new URL('../../nasa-farm-jepa', import.meta.url));
const inputs = process.argv.slice(2);

const envFile = `${farm}/.env`;
const child = Bun.spawn(
	[
		'uv', 'run', '--directory', farm, '--extra', 'csb',
		...(await Bun.file(envFile).exists() ? ['--env-file', envFile] : []),
		'nasa-farm', 'fields',
		'--county', 'Story', '--bbox', '-93.78,41.86,-93.42,42.14',
		'--limit', '40', '--per-kind', '10', '--sequence',
		'--out', `${app}/static/fields.geojson`,
		...inputs
	],
	{ stdout: 'inherit', stderr: 'inherit' }
);
process.exit(await child.exited);
