import { describe, expect, it } from 'vitest';
import { find, practice, same, type Field } from './data.js';

const fields = (names: string[]): Field[] =>
	names.map((name) => ({
		id: name,
		name,
		crop: 'x',
		ha: 1,
		center: [0, 0],
		ring: [[0, 0]]
	}));

describe('find', () => {
	const list = fields(['North 40', 'Creek Bottom', 'P1036']);

	it('returns everything on a blank query', () => {
		expect(find(list, '')).toHaveLength(list.length);
		expect(find(list, '   ')).toHaveLength(list.length);
	});

	it('matches case-insensitive substrings', () => {
		expect(find(list, 'NORTH').map((field) => field.id)).toEqual(['North 40']);
		expect(find(list, 'p10').map((field) => field.id)).toEqual(['P1036']);
	});

	it('returns nothing on no match', () => {
		expect(find(list, 'zzz')).toHaveLength(0);
	});
});

const field = (kinds: (string | null)[] | undefined): Field => ({
	...fields(['f'])[0],
	kinds
});

describe('practice', () => {
	it('continues an alternating corn/soy cycle', () => {
		const kinds = ['maize', 'soybean', 'maize', 'soybean', 'maize', 'soybean'];
		expect(practice(field(kinds), 3)).toEqual(['maize', 'soybean', 'maize']);
		expect(practice(field(kinds), 2)).toEqual(['maize', 'soybean']);
	});

	it('replays a three-crop cycle from where it stopped', () => {
		const kinds = ['maize', 'soybean', 'wheat', 'maize', 'soybean', 'wheat', 'maize'];
		expect(practice(field(kinds), 3)).toEqual(['soybean', 'wheat', 'maize']);
	});

	it('repeats a monoculture', () => {
		expect(practice(field(['alfalfa', 'alfalfa', 'alfalfa']), 2)).toEqual([
			'alfalfa',
			'alfalfa'
		]);
	});

	it('replays the full history when nothing repeats', () => {
		const kinds = ['maize', 'wheat', 'soybean'];
		expect(practice(field(kinds), 4)).toEqual(['maize', 'wheat', 'soybean', 'maize']);
	});

	it('drops unmapped years', () => {
		expect(practice(field(['maize', null, 'soybean', 'maize']), 2)).toEqual([
			'maize',
			'soybean'
		]);
	});

	it('is undefined without history', () => {
		expect(practice(field(undefined), 3)).toBeUndefined();
		expect(practice(field([]), 3)).toBeUndefined();
	});
});

describe('same', () => {
	it('compares rotations element-wise', () => {
		expect(same(['maize', 'soybean'], ['maize', 'soybean'])).toBe(true);
		expect(same(['maize', 'soybean'], ['soybean', 'maize'])).toBe(false);
		expect(same(['maize'], ['maize', 'soybean'])).toBe(false);
	});
});
