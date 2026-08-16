import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import type { SqlDriver } from './driver';
import { migrate } from './migrations';
import {
  addShipment,
  deleteBatch,
  discardBatch,
  findProductByBarcode,
  getActiveBatches,
  getSettings,
  listBatches,
  listWaste,
  replaceAllData,
  searchProducts,
  snapshotData,
  updateBatch,
  updateSettings,
} from './queries';
import { createTestDriver } from './testDriver';

let db: SqlDriver & { close(): void };

beforeEach(async () => {
  db = createTestDriver();
  await migrate(db);
});

afterEach(() => {
  db.close();
});

describe('migrate', () => {
  test('creates a settings row with sensible defaults', async () => {
    const settings = await getSettings(db);

    expect(settings).toEqual({
      defaultWarnDays: 14,
      notifyHour: 8,
      notificationsEnabled: true,
      lastExportAt: null,
    });
  });

  test('is safe to run twice', async () => {
    await migrate(db);

    expect((await getSettings(db)).defaultWarnDays).toBe(14);
  });
});

describe('updateSettings', () => {
  test('changes only the fields given', async () => {
    await updateSettings(db, { notifyHour: 17 });

    const settings = await getSettings(db);
    expect(settings.notifyHour).toBe(17);
    expect(settings.defaultWarnDays).toBe(14);
  });

  test('round-trips the notifications toggle as a boolean', async () => {
    await updateSettings(db, { notificationsEnabled: false });

    expect((await getSettings(db)).notificationsEnabled).toBe(false);
  });
});

describe('addShipment', () => {
  test('creates the product the first time it is received', async () => {
    await addShipment(db, [
      { productName: 'Evaporated Milk', expiresAt: '2026-09-04', quantity: 48, unit: 'can' },
    ]);

    const [batch] = await getActiveBatches(db);
    expect(batch.product.name).toBe('Evaporated Milk');
    expect(batch.quantity).toBe(48);
  });

  test('reuses the remembered product on the next shipment', async () => {
    await addShipment(db, [{ productName: 'Evaporated Milk', expiresAt: '2026-09-04', quantity: 48 }]);
    await addShipment(db, [{ productName: 'Evaporated Milk', expiresAt: '2026-11-14', quantity: 24 }]);

    const batches = await getActiveBatches(db);
    expect(batches).toHaveLength(2);
    expect(new Set(batches.map((b) => b.productId)).size).toBe(1);
  });

  test('matches a remembered product regardless of capitalisation', async () => {
    await addShipment(db, [{ productName: 'Evaporated Milk', expiresAt: '2026-09-04', quantity: 1 }]);
    await addShipment(db, [{ productName: 'evaporated milk', expiresAt: '2026-10-04', quantity: 1 }]);

    expect(new Set((await getActiveBatches(db)).map((b) => b.productId)).size).toBe(1);
  });

  test('remembers the barcode so the next scan finds the product', async () => {
    await addShipment(db, [
      { productName: 'Pandesal', barcode: '4800101010101', expiresAt: '2026-08-18', quantity: 30 },
    ]);

    const found = await findProductByBarcode(db, '4800101010101');
    expect(found?.name).toBe('Pandesal');
  });

  test('remembers the per-product warn window for later shipments', async () => {
    await addShipment(db, [
      { productName: 'Pandesal', expiresAt: '2026-08-18', quantity: 30, warnDays: 2 },
    ]);
    await addShipment(db, [{ productName: 'Pandesal', expiresAt: '2026-08-25', quantity: 30 }]);

    const batches = await getActiveBatches(db);
    expect(batches.every((b) => b.product.warnDays === 2)).toBe(true);
  });

  test('writes every row of a multi-product shipment', async () => {
    await addShipment(db, [
      { productName: 'Milk', expiresAt: '2026-09-04', quantity: 10 },
      { productName: 'Bread', expiresAt: '2026-08-18', quantity: 20 },
      { productName: 'Eggs', expiresAt: '2026-08-30', quantity: 30 },
    ]);

    expect(await getActiveBatches(db)).toHaveLength(3);
  });

  test('writes nothing at all when one row is invalid', async () => {
    await expect(
      addShipment(db, [
        { productName: 'Milk', expiresAt: '2026-09-04', quantity: 10 },
        { productName: '', expiresAt: '2026-09-04', quantity: 5 },
      ]),
    ).rejects.toThrow();

    expect(await getActiveBatches(db)).toHaveLength(0);
  });
});

describe('searchProducts', () => {
  beforeEach(async () => {
    await addShipment(db, [
      { productName: 'Evaporated Milk', expiresAt: '2026-09-04', quantity: 1 },
      { productName: 'Condensed Milk', expiresAt: '2026-09-04', quantity: 1 },
      { productName: 'Pandesal', expiresAt: '2026-08-18', quantity: 1 },
    ]);
  });

  test('matches on a prefix of the name', async () => {
    const results = await searchProducts(db, 'pan');

    expect(results.map((p) => p.name)).toEqual(['Pandesal']);
  });

  test('matches a word inside the name', async () => {
    const results = await searchProducts(db, 'milk');

    expect(results).toHaveLength(2);
  });

  test('returns the whole catalogue for an empty query', async () => {
    expect(await searchProducts(db, '')).toHaveLength(3);
  });
});

describe('listBatches', () => {
  beforeEach(async () => {
    await addShipment(db, [
      { productName: 'Milk', expiresAt: '2026-08-10', quantity: 1 },
      { productName: 'Bread', expiresAt: '2026-08-20', quantity: 1 },
      { productName: 'Rice', expiresAt: '2026-12-01', quantity: 1 },
    ]);
  });

  test('returns active batches soonest first', async () => {
    const batches = await listBatches(db, {});

    expect(batches.map((b) => b.expiresAt)).toEqual(['2026-08-10', '2026-08-20', '2026-12-01']);
  });

  test('filters to an expiry date range', async () => {
    const batches = await listBatches(db, { from: '2026-08-15', to: '2026-08-31' });

    expect(batches.map((b) => b.product.name)).toEqual(['Bread']);
  });

  test('filters by product name search', async () => {
    const batches = await listBatches(db, { search: 'ric' });

    expect(batches.map((b) => b.product.name)).toEqual(['Rice']);
  });
});

describe('discardBatch', () => {
  test('takes the batch out of active stock and records the waste', async () => {
    await addShipment(db, [{ productName: 'Milk', expiresAt: '2026-08-10', quantity: 12 }]);
    const [batch] = await getActiveBatches(db);

    await discardBatch(db, batch.id, 12, '2026-08-16T09:00:00.000Z');

    expect(await getActiveBatches(db)).toHaveLength(0);
    const waste = await listWaste(db);
    expect(waste[0].discardedQuantity).toBe(12);
    expect(waste[0].product.name).toBe('Milk');
  });
});

describe('updateBatch', () => {
  test('corrects a mistyped expiry date', async () => {
    await addShipment(db, [{ productName: 'Milk', expiresAt: '2026-08-10', quantity: 12 }]);
    const [batch] = await getActiveBatches(db);

    await updateBatch(db, batch.id, { expiresAt: '2026-09-10', quantity: 10 });

    const [updated] = await getActiveBatches(db);
    expect(updated.expiresAt).toBe('2026-09-10');
    expect(updated.quantity).toBe(10);
  });
});

describe('deleteBatch', () => {
  test('removes the batch outright', async () => {
    await addShipment(db, [{ productName: 'Milk', expiresAt: '2026-08-10', quantity: 12 }]);
    const [batch] = await getActiveBatches(db);

    await deleteBatch(db, batch.id);

    expect(await getActiveBatches(db)).toHaveLength(0);
    expect(await listWaste(db)).toHaveLength(0);
  });
});

describe('backup', () => {
  test('restores every product and batch from a snapshot', async () => {
    await addShipment(db, [
      { productName: 'Milk', barcode: '111', expiresAt: '2026-09-04', quantity: 48, warnDays: 5 },
      { productName: 'Bread', expiresAt: '2026-08-18', quantity: 30 },
    ]);
    await updateSettings(db, { notifyHour: 17 });
    const snapshot = await snapshotData(db);

    const fresh = createTestDriver();
    await migrate(fresh);
    await replaceAllData(fresh, snapshot);

    const batches = await getActiveBatches(fresh);
    expect(batches.map((b) => b.product.name).sort()).toEqual(['Bread', 'Milk']);
    expect((await findProductByBarcode(fresh, '111'))?.warnDays).toBe(5);
    expect((await getSettings(fresh)).notifyHour).toBe(17);
    fresh.close();
  });

  test('replaces existing data rather than merging into it', async () => {
    await addShipment(db, [{ productName: 'Milk', expiresAt: '2026-09-04', quantity: 1 }]);
    const snapshot = await snapshotData(db);

    await addShipment(db, [{ productName: 'Bread', expiresAt: '2026-08-18', quantity: 1 }]);
    await replaceAllData(db, snapshot);

    expect((await getActiveBatches(db)).map((b) => b.product.name)).toEqual(['Milk']);
  });
});
