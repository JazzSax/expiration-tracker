import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { z } from 'zod';
import { getDb } from '../db';
import { replaceAllData, snapshotData, updateSettings, type Snapshot } from '../db/queries';
import { todayIso } from '../domain/expiry';

/**
 * Backup lives entirely on the owner's terms: a file they can put wherever
 * they like. Nothing is uploaded anywhere.
 */

const productSchema = z.object({
  id: z.number(),
  name: z.string().min(1),
  barcode: z.string().nullable(),
  unit: z.string().nullable(),
  warnDays: z.number().nullable(),
  // Added after the first release, so older backups are still readable.
  category: z.string().nullable().default(null),
  isSample: z.boolean().default(false),
});

const batchSchema = z.object({
  id: z.number(),
  productId: z.number(),
  expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  quantity: z.number(),
  location: z.string().nullable(),
  status: z.enum(['active', 'discarded']),
  discardedAt: z.string().nullable(),
  discardedQuantity: z.number().nullable(),
  createdAt: z.string(),
  isSample: z.boolean().default(false),
});

const snapshotSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  settings: z.object({
    defaultWarnDays: z.number(),
    notifyHour: z.number(),
    notificationsEnabled: z.boolean(),
    lastExportAt: z.string().nullable(),
  }),
  products: z.array(productSchema),
  batches: z.array(batchSchema),
});

export interface ExportResult {
  fileName: string;
  products: number;
  batches: number;
}

export async function exportBackup(): Promise<ExportResult> {
  const db = await getDb();
  const snapshot = await snapshotData(db);

  const fileName = `expiration-tracker-${todayIso()}.json`;
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(snapshot, null, 2));

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Save your backup',
      UTI: 'public.json',
    });
  }

  await updateSettings(db, { lastExportAt: new Date().toISOString() });
  return { fileName, products: snapshot.products.length, batches: snapshot.batches.length };
}

export interface ImportPreview {
  snapshot: Snapshot;
  products: number;
  batches: number;
  exportedAt: string;
}

/** Reads and validates a backup file. Nothing is written until it's confirmed. */
export async function pickBackup(): Promise<ImportPreview | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'public.json', '*/*'],
    copyToCacheDirectory: true,
  });
  if (picked.canceled || !picked.assets?.[0]) return null;

  const raw = new File(picked.assets[0].uri).textSync();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("That file isn't a backup this app can read.");
  }

  const result = snapshotSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error("That file isn't a backup this app can read.");
  }

  const snapshot = result.data as Snapshot;
  return {
    snapshot,
    products: snapshot.products.length,
    batches: snapshot.batches.length,
    exportedAt: snapshot.exportedAt,
  };
}

export async function restoreBackup(snapshot: Snapshot): Promise<void> {
  await replaceAllData(await getDb(), snapshot);
}
