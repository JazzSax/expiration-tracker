import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { buildDigest } from '../domain/expiry';
import type { SqlDriver } from './driver';
import { migrate } from './migrations';
import { addShipment, getActiveBatches, getSettings } from './queries';
import { clearSampleData, ensureSampleData, loadSampleData, sampleShipment } from './seed';
import { createTestDriver } from './testDriver';

const TODAY = '2026-08-16';

let db: SqlDriver & { close(): void };

beforeEach(async () => {
  db = createTestDriver();
  await migrate(db);
});

afterEach(() => {
  db.close();
});

describe('sampleShipment', () => {
  test('covers every stage so each part of the app has something to show', async () => {
    await ensureSampleData(db, TODAY);
    const settings = await getSettings(db);
    const digest = buildDigest(await getActiveBatches(db), settings, TODAY, { include: 'all' });

    expect(digest.counts.expired).toBeGreaterThan(0);
    expect(digest.counts.urgent).toBeGreaterThan(0);
    expect(digest.counts.soon).toBeGreaterThan(0);
    expect(digest.counts.ok).toBeGreaterThan(0);
  });

  test('gives every sample product a category for its icon', () => {
    expect(sampleShipment(TODAY).every((row) => !!row.category)).toBe(true);
  });

  test('places every expiry relative to the day it is seeded', () => {
    const rows = sampleShipment('2027-03-01');
    expect(rows.every((row) => row.expiresAt.startsWith('2027') || row.expiresAt.startsWith('2028'))).toBe(
      true,
    );
  });

  test('includes a product with more than one batch so pooling is visible', async () => {
    await ensureSampleData(db, TODAY);
    const batches = await getActiveBatches(db);
    const perProduct = new Map<number, number>();
    for (const batch of batches) perProduct.set(batch.productId, (perProduct.get(batch.productId) ?? 0) + 1);

    expect([...perProduct.values()].some((count) => count > 1)).toBe(true);
  });
});

describe('ensureSampleData', () => {
  test('marks everything it creates as sample data', async () => {
    await ensureSampleData(db, TODAY);
    const batches = await getActiveBatches(db);

    expect(batches.length).toBeGreaterThan(0);
    expect(batches.every((batch) => batch.isSample)).toBe(true);
    expect(batches.every((batch) => batch.product.isSample)).toBe(true);
  });

  test('does nothing when the store already has products', async () => {
    await addShipment(db, [{ productName: 'Real Stock', expiresAt: '2026-09-01', quantity: 5 }]);

    await ensureSampleData(db, TODAY);

    const batches = await getActiveBatches(db);
    expect(batches).toHaveLength(1);
    expect(batches[0].product.name).toBe('Real Stock');
  });

  test('does not seed twice on a second launch', async () => {
    await ensureSampleData(db, TODAY);
    const first = (await getActiveBatches(db)).length;

    await ensureSampleData(db, TODAY);

    expect((await getActiveBatches(db)).length).toBe(first);
  });
});

describe('loadSampleData', () => {
  test('adds the examples even when the store already holds real stock', async () => {
    await addShipment(db, [{ productName: 'Real Stock', expiresAt: '2026-09-01', quantity: 5 }]);

    await loadSampleData(db, TODAY);

    const batches = await getActiveBatches(db);
    expect(batches.some((batch) => batch.product.name === 'Real Stock')).toBe(true);
    expect(batches.filter((batch) => batch.isSample).length).toBeGreaterThan(0);
  });
});

describe('clearSampleData', () => {
  test('removes the samples and leaves real stock alone', async () => {
    await ensureSampleData(db, TODAY);
    await addShipment(db, [{ productName: 'Real Stock', expiresAt: '2026-09-01', quantity: 5 }]);

    await clearSampleData(db);

    const batches = await getActiveBatches(db);
    expect(batches.map((batch) => batch.product.name)).toEqual(['Real Stock']);
  });

  test('real stock never carries the sample flag', async () => {
    await addShipment(db, [{ productName: 'Real Stock', expiresAt: '2026-09-01', quantity: 5 }]);
    const [batch] = await getActiveBatches(db);

    expect(batch.isSample).toBe(false);
    expect(batch.product.isSample).toBe(false);
  });
});

describe('categories on real shipments', () => {
  test('round-trips the category chosen while receiving', async () => {
    await addShipment(db, [
      { productName: 'Evaporated Milk', expiresAt: '2026-09-01', quantity: 5, category: 'dairy' },
    ]);

    const [batch] = await getActiveBatches(db);
    expect(batch.product.category).toBe('dairy');
  });

  test('remembers the category for the next shipment of that product', async () => {
    await addShipment(db, [
      { productName: 'Evaporated Milk', expiresAt: '2026-09-01', quantity: 5, category: 'dairy' },
    ]);
    await addShipment(db, [{ productName: 'Evaporated Milk', expiresAt: '2026-10-01', quantity: 5 }]);

    const batches = await getActiveBatches(db);
    expect(batches.every((batch) => batch.product.category === 'dairy')).toBe(true);
  });
});
