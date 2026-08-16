/**
 * Domain types. Pure data — no I/O, no SQLite, no React.
 *
 * Dates are plain 'YYYY-MM-DD' strings, never Date objects. A carton's
 * expiry is a calendar day, not an instant, so string comparison is both
 * correct and immune to timezone drift.
 */

export type IsoDate = string;

export type Stage = 'expired' | 'urgent' | 'soon' | 'ok';

export type BatchStatus = 'active' | 'discarded';

export interface Product {
  id: number;
  name: string;
  barcode: string | null;
  unit: string | null;
  /** Overrides settings.defaultWarnDays for this product. */
  warnDays: number | null;
  /** Category key from domain/categories — drives the icon and tint. */
  category: string | null;
  /** True for the example products loaded on first launch. */
  isSample: boolean;
}

export interface Batch {
  id: number;
  productId: number;
  expiresAt: IsoDate;
  quantity: number;
  location: string | null;
  status: BatchStatus;
  discardedAt: string | null;
  discardedQuantity: number | null;
  createdAt: string;
  isSample: boolean;
}

/** A batch joined to the product it belongs to — what the UI and digests read. */
export interface BatchWithProduct extends Batch {
  product: Product;
}

export interface Settings {
  defaultWarnDays: number;
  notifyHour: number;
  notificationsEnabled: boolean;
  lastExportAt: string | null;
}

/** A batch plus its derived state, ready to render. */
export interface StagedBatch extends BatchWithProduct {
  stage: Stage;
  daysLeft: number;
}

export interface DigestGroup {
  product: Product;
  /** Worst stage across the group's batches — drives the group's color. */
  stage: Stage;
  /** Fewest days left across the group's batches. */
  daysLeft: number;
  batches: StagedBatch[];
  totalQuantity: number;
}

export interface Digest {
  date: IsoDate;
  counts: {
    expired: number;
    urgent: number;
    soon: number;
    ok: number;
    /** Active batches, all stages. */
    total: number;
  };
  /** Groups needing attention (expired/urgent/soon), worst first. */
  groups: DigestGroup[];
}
