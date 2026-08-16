import { describe, expect, test } from 'vitest';
import { addDays, buildDigest, computeStage, daysBetween } from './expiry';
import type { BatchWithProduct, Product, Settings } from './types';

const TODAY = '2026-08-16';

const settings: Settings = {
  defaultWarnDays: 14,
  notifyHour: 8,
  notificationsEnabled: true,
  lastExportAt: null,
};

function product(over: Partial<Product> = {}): Product {
  return {
    id: 1,
    name: 'Evaporated Milk',
    barcode: null,
    unit: 'can',
    warnDays: null,
    category: 'dairy',
    isSample: false,
    ...over,
  };
}

function batch(expiresAt: string, over: Partial<BatchWithProduct> = {}): BatchWithProduct {
  return {
    id: 1,
    productId: 1,
    expiresAt,
    quantity: 12,
    location: null,
    status: 'active',
    discardedAt: null,
    discardedQuantity: null,
    createdAt: '2026-08-01',
    isSample: false,
    product: product(),
    ...over,
  };
}

describe('daysBetween', () => {
  test('counts calendar days forward', () => {
    expect(daysBetween('2026-08-16', '2026-08-20')).toBe(4);
  });

  test('returns a negative count for a past date', () => {
    expect(daysBetween('2026-08-16', '2026-08-14')).toBe(-2);
  });

  test('crosses a month boundary', () => {
    expect(daysBetween('2026-08-30', '2026-09-02')).toBe(3);
  });

  test('is unaffected by daylight-saving shifts', () => {
    // The US spring-forward night is 23 hours long; a naive ms/86400000
    // division would return 0.958 and floor to 0.
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2);
  });
});

describe('addDays', () => {
  test('rolls over into the next month', () => {
    expect(addDays('2026-08-30', 3)).toBe('2026-09-02');
  });

  test('subtracts with a negative count', () => {
    expect(addDays('2026-09-02', -3)).toBe('2026-08-30');
  });
});

describe('computeStage', () => {
  test('yesterday is expired', () => {
    expect(computeStage(batch('2026-08-15'), settings, TODAY)).toBe('expired');
  });

  test('today is urgent, not expired', () => {
    expect(computeStage(batch('2026-08-16'), settings, TODAY)).toBe('urgent');
  });

  test('tomorrow is urgent', () => {
    expect(computeStage(batch('2026-08-17'), settings, TODAY)).toBe('urgent');
  });

  test('two days out falls back to soon', () => {
    expect(computeStage(batch('2026-08-18'), settings, TODAY)).toBe('soon');
  });

  test('the last day inside the warn window is still soon', () => {
    expect(computeStage(batch('2026-08-30'), settings, TODAY)).toBe('soon');
  });

  test('one day past the warn window is ok', () => {
    expect(computeStage(batch('2026-08-31'), settings, TODAY)).toBe('ok');
  });

  test("a product's own warnDays beats the global default", () => {
    const bread = batch('2026-08-25', { product: product({ name: 'Bread', warnDays: 2 }) });
    expect(computeStage(bread, settings, TODAY)).toBe('ok');
  });

  test('a product warnDays of 0 disables the soon warning entirely', () => {
    const canned = batch('2026-08-20', { product: product({ warnDays: 0 }) });
    expect(computeStage(canned, settings, TODAY)).toBe('ok');
  });
});

describe('buildDigest', () => {
  const milk = product({ id: 1, name: 'Evaporated Milk' });
  const bread = product({ id: 2, name: 'Pandesal', warnDays: 3 });

  test('counts each stage and the active total', () => {
    const digest = buildDigest(
      [
        batch('2026-08-10', { id: 1, product: milk }), // expired
        batch('2026-08-16', { id: 2, product: milk }), // urgent
        batch('2026-08-22', { id: 3, product: milk }), // soon
        batch('2026-12-01', { id: 4, product: milk }), // ok
      ],
      settings,
      TODAY,
    );

    expect(digest.counts).toEqual({ expired: 1, urgent: 1, soon: 1, ok: 1, total: 4 });
  });

  test('pools every batch of one product into a single group', () => {
    const digest = buildDigest(
      [
        batch('2026-08-20', { id: 1, quantity: 10, product: milk }),
        batch('2026-08-22', { id: 2, quantity: 5, product: milk }),
      ],
      settings,
      TODAY,
    );

    expect(digest.groups).toHaveLength(1);
    expect(digest.groups[0].batches).toHaveLength(2);
    expect(digest.groups[0].totalQuantity).toBe(15);
  });

  test('a group takes the worst stage and fewest days left of its batches', () => {
    const digest = buildDigest(
      [
        batch('2026-08-22', { id: 1, product: milk }), // soon
        batch('2026-08-15', { id: 2, product: milk }), // expired
      ],
      settings,
      TODAY,
    );

    expect(digest.groups[0].stage).toBe('expired');
    expect(digest.groups[0].daysLeft).toBe(-1);
  });

  test('orders groups expired, then urgent, then soon', () => {
    const digest = buildDigest(
      [
        batch('2026-08-18', { id: 1, product: milk }), // soon
        batch('2026-08-01', { id: 2, product: bread }), // expired
      ],
      settings,
      TODAY,
    );

    expect(digest.groups.map((g) => g.product.name)).toEqual(['Pandesal', 'Evaporated Milk']);
  });

  test('leaves healthy stock out of the groups but keeps it in the total', () => {
    const digest = buildDigest([batch('2026-12-01', { product: milk })], settings, TODAY);

    expect(digest.groups).toEqual([]);
    expect(digest.counts.total).toBe(1);
  });

  test('includes healthy stock in the groups when asked for everything', () => {
    const digest = buildDigest(
      [batch('2026-12-01', { id: 1, product: milk }), batch('2026-08-18', { id: 2, product: bread })],
      settings,
      TODAY,
      { include: 'all' },
    );

    expect(digest.groups).toHaveLength(2);
    // Healthy stock still sorts last.
    expect(digest.groups.map((g) => g.stage)).toEqual(['soon', 'ok']);
  });

  test('ignores discarded batches entirely', () => {
    const digest = buildDigest(
      [
        batch('2026-08-10', { id: 1, status: 'discarded', discardedAt: '2026-08-11', product: milk }),
        batch('2026-08-22', { id: 2, product: milk }),
      ],
      settings,
      TODAY,
    );

    expect(digest.counts).toEqual({ expired: 0, urgent: 0, soon: 1, ok: 0, total: 1 });
    expect(digest.groups).toHaveLength(1);
  });
});
