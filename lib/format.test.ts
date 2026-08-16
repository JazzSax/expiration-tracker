import { describe, expect, test } from 'vitest';
import { formatCountdown, formatStamp } from './format';

describe('formatStamp', () => {
  test('renders the carton-stamp form of a date', () => {
    expect(formatStamp('2026-09-04')).toBe('04 SEP 26');
  });

  test('pads a single-digit day', () => {
    expect(formatStamp('2026-12-01')).toBe('01 DEC 26');
  });
});

describe('formatCountdown', () => {
  test('names today rather than counting zero', () => {
    expect(formatCountdown(0)).toBe('Today');
  });

  test('names tomorrow', () => {
    expect(formatCountdown(1)).toBe('Tomorrow');
  });

  test('counts the days ahead', () => {
    expect(formatCountdown(9)).toBe('9 days');
  });

  test('counts a single day ahead without pluralising', () => {
    expect(formatCountdown(2)).toBe('2 days');
  });

  test('says how long something has been over', () => {
    expect(formatCountdown(-3)).toBe('3 days over');
  });

  test('does not pluralise a single day over', () => {
    expect(formatCountdown(-1)).toBe('1 day over');
  });
});
