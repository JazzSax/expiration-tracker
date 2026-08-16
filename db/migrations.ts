import type { SqlDriver } from './driver';

/**
 * Schema versions, applied in order. `PRAGMA user_version` records how far a
 * device has got, so an app update never re-runs a step or drops real stock.
 * To change the schema, append a new entry — never edit an existing one.
 */
const MIGRATIONS: string[] = [
  // 1 — initial schema
  `
  CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    barcode TEXT,
    unit TEXT,
    warn_days INTEGER,
    created_at TEXT NOT NULL
  );
  CREATE UNIQUE INDEX products_name_unique ON products (name COLLATE NOCASE);
  CREATE UNIQUE INDEX products_barcode_unique ON products (barcode) WHERE barcode IS NOT NULL;

  CREATE TABLE batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    location TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    discarded_at TEXT,
    discarded_quantity INTEGER,
    created_at TEXT NOT NULL
  );
  CREATE INDEX batches_status_expiry ON batches (status, expires_at);

  CREATE TABLE settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    default_warn_days INTEGER NOT NULL DEFAULT 14,
    notify_hour INTEGER NOT NULL DEFAULT 8,
    notifications_enabled INTEGER NOT NULL DEFAULT 1,
    last_export_at TEXT
  );
  INSERT INTO settings (id) VALUES (1);
  `,

  // 2 — product categories (for icons) and sample-data flags
  `
  ALTER TABLE products ADD COLUMN category TEXT;
  ALTER TABLE products ADD COLUMN is_sample INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE batches ADD COLUMN is_sample INTEGER NOT NULL DEFAULT 0;
  `,
];

export async function migrate(db: SqlDriver): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  for (let version = current; version < MIGRATIONS.length; version += 1) {
    await db.execAsync(MIGRATIONS[version]);
    // PRAGMA won't take a bound parameter, and the value is a loop counter.
    await db.execAsync(`PRAGMA user_version = ${version + 1}`);
  }
}
