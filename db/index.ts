import * as SQLite from 'expo-sqlite';
import { todayIso } from '../domain/expiry';
import type { RunResult, SqlDriver, SqlValue } from './driver';
import { migrate } from './migrations';
import { ensureSampleData } from './seed';

export const DATABASE_NAME = 'expiration-tracker.db';

/**
 * Adapts expo-sqlite to the driver interface the query layer is written
 * against. Thin on purpose: everything above this line is testable off-device.
 */
function adapt(db: SQLite.SQLiteDatabase): SqlDriver {
  return {
    execAsync: (sql) => db.execAsync(sql),
    runAsync: (sql, params) => db.runAsync(sql, (params ?? []) as SQLite.SQLiteBindValue[]) as Promise<RunResult>,
    getAllAsync: <T>(sql: string, params?: SqlValue[]) =>
      db.getAllAsync<T>(sql, (params ?? []) as SQLite.SQLiteBindValue[]),
    getFirstAsync: <T>(sql: string, params?: SqlValue[]) =>
      db.getFirstAsync<T>(sql, (params ?? []) as SQLite.SQLiteBindValue[]),
    withTransactionAsync: (task) => db.withTransactionAsync(task),
  };
}

let ready: Promise<SqlDriver> | null = null;

/** Opens the database once per app launch and applies any pending migrations. */
export function getDb(): Promise<SqlDriver> {
  if (!ready) {
    ready = (async () => {
      const driver = adapt(await SQLite.openDatabaseAsync(DATABASE_NAME));
      await migrate(driver);
      // Only ever fires on a store that has never had a product.
      await ensureSampleData(driver, todayIso());
      return driver;
    })();
  }
  return ready;
}
