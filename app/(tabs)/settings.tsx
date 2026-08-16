import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Field } from '../../components/Field';
import { palette } from '../../constants/theme';
import {
  useClearSampleData,
  useLoadSampleData,
  useSampleCount,
  useSettings,
  useUpdateSettings,
  useWaste,
} from '../../hooks/useStock';
import { exportBackup, pickBackup, restoreBackup } from '../../lib/backup';
import { formatStamp } from '../../lib/format';
import { runningInExpoGo } from '../../lib/runtime';
import { rescheduleNotifications, sendTestNotification } from '../../notify/scheduler';

const HOURS = [6, 7, 8, 9, 12, 15, 17, 20];

export default function AlertsScreen() {
  const { data: settings } = useSettings();
  const { data: waste = [] } = useWaste();
  const { data: sampleCount = 0 } = useSampleCount();
  const update = useUpdateSettings();
  const clearSamples = useClearSampleData();
  const loadSamples = useLoadSampleData();
  const [warnDraft, setWarnDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!settings) return null;

  async function handleExport() {
    setBusy(true);
    try {
      const result = await exportBackup();
      Alert.alert(
        'Backup ready',
        `${result.products} products and ${result.batches} batches saved as ${result.fileName}.`,
      );
    } catch (error) {
      Alert.alert("Couldn't create the backup", String(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleImport() {
    setBusy(true);
    try {
      const preview = await pickBackup();
      if (!preview) return;

      Alert.alert(
        'Restore this backup?',
        `${preview.products} products and ${preview.batches} batches from ${formatStamp(
          preview.exportedAt.slice(0, 10),
        )}. This replaces everything currently on this phone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore',
            style: 'destructive',
            onPress: async () => {
              await restoreBackup(preview.snapshot);
              await rescheduleNotifications();
              Alert.alert('Backup restored', 'Your stock and alerts are back.');
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert("Couldn't read that file", error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  const discardedTotal = waste.reduce((sum, batch) => sum + (batch.discardedQuantity ?? 0), 0);

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top', 'left', 'right']}>
      <ScrollView contentContainerClassName="px-4 pb-10">
        <Text className="py-3 font-display text-2xl text-ink">Alerts</Text>

        <View className="rounded-lg border border-line bg-card p-4">
          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-1 pr-4">
              <Text className="font-semibold text-sm text-ink">Expiry alerts</Text>
              <Text className="mt-0.5 font-body text-xs text-muted">
                A notification on the days something needs attention.
              </Text>
            </View>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={(next) => update.mutate({ notificationsEnabled: next })}
              trackColor={{ true: palette.ink, false: palette.line }}
            />
          </View>

          <Field label="Alert time">
            <View className="flex-row flex-wrap gap-2">
              {HOURS.map((hour) => {
                const selected = settings.notifyHour === hour;
                return (
                  <Pressable
                    key={hour}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => update.mutate({ notifyHour: hour })}
                    className="rounded-md border px-3 py-2"
                    style={{
                      borderColor: selected ? palette.ink : palette.line,
                      backgroundColor: selected ? palette.ink : palette.card,
                    }}
                  >
                    <Text
                      className="font-stampBold text-xs"
                      style={{ color: selected ? palette.card : palette.ink, letterSpacing: 1 }}
                    >
                      {String(hour).padStart(2, '0')}:00
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>

          <Field
            label="Warn me this many days ahead"
            hint="Applies to products without their own setting."
          >
            <TextInput
              value={warnDraft ?? String(settings.defaultWarnDays)}
              onChangeText={(text) => setWarnDraft(text.replace(/[^0-9]/g, ''))}
              onBlur={() => {
                const days = Number(warnDraft);
                if (Number.isFinite(days) && days > 0) update.mutate({ defaultWarnDays: days });
                setWarnDraft(null);
              }}
              keyboardType="number-pad"
              className="rounded-lg border border-line bg-card px-3 py-3 font-stampBold text-base text-ink"
            />
          </Field>

          <Pressable
            accessibilityRole="button"
            onPress={async () => {
              try {
                const sent = await sendTestNotification();
                if (!sent) {
                  Alert.alert(
                    'Notifications are blocked',
                    'Turn on notifications for this app in your phone settings to get expiry alerts.',
                  );
                }
              } catch (error) {
                Alert.alert(
                  "Couldn't send the test alert",
                  error instanceof Error ? error.message : String(error),
                );
              }
            }}
            className="flex-row items-center justify-center gap-2 rounded-lg border border-line py-3"
          >
            <MaterialCommunityIcons name="bell-ring-outline" size={16} color={palette.ink} />
            <Text className="font-medium text-sm text-ink">Send a test alert</Text>
          </Pressable>
        </View>

        {runningInExpoGo() && (
          <View className="mt-3 flex-row gap-2.5 rounded-lg border border-line bg-card p-3.5">
            <MaterialCommunityIcons name="information-outline" size={18} color={palette.muted} />
            <View className="flex-1">
              <Text className="font-semibold text-xs text-ink">About the Expo Go warning</Text>
              <Text className="mt-1 font-body text-xs text-muted">
                Expo Go warns that notifications aren't fully supported. That applies to push
                notifications sent from a server, which this app never uses. Your expiry alerts are
                scheduled on this phone and do work here. Tap Send a test alert to confirm.
              </Text>
            </View>
          </View>
        )}

        <Text
          className="mb-2 mt-6 font-medium text-[11px] uppercase text-muted"
          style={{ letterSpacing: 1 }}
        >
          Example data
        </Text>
        {sampleCount === 0 ? (
          <View className="rounded-lg border border-line bg-card p-4">
            <Text className="font-body text-xs text-muted">
              Load a dozen example grocery products, spread across expired, expiring and healthy, to
              see how each screen behaves. They're badged Sample and can be cleared in one tap.
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={loadSamples.isPending}
              onPress={() => loadSamples.mutate(undefined)}
              className="mt-3 flex-row items-center justify-center gap-2 rounded-lg border border-line py-3"
            >
              <MaterialCommunityIcons name="basket-outline" size={16} color={palette.ink} />
              <Text className="font-medium text-sm text-ink">
                {loadSamples.isPending ? 'Loading…' : 'Load sample products'}
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View className="rounded-lg border border-line bg-card p-4">
              <Text className="font-body text-xs text-muted">
                {sampleCount} example products were loaded so you could see how the app works. They
                are badged Sample. Clearing them leaves any stock you've entered yourself untouched.
              </Text>
              <Pressable
                accessibilityRole="button"
                disabled={clearSamples.isPending}
                onPress={() =>
                  Alert.alert(
                    'Clear the example products?',
                    'Only the products badged Sample are removed. Anything you entered yourself stays.',
                    [
                      { text: 'Keep', style: 'cancel' },
                      {
                        text: 'Clear',
                        style: 'destructive',
                        onPress: () => clearSamples.mutate(undefined),
                      },
                    ],
                  )
                }
                className="mt-3 flex-row items-center justify-center gap-2 rounded-lg border border-line py-3"
              >
                <MaterialCommunityIcons name="broom" size={16} color={palette.ink} />
                <Text className="font-medium text-sm text-ink">
                  {clearSamples.isPending ? 'Clearing…' : 'Clear sample data'}
                </Text>
              </Pressable>
            </View>
          </>
        )}

        <Text className="mb-2 mt-6 font-medium text-[11px] uppercase text-muted" style={{ letterSpacing: 1 }}>
          Backup
        </Text>
        <View className="rounded-lg border border-line bg-card p-4">
          <Text className="font-body text-xs text-muted">
            Your stock is stored on this phone only. Export a copy you can restore if the phone is
            lost or replaced.
          </Text>
          <Text className="mt-2 font-stamp text-xs text-muted" style={{ letterSpacing: 1 }}>
            {settings.lastExportAt
              ? `LAST EXPORT ${formatStamp(settings.lastExportAt.slice(0, 10))}`
              : 'NEVER EXPORTED'}
          </Text>

          <View className="mt-3 flex-row gap-2">
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={handleExport}
              className="flex-1 rounded-lg py-3"
              style={{ backgroundColor: palette.ink, opacity: busy ? 0.6 : 1 }}
            >
              <Text className="text-center font-semibold text-sm text-card">Export backup</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={handleImport}
              className="flex-1 rounded-lg border border-line py-3"
            >
              <Text className="text-center font-medium text-sm text-ink">Restore</Text>
            </Pressable>
          </View>
        </View>

        <Text className="mb-2 mt-6 font-medium text-[11px] uppercase text-muted" style={{ letterSpacing: 1 }}>
          Waste log
        </Text>
        <View className="rounded-lg border border-line bg-card p-4">
          {waste.length === 0 ? (
            <Text className="font-body text-sm text-muted">
              Nothing discarded yet. Batches you discard are recorded here.
            </Text>
          ) : (
            <>
              <Text className="font-display text-xl text-ink">
                {discardedTotal} <Text className="font-body text-sm text-muted">units discarded</Text>
              </Text>
              <View className="mt-3 gap-2">
                {waste.slice(0, 8).map((batch) => (
                  <View key={batch.id} className="flex-row justify-between border-t border-line pt-2">
                    <Text className="font-body text-sm text-ink">{batch.product.name}</Text>
                    <Text className="font-stamp text-xs text-muted" style={{ letterSpacing: 1 }}>
                      {batch.discardedQuantity} · {formatStamp(batch.expiresAt)}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
