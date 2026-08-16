import { DatabaseSync } from 'node:sqlite';
import type { SqlDriver, SqlValue } from './driver';

/**
 * Test-only driver backed by Node's built-in SQLite. Tests run against a real
 * SQL engine, so constraints, transactions and joins are genuinely exercised —
 * only the host differs from the device.
 */
export function createTestDriver(): SqlDriver & { close(): void } {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');

  const args = (params?: SqlValue[]) => (params ?? []) as (string | number | null)[];

  return {
    async execAsync(sql) {
      db.exec(sql);
    },
    async runAsync(sql, params) {
      const result = db.prepare(sql).run(...args(params));
      return {
        lastInsertRowId: Number(result.lastInsertRowid),
        changes: Number(result.changes),
      };
    },
    async getAllAsync<T>(sql: string, params?: SqlValue[]) {
      return db.prepare(sql).all(...args(params)) as T[];
    },
    async getFirstAsync<T>(sql: string, params?: SqlValue[]) {
      return (db.prepare(sql).get(...args(params)) as T) ?? null;
    },
    async withTransactionAsync(task) {
      db.exec('BEGIN');
      try {
        await task();
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
    close() {
      db.close();
    },
  };
}
