import { describe, expect, test } from 'vitest';
import { buildDigest } from './expiry';
import { soonestUpcoming, summariseByCategory } from './summary';
import type { BatchWithProduct, Product, Settings } from './types';

const TODAY = '2026-08-16';

const settings: Settings = {
  defaultWarnDays: 14,
  notifyHour: 8,
  notificationsEnabled: true,
  lastExportAt: null,
};

function product(id: number, name: string, category: string | null): Product {
  return { id, name, barcode: null, unit: 'pc', warnDays: null, category, isSample: false };
}

function batch(id: number, expiresAt: string, p: Product, quantity = 10): BatchWithProduct {
  return {
    id,
    productId: p.id,
    expiresAt,
    quantity,
    location: null,
    status: 'active',
    discardedAt: null,
    discardedQuantity: null,
    createdAt: '2026-08-01',
    isSample: false,
    product: p,
  };
}

const milk = product(1, 'Fresh Milk', 'dairy');
const bread = product(2, 'Pandesal', 'bakery');
const rice = product(3, 'Jasmine Rice', 'dry');

describe('soonestUpcoming', () => {
  test('returns the nearest batch that has not expired yet', () => {
    const digest = buildDigest(
      [batch(1, '2026-08-10', milk), batch(2, '2026-08-19', bread), batch(3, '2026-08-25', rice)],
      settings,
      TODAY,
    );

    const soonest = soonestUpcoming(digest);
    expect(soonest?.product.name).toBe('Pandesal');
    expect(soonest?.daysLeft).toBe(3);
  });

  test('ignores expired stock entirely', () => {
    const digest = buildDigest([batch(1, '2026-08-01', milk)], settings, TODAY);

    expect(soonestUpcoming(digest)).toBeNull();
  });

  test('counts something expiring today as upcoming', () => {
    const digest = buildDigest([batch(1, TODAY, milk)], settings, TODAY);

    expect(soonestUpcoming(digest)?.daysLeft).toBe(0);
  });

  test('returns null for an empty store', () => {
    expect(soonestUpcoming(buildDigest([], settings, TODAY))).toBeNull();
  });
});

describe('summariseByCategory', () => {
  test('totals products, batches and quantity per category', () => {
    const summary = summariseByCategory([
      batch(1, '2026-09-01', milk, 12),
      batch(2, '2026-10-01', milk, 8),
      batch(3, '2026-09-15', bread, 5),
    ]);

    const dairy = summary.find((row) => row.category.key === 'dairy');
    expect(dairy).toMatchObject({ products: 1, batches: 2, quantity: 20 });
    expect(summary.find((row) => row.category.key === 'bakery')?.products).toBe(1);
  });

  test('orders the busiest category first', () => {
    const summary = summariseByCategory([
      batch(1, '2026-09-01', bread, 5),
      batch(2, '2026-09-01', milk, 5),
      batch(3, '2026-10-01', milk, 5),
    ]);

    expect(summary[0].category.key).toBe('dairy');
  });

  test('files a product with no category under Other', () => {
    const summary = summariseByCategory([batch(1, '2026-09-01', product(9, 'Mystery Item', null))]);

    expect(summary[0].category.key).toBe('other');
  });

  test('leaves discarded batches out', () => {
    const discarded = { ...batch(1, '2026-09-01', milk), status: 'discarded' as const };

    expect(summariseByCategory([discarded])).toEqual([]);
  });

  test('counts a product once even when it has several batches', () => {
    const summary = summariseByCategory([batch(1, '2026-09-01', milk), batch(2, '2026-10-01', milk)]);

    expect(summary[0].products).toBe(1);
    expect(summary[0].batches).toBe(2);
  });
});
