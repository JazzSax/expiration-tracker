import type { BatchWithProduct, Product, Settings } from '../domain/types';
import type { SqlDriver, SqlValue } from './driver';

/** Every read and write of the local database lives in this file. */

const BATCH_COLUMNS = `
  b.id            AS id,
  b.product_id    AS productId,
  b.expires_at    AS expiresAt,
  b.quantity      AS quantity,
  b.location      AS location,
  b.status        AS status,
  b.discarded_at  AS discardedAt,
  b.discarded_quantity AS discardedQuantity,
  b.created_at    AS createdAt,
  b.is_sample     AS isSample,
  p.id            AS p_id,
  p.name          AS p_name,
  p.barcode       AS p_barcode,
  p.unit          AS p_unit,
  p.warn_days     AS p_warnDays,
  p.category      AS p_category,
  p.is_sample     AS p_isSample
`;

interface BatchRow {
  id: number;
  productId: number;
  expiresAt: string;
  quantity: number;
  location: string | null;
  status: string;
  discardedAt: string | null;
  discardedQuantity: number | null;
  createdAt: string;
  isSample: number;
  p_id: number;
  p_name: string;
  p_barcode: string | null;
  p_unit: string | null;
  p_warnDays: number | null;
  p_category: string | null;
  p_isSample: number;
}

function toBatch(row: BatchRow): BatchWithProduct {
  return {
    id: row.id,
    productId: row.productId,
    expiresAt: row.expiresAt,
    quantity: row.quantity,
    location: row.location,
    status: row.status === 'discarded' ? 'discarded' : 'active',
    discardedAt: row.discardedAt,
    discardedQuantity: row.discardedQuantity,
    createdAt: row.createdAt,
    isSample: row.isSample === 1,
    product: {
      id: row.p_id,
      name: row.p_name,
      barcode: row.p_barcode,
      unit: row.p_unit,
      warnDays: row.p_warnDays,
      category: row.p_category,
      isSample: row.p_isSample === 1,
    },
  };
}

/* ------------------------------------------------------------------ settings */

interface SettingsRow {
  default_warn_days: number;
  notify_hour: number;
  notifications_enabled: number;
  last_export_at: string | null;
}

export async function getSettings(db: SqlDriver): Promise<Settings> {
  const row = await db.getFirstAsync<SettingsRow>('SELECT * FROM settings WHERE id = 1');
  return {
    defaultWarnDays: row?.default_warn_days ?? 14,
    notifyHour: row?.notify_hour ?? 8,
    notificationsEnabled: (row?.notifications_enabled ?? 1) === 1,
    lastExportAt: row?.last_export_at ?? null,
  };
}

const SETTINGS_COLUMNS: Record<keyof Settings, string> = {
  defaultWarnDays: 'default_warn_days',
  notifyHour: 'notify_hour',
  notificationsEnabled: 'notifications_enabled',
  lastExportAt: 'last_export_at',
};

export async function updateSettings(db: SqlDriver, patch: Partial<Settings>): Promise<void> {
  const assignments: string[] = [];
  const params: SqlValue[] = [];

  for (const [key, column] of Object.entries(SETTINGS_COLUMNS)) {
    const value = patch[key as keyof Settings];
    if (value === undefined) continue;
    assignments.push(`${column} = ?`);
    params.push(typeof value === 'boolean' ? Number(value) : value);
  }
  if (assignments.length === 0) return;

  await db.runAsync(`UPDATE settings SET ${assignments.join(', ')} WHERE id = 1`, params);
}

/* ------------------------------------------------------------------ products */

interface ProductRow {
  id: number;
  name: string;
  barcode: string | null;
  unit: string | null;
  warn_days: number | null;
  category: string | null;
  is_sample: number;
}

const toProduct = (row: ProductRow): Product => ({
  id: row.id,
  name: row.name,
  barcode: row.barcode,
  unit: row.unit,
  warnDays: row.warn_days,
  category: row.category,
  isSample: row.is_sample === 1,
});

/** The remembered catalogue, for type-ahead while entering a shipment. */
export async function searchProducts(db: SqlDriver, query: string, limit = 20): Promise<Product[]> {
  const term = query.trim();
  const rows = term
    ? await db.getAllAsync<ProductRow>(
        `SELECT * FROM products WHERE name LIKE ? ESCAPE '\\' COLLATE NOCASE ORDER BY name LIMIT ?`,
        [`%${escapeLike(term)}%`, limit],
      )
    : await db.getAllAsync<ProductRow>('SELECT * FROM products ORDER BY name LIMIT ?', [limit]);
  return rows.map(toProduct);
}

export async function findProductByBarcode(db: SqlDriver, barcode: string): Promise<Product | null> {
  const row = await db.getFirstAsync<ProductRow>('SELECT * FROM products WHERE barcode = ?', [barcode]);
  return row ? toProduct(row) : null;
}

function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/* ----------------------------------------------------------------- shipments */

export interface ShipmentRow {
  productName: string;
  expiresAt: string;
  quantity: number;
  /** Optional details remembered on the product for next time. */
  barcode?: string | null;
  unit?: string | null;
  warnDays?: number | null;
  location?: string | null;
  category?: string | null;
  /** Set only by the first-launch example data. */
  isSample?: boolean;
}

/**
 * Records an arriving shipment. Products are matched by name (case-insensitive)
 * or barcode and created when unseen — this is what makes the second shipment
 * of an item quick to enter. All rows commit together or none do.
 */
export async function addShipment(db: SqlDriver, rows: ShipmentRow[], now = new Date().toISOString()): Promise<void> {
  for (const row of rows) {
    if (!row.productName?.trim()) throw new Error('Every row needs a product name.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.expiresAt)) throw new Error(`Invalid expiry date: ${row.expiresAt}`);
    if (!Number.isFinite(row.quantity) || row.quantity <= 0) throw new Error('Quantity must be greater than zero.');
  }

  await db.withTransactionAsync(async () => {
    for (const row of rows) {
      const productId = await upsertProduct(db, row, now);
      await db.runAsync(
        `INSERT INTO batches (product_id, expires_at, quantity, location, status, created_at, is_sample)
         VALUES (?, ?, ?, ?, 'active', ?, ?)`,
        [productId, row.expiresAt, row.quantity, row.location ?? null, now, row.isSample ? 1 : 0],
      );
    }
  });
}

async function upsertProduct(db: SqlDriver, row: ShipmentRow, now: string): Promise<number> {
  const name = row.productName.trim();
  const existing =
    (row.barcode ? await db.getFirstAsync<ProductRow>('SELECT * FROM products WHERE barcode = ?', [row.barcode]) : null) ??
    (await db.getFirstAsync<ProductRow>('SELECT * FROM products WHERE name = ? COLLATE NOCASE', [name]));

  if (!existing) {
    const result = await db.runAsync(
      `INSERT INTO products (name, barcode, unit, warn_days, category, is_sample, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        row.barcode ?? null,
        row.unit ?? null,
        row.warnDays ?? null,
        row.category ?? null,
        row.isSample ? 1 : 0,
        now,
      ],
    );
    return result.lastInsertRowId;
  }

  // Fill in anything newly learned, but never blank out what's already known.
  await db.runAsync(
    `UPDATE products
        SET barcode   = COALESCE(?, barcode),
            unit      = COALESCE(?, unit),
            warn_days = COALESCE(?, warn_days),
            category  = COALESCE(?, category)
      WHERE id = ?`,
    [row.barcode ?? null, row.unit ?? null, row.warnDays ?? null, row.category ?? null, existing.id],
  );
  return existing.id;
}

/* ------------------------------------------------------------------- batches */

export interface BatchFilter {
  /** Expiry range, inclusive. */
  from?: string;
  to?: string;
  search?: string;
}

export async function listBatches(db: SqlDriver, filter: BatchFilter): Promise<BatchWithProduct[]> {
  const where = ["b.status = 'active'"];
  const params: SqlValue[] = [];

  if (filter.from) {
    where.push('b.expires_at >= ?');
    params.push(filter.from);
  }
  if (filter.to) {
    where.push('b.expires_at <= ?');
    params.push(filter.to);
  }
  if (filter.search?.trim()) {
    where.push(`p.name LIKE ? ESCAPE '\\' COLLATE NOCASE`);
    params.push(`%${escapeLike(filter.search.trim())}%`);
  }

  const rows = await db.getAllAsync<BatchRow>(
    `SELECT ${BATCH_COLUMNS}
       FROM batches b JOIN products p ON p.id = b.product_id
      WHERE ${where.join(' AND ')}
      ORDER BY b.expires_at ASC, p.name ASC`,
    params,
  );
  return rows.map(toBatch);
}

export function getActiveBatches(db: SqlDriver): Promise<BatchWithProduct[]> {
  return listBatches(db, {});
}

export async function listWaste(db: SqlDriver, limit = 100): Promise<BatchWithProduct[]> {
  const rows = await db.getAllAsync<BatchRow>(
    `SELECT ${BATCH_COLUMNS}
       FROM batches b JOIN products p ON p.id = b.product_id
      WHERE b.status = 'discarded'
      ORDER BY b.discarded_at DESC
      LIMIT ?`,
    [limit],
  );
  return rows.map(toBatch);
}

export async function discardBatch(
  db: SqlDriver,
  batchId: number,
  quantity: number,
  now = new Date().toISOString(),
): Promise<void> {
  await db.runAsync(
    `UPDATE batches SET status = 'discarded', discarded_at = ?, discarded_quantity = ? WHERE id = ?`,
    [now, quantity, batchId],
  );
}

export async function updateBatch(
  db: SqlDriver,
  batchId: number,
  patch: { expiresAt?: string; quantity?: number; location?: string | null },
): Promise<void> {
  const assignments: string[] = [];
  const params: SqlValue[] = [];

  if (patch.expiresAt !== undefined) {
    assignments.push('expires_at = ?');
    params.push(patch.expiresAt);
  }
  if (patch.quantity !== undefined) {
    assignments.push('quantity = ?');
    params.push(patch.quantity);
  }
  if (patch.location !== undefined) {
    assignments.push('location = ?');
    params.push(patch.location);
  }
  if (assignments.length === 0) return;

  params.push(batchId);
  await db.runAsync(`UPDATE batches SET ${assignments.join(', ')} WHERE id = ?`, params);
}

export async function deleteBatch(db: SqlDriver, batchId: number): Promise<void> {
  await db.runAsync('DELETE FROM batches WHERE id = ?', [batchId]);
}

export async function countProducts(db: SqlDriver): Promise<number> {
  const row = await db.getFirstAsync<{ total: number }>('SELECT COUNT(*) AS total FROM products');
  return row?.total ?? 0;
}

export async function countSampleProducts(db: SqlDriver): Promise<number> {
  const row = await db.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) AS total FROM products WHERE is_sample = 1',
  );
  return row?.total ?? 0;
}

/* -------------------------------------------------------------------- backup */

export interface Snapshot {
  version: 1;
  exportedAt: string;
  settings: Settings;
  products: Product[];
  batches: Array<Omit<BatchWithProduct, 'product'>>;
}

export async function snapshotData(db: SqlDriver, now = new Date().toISOString()): Promise<Snapshot> {
  const products = (await db.getAllAsync<ProductRow>('SELECT * FROM products ORDER BY id')).map(toProduct);
  const batches = (
    await db.getAllAsync<BatchRow>(
      `SELECT ${BATCH_COLUMNS} FROM batches b JOIN products p ON p.id = b.product_id ORDER BY b.id`,
    )
  )
    .map(toBatch)
    .map(({ product: _product, ...batch }) => batch);

  return { version: 1, exportedAt: now, settings: await getSettings(db), products, batches };
}

/** Restores a snapshot, replacing whatever is on the device. */
export async function replaceAllData(db: SqlDriver, snapshot: Snapshot): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM batches');
    await db.runAsync('DELETE FROM products');

    for (const product of snapshot.products) {
      await db.runAsync(
        `INSERT INTO products (id, name, barcode, unit, warn_days, category, is_sample, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          product.id,
          product.name,
          product.barcode,
          product.unit,
          product.warnDays,
          product.category ?? null,
          product.isSample ? 1 : 0,
          snapshot.exportedAt,
        ],
      );
    }
    for (const batch of snapshot.batches) {
      await db.runAsync(
        `INSERT INTO batches (id, product_id, expires_at, quantity, location, status, discarded_at, discarded_quantity, created_at, is_sample)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          batch.id,
          batch.productId,
          batch.expiresAt,
          batch.quantity,
          batch.location,
          batch.status,
          batch.discardedAt,
          batch.discardedQuantity,
          batch.createdAt,
          batch.isSample ? 1 : 0,
        ],
      );
    }
  });

  await updateSettings(db, snapshot.settings);
}
