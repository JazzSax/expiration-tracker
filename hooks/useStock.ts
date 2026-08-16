import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDb } from '../db';
import {
  addShipment,
  deleteBatch,
  discardBatch,
  findProductByBarcode,
  getActiveBatches,
  getSettings,
  listBatches,
  listWaste,
  searchProducts,
  snapshotData,
  updateBatch,
  updateSettings,
  type BatchFilter,
  type ShipmentRow,
} from '../db/queries';
import { clearSampleData, loadSampleData } from '../db/seed';
import { countSampleProducts } from '../db/queries';
import { buildDigest, todayIso } from '../domain/expiry';
import { summariseByCategory } from '../domain/summary';
import type { Settings } from '../domain/types';
import { rescheduleNotifications } from '../notify/scheduler';

/** Query keys. `stock` covers anything derived from batches. */
export const keys = {
  stock: ['stock'] as const,
  settings: ['settings'] as const,
  products: (query: string) => ['products', query] as const,
};

export function useDashboard() {
  return useQuery({
    queryKey: [...keys.stock, 'dashboard'],
    queryFn: async () => {
      const db = await getDb();
      const [batches, settings] = await Promise.all([getActiveBatches(db), getSettings(db)]);
      const digest = buildDigest(batches, settings, todayIso());
      return { digest, categories: summariseByCategory(batches) };
    },
  });
}

export function useBatches(filter: BatchFilter) {
  return useQuery({
    queryKey: [...keys.stock, 'list', filter],
    queryFn: async () => {
      const db = await getDb();
      const [batches, settings] = await Promise.all([listBatches(db, filter), getSettings(db)]);
      return buildDigest(batches, settings, todayIso(), { include: 'all' });
    },
  });
}

/** A single active batch, for the edit screen. */
export function useBatch(id: number) {
  return useQuery({
    queryKey: [...keys.stock, 'batch', id],
    queryFn: async () => {
      const batches = await getActiveBatches(await getDb());
      return batches.find((batch) => batch.id === id) ?? null;
    },
  });
}

export function useWaste() {
  return useQuery({
    queryKey: [...keys.stock, 'waste'],
    queryFn: async () => listWaste(await getDb()),
  });
}

export function useSettings() {
  return useQuery({
    queryKey: keys.settings,
    queryFn: async () => getSettings(await getDb()),
  });
}

export function useProductSearch(query: string) {
  return useQuery({
    queryKey: keys.products(query),
    queryFn: async () => searchProducts(await getDb(), query),
  });
}

export async function lookupBarcode(barcode: string) {
  return findProductByBarcode(await getDb(), barcode);
}

/**
 * Every mutation ends the same way: refresh what's on screen, then rebuild the
 * notification schedule so alerts match the stock on file.
 */
function useStockMutation<TArgs>(mutate: (args: TArgs) => Promise<unknown>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: mutate,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: keys.stock });
      await rescheduleNotifications();
    },
  });
}

export function useAddShipment() {
  return useStockMutation(async (rows: ShipmentRow[]) => addShipment(await getDb(), rows));
}

export function useDiscardBatch() {
  return useStockMutation(async ({ id, quantity }: { id: number; quantity: number }) =>
    discardBatch(await getDb(), id, quantity),
  );
}

export function useUpdateBatch() {
  return useStockMutation(
    async ({ id, ...patch }: { id: number; expiresAt?: string; quantity?: number; location?: string | null }) =>
      updateBatch(await getDb(), id, patch),
  );
}

export function useDeleteBatch() {
  return useStockMutation(async (id: number) => deleteBatch(await getDb(), id));
}

export function useUpdateSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Settings>) => updateSettings(await getDb(), patch),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: keys.settings });
      await client.invalidateQueries({ queryKey: keys.stock });
      await rescheduleNotifications();
    },
  });
}

export async function readSnapshot() {
  return snapshotData(await getDb());
}

/** How many example products are still in the store, for the Alerts screen. */
export function useSampleCount() {
  return useQuery({
    queryKey: [...keys.stock, 'sampleCount'],
    queryFn: async () => countSampleProducts(await getDb()),
  });
}

export function useClearSampleData() {
  return useStockMutation(async () => clearSampleData(await getDb()));
}

export function useLoadSampleData() {
  return useStockMutation(async () => loadSampleData(await getDb(), todayIso()));
}
