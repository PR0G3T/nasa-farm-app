import { describe, expect, it } from 'vitest';
import { find, type Field } from './data.js';

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
