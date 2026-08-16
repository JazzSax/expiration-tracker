import { addDays } from '../domain/expiry';
import type { IsoDate } from '../domain/types';
import type { SqlDriver } from './driver';
import { addShipment, countProducts, type ShipmentRow } from './queries';

/**
 * Example stock loaded on first launch so the app opens with something to look
 * at instead of four empty screens. Everything is flagged as sample data and
 * can be cleared in one tap from Alerts.
 *
 * Dates are relative to the day of seeding, so the examples land across every
 * stage — expired, urgent, soon and healthy — no matter when the app is opened.
 */
export function sampleShipment(today: IsoDate): ShipmentRow[] {
  const on = (days: number) => addDays(today, days);

  const rows: Array<ShipmentRow & { category: string }> = [
    // Already expired — the count that should prompt action today.
    { productName: 'Fresh Pandesal', category: 'bakery', unit: 'pack', warnDays: 2, expiresAt: on(-2), quantity: 18, location: 'Bread rack' },
    { productName: 'Ground Pork 500g', category: 'meat', unit: 'pack', warnDays: 3, expiresAt: on(-1), quantity: 6, location: 'Chiller 1' },

    // Expiring today or tomorrow.
    { productName: 'Fresh Milk 1L', category: 'dairy', unit: 'bottle', warnDays: 5, expiresAt: on(0), quantity: 12, location: 'Chiller 2' },
    { productName: 'Ripe Bananas', category: 'produce', unit: 'kg', warnDays: 3, expiresAt: on(1), quantity: 9, location: 'Produce table' },

    // Inside the warn window.
    { productName: 'Sliced Wheat Bread', category: 'bakery', unit: 'loaf', warnDays: 4, expiresAt: on(3), quantity: 14, location: 'Bread rack' },
    { productName: 'Eggs (Tray of 30)', category: 'dairy', unit: 'tray', warnDays: 10, expiresAt: on(6), quantity: 8, location: 'Aisle 1' },
    { productName: 'Frozen Siomai 1kg', category: 'frozen', unit: 'pack', warnDays: 14, expiresAt: on(11), quantity: 20, location: 'Freezer' },

    // Two batches of one product, so pooling is visible on the card.
    { productName: 'Evaporated Milk 370ml', category: 'dairy', unit: 'can', warnDays: 21, expiresAt: on(14), quantity: 48, location: 'Aisle 3' },
    { productName: 'Evaporated Milk 370ml', category: 'dairy', unit: 'can', expiresAt: on(120), quantity: 96, location: 'Storage' },

    // Healthy shelf-stable stock.
    { productName: 'Canned Sardines', category: 'canned', unit: 'can', warnDays: 30, expiresAt: on(210), quantity: 60, location: 'Aisle 2' },
    { productName: 'Jasmine Rice 5kg', category: 'dry', unit: 'sack', warnDays: 30, expiresAt: on(300), quantity: 25, location: 'Storage' },
    { productName: 'Bottled Water 500ml', category: 'drinks', unit: 'bottle', warnDays: 30, expiresAt: on(365), quantity: 120, location: 'Aisle 4' },
    { productName: 'Cheese Crackers', category: 'snacks', unit: 'box', warnDays: 21, expiresAt: on(95), quantity: 36, location: 'Aisle 5' },
  ];

  return rows.map((row) => ({ ...row, isSample: true }));
}

/** Adds the examples on request, alongside whatever real stock is already there. */
export async function loadSampleData(db: SqlDriver, today: IsoDate): Promise<void> {
  await addShipment(db, sampleShipment(today));
}

/** Seeds the examples only into a store that has never had a product. */
export async function ensureSampleData(db: SqlDriver, today: IsoDate): Promise<boolean> {
  if ((await countProducts(db)) > 0) return false;
  await loadSampleData(db, today);
  return true;
}

/** Removes every sample product and its batches, leaving real stock untouched. */
export async function clearSampleData(db: SqlDriver): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM batches WHERE product_id IN (SELECT id FROM products WHERE is_sample = 1)');
    await db.runAsync('DELETE FROM products WHERE is_sample = 1');
  });
}
