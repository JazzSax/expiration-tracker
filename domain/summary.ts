import { categoryFor, type Category } from './categories';
import type { BatchWithProduct, Digest, StagedBatch } from './types';

/**
 * Read-only views over a digest, for the dashboard. Pure like the rest of the
 * domain — the screens render what these return and decide nothing themselves.
 */

/**
 * The next thing that will expire, ignoring anything already expired. This is
 * the "soonest" date shown beside the expiring count: it answers "how long
 * have I got?", which expired stock can't.
 */
export function soonestUpcoming(digest: Digest): StagedBatch | null {
  const upcoming = digest.groups
    .flatMap((group) => group.batches)
    .filter((batch) => batch.daysLeft >= 0);

  if (upcoming.length === 0) return null;
  return upcoming.reduce((best, batch) => (batch.daysLeft < best.daysLeft ? batch : best));
}

export interface CategorySummary {
  category: Category;
  products: number;
  batches: number;
  quantity: number;
}

/** Active stock broken down by category, busiest first. */
export function summariseByCategory(batches: BatchWithProduct[]): CategorySummary[] {
  const byKey = new Map<string, { summary: CategorySummary; productIds: Set<number> }>();

  for (const batch of batches) {
    if (batch.status !== 'active') continue;

    const category = categoryFor(batch.product.category);
    let entry = byKey.get(category.key);
    if (!entry) {
      entry = {
        summary: { category, products: 0, batches: 0, quantity: 0 },
        productIds: new Set(),
      };
      byKey.set(category.key, entry);
    }

    entry.productIds.add(batch.productId);
    entry.summary.batches += 1;
    entry.summary.quantity += batch.quantity;
    entry.summary.products = entry.productIds.size;
  }

  return [...byKey.values()]
    .map((entry) => entry.summary)
    .sort((a, b) => b.batches - a.batches || a.category.label.localeCompare(b.category.label));
}
