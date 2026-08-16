import type {
  BatchWithProduct,
  Digest,
  DigestGroup,
  IsoDate,
  Settings,
  Stage,
  StagedBatch,
} from './types';

export type { Stage } from './types';

/** Stages ordered worst-first. Used for sorting and for picking a group's stage. */
const STAGE_ORDER: Stage[] = ['expired', 'urgent', 'soon', 'ok'];

/** A batch is 'urgent' from this many days out — today and tomorrow. */
const URGENT_DAYS = 1;

function toUtc(date: IsoDate): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtc(ms: number): IsoDate {
  return new Date(ms).toISOString().slice(0, 10);
}

const DAY_MS = 86_400_000;

/**
 * Whole calendar days from `from` to `to`. Negative when `to` is in the past.
 * Anchored at UTC midnight so daylight-saving transitions can't shave a day.
 */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return (toUtc(to) - toUtc(from)) / DAY_MS;
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromUtc(toUtc(date) + days * DAY_MS);
}

/** Today in the device's local timezone, as 'YYYY-MM-DD'. */
export function todayIso(now: Date = new Date()): IsoDate {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

/** The warn window that applies to a batch: the product's own, or the global default. */
export function warnDaysFor(batch: BatchWithProduct, settings: Settings): number {
  return batch.product.warnDays ?? settings.defaultWarnDays;
}

/**
 * The single definition of "about to expire" in this app. Everything the user
 * sees — dashboard counts, list pills, notification text — comes through here.
 */
export function computeStage(batch: BatchWithProduct, settings: Settings, today: IsoDate): Stage {
  const daysLeft = daysBetween(today, batch.expiresAt);
  if (daysLeft < 0) return 'expired';
  if (daysLeft <= URGENT_DAYS) return 'urgent';
  if (daysLeft <= warnDaysFor(batch, settings)) return 'soon';
  return 'ok';
}

export function stageBatch(
  batch: BatchWithProduct,
  settings: Settings,
  today: IsoDate,
): StagedBatch {
  return {
    ...batch,
    stage: computeStage(batch, settings, today),
    daysLeft: daysBetween(today, batch.expiresAt),
  };
}

export function isActionable(stage: Stage): boolean {
  return stage !== 'ok';
}

export interface DigestOptions {
  /**
   * 'attention' (the default) groups only what the owner has to act on — what
   * the dashboard and the notifications care about. 'all' also groups healthy
   * stock, for browsing the full inventory.
   */
  include?: 'attention' | 'all';
}

/**
 * The state of the store on a given day: counts per stage, plus the products
 * pooled into one group each, worst first.
 */
export function buildDigest(
  batches: BatchWithProduct[],
  settings: Settings,
  today: IsoDate,
  options: DigestOptions = {},
): Digest {
  const active = batches.filter((b) => b.status === 'active');
  const staged = active.map((b) => stageBatch(b, settings, today));

  const counts = { expired: 0, urgent: 0, soon: 0, ok: 0, total: staged.length };
  for (const batch of staged) counts[batch.stage] += 1;

  const byProduct = new Map<number, StagedBatch[]>();
  for (const batch of staged) {
    if (options.include !== 'all' && !isActionable(batch.stage)) continue;
    const existing = byProduct.get(batch.product.id);
    if (existing) existing.push(batch);
    else byProduct.set(batch.product.id, [batch]);
  }

  const groups: DigestGroup[] = [...byProduct.values()].map((groupBatches) => {
    const sorted = [...groupBatches].sort((a, b) => a.daysLeft - b.daysLeft);
    const worst = sorted[0];
    return {
      product: worst.product,
      stage: worst.stage,
      daysLeft: worst.daysLeft,
      batches: sorted,
      totalQuantity: sorted.reduce((sum, b) => sum + b.quantity, 0),
    };
  });

  groups.sort((a, b) => {
    const byStage = STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage);
    return byStage !== 0 ? byStage : a.daysLeft - b.daysLeft;
  });

  return { date: today, counts, groups };
}
