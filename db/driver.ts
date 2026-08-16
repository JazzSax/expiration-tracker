/**
 * The slice of expo-sqlite's SQLiteDatabase this app actually uses.
 *
 * Depending on the interface rather than the concrete class lets the query
 * layer run against a real SQLite engine in tests (node:sqlite) without a
 * simulator, and keeps expo-sqlite out of the domain and test paths.
 */

export type SqlValue = string | number | null;

export interface RunResult {
  lastInsertRowId: number;
  changes: number;
}

export interface SqlDriver {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: SqlValue[]): Promise<RunResult>;
  getAllAsync<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: SqlValue[]): Promise<T | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}
