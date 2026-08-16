import { describe, expect, test } from 'vitest';
import { CATEGORIES, categoryFor, guessCategory } from './categories';

describe('categoryFor', () => {
  test('returns the matching category', () => {
    expect(categoryFor('dairy').label).toBe('Dairy');
  });

  test('falls back to Other for an unknown key', () => {
    expect(categoryFor('nonsense').key).toBe('other');
  });

  test('falls back to Other when a product has no category', () => {
    expect(categoryFor(null).key).toBe('other');
  });

  test('every category carries an icon and a color', () => {
    for (const category of CATEGORIES) {
      expect(category.icon.length).toBeGreaterThan(0);
      expect(category.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  test('category keys are unique', () => {
    const keys = CATEGORIES.map((category) => category.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('guessCategory', () => {
  test('recognises a dairy product by name', () => {
    expect(guessCategory('Evaporated Milk 370ml')).toBe('dairy');
  });

  test('recognises bakery items', () => {
    expect(guessCategory('Pandesal')).toBe('bakery');
  });

  test('is case-insensitive', () => {
    expect(guessCategory('FRESH CHICKEN BREAST')).toBe('meat');
  });

  test('returns other when nothing matches', () => {
    expect(guessCategory('Assorted widgets')).toBe('other');
  });

  test('matches a whole word rather than a fragment', () => {
    // "hammer" contains "ham" — matching a fragment would call it meat.
    expect(guessCategory('Hammer')).toBe('other');
  });
});
