import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ExpiryField } from '../../components/ExpiryField';
import { Field } from '../../components/Field';
import { palette } from '../../constants/theme';
import { useBatch, useDeleteBatch, useUpdateBatch } from '../../hooks/useStock';

/** Correcting a mistyped date or count — reached from any batch row. */
export default function EditBatchScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const batchId = Number(id);

  const { data: batch, isLoading } = useBatch(batchId);
  const update = useUpdateBatch();
  const remove = useDeleteBatch();

  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<string | null>(null);
  const [location, setLocation] = useState<string | null>(null);

  useEffect(() => {
    if (!batch) return;
    setExpiresAt((current) => current ?? batch.expiresAt);
    setQuantity((current) => current ?? String(batch.quantity));
    setLocation((current) => current ?? (batch.location ?? ''));
  }, [batch]);

  if (isLoading) return null;

  if (!batch) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-paper px-6">
        <Text className="font-display text-base text-ink">This batch is no longer tracked</Text>
        <Text className="mt-1 text-center font-body text-sm text-muted">
          It was discarded or deleted from another screen.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          className="mt-5 rounded-lg px-4 py-3"
          style={{ backgroundColor: palette.ink }}
        >
          <Text className="font-semibold text-sm text-card">Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const count = Number(quantity);
  const canSave = Number.isFinite(count) && count > 0 && !!expiresAt;

  function save() {
    update.mutate(
      {
        id: batch!.id,
        expiresAt: expiresAt!,
        quantity: count,
        location: location?.trim() || null,
      },
      {
        onSuccess: () => router.back(),
        onError: (error) => Alert.alert("Couldn't save this batch", String(error)),
      },
    );
  }

  function confirmDelete() {
    Alert.alert(
      'Delete this batch?',
      'Use this when the batch was entered by mistake. To record spoilage, discard it instead so it shows in your waste log.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => remove.mutate(batch!.id, { onSuccess: () => router.back() }),
        },
      ],
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-paper">
      <ScrollView contentContainerClassName="px-4 pb-10">
        <View className="flex-row items-center justify-between py-3">
          <Text className="flex-1 pr-3 font-display text-2xl text-ink" numberOfLines={1}>
            {batch.product.name}
          </Text>
          <Pressable accessibilityRole="button" onPress={() => router.back()} className="px-2 py-1">
            <Text className="font-stampBold text-xs text-muted">CLOSE</Text>
          </Pressable>
        </View>

        <View className="rounded-lg border border-line bg-card p-4">
          <Field label="Expires">
            <ExpiryField value={expiresAt ?? batch.expiresAt} onChange={setExpiresAt} />
          </Field>

          <Field label="Quantity">
            <TextInput
              value={quantity ?? ''}
              onChangeText={(text) => setQuantity(text.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              className="rounded-lg border border-line bg-card px-3 py-3 font-stampBold text-base text-ink"
            />
          </Field>

          <Field label="Shelf or aisle">
            <TextInput
              value={location ?? ''}
              onChangeText={setLocation}
              placeholder="Optional"
              placeholderTextColor={palette.muted}
              className="rounded-lg border border-line bg-card px-3 py-3 font-body text-base text-ink"
            />
          </Field>

          <Pressable
            accessibilityRole="button"
            disabled={!canSave || update.isPending}
            onPress={save}
            className="rounded-lg py-3.5"
            style={{ backgroundColor: canSave ? palette.ink : palette.line }}
          >
            <Text
              className="text-center font-semibold text-sm"
              style={{ color: canSave ? palette.card : palette.muted }}
            >
              Save changes
            </Text>
          </Pressable>
        </View>

        <Pressable accessibilityRole="button" onPress={confirmDelete} className="mt-4 py-3">
          <Text className="text-center font-medium text-sm text-expired">Delete this batch</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
