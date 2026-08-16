import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BarcodeSheet } from '../../components/BarcodeSheet';
import { CategoryIcon } from '../../components/CategoryIcon';
import { CategoryPicker } from '../../components/CategoryPicker';
import { DateStamp } from '../../components/DateStamp';
import { ExpiryField } from '../../components/ExpiryField';
import { Field } from '../../components/Field';
import { ProductPicker } from '../../components/ProductPicker';
import { palette } from '../../constants/theme';
import { guessCategory } from '../../domain/categories';
import { addDays, todayIso } from '../../domain/expiry';
import type { Product } from '../../domain/types';
import type { ShipmentRow } from '../../db/queries';
import { lookupBarcode, useAddShipment } from '../../hooks/useStock';

const emptyDraft = () => ({
  productName: '',
  barcode: null as string | null,
  unit: null as string | null,
  warnDays: null as number | null,
  category: 'other',
  /** True once the owner picks a category, so typing stops overriding it. */
  categoryTouched: false,
  expiresAt: addDays(todayIso(), 30),
  quantity: '',
  location: '',
});

type Draft = ReturnType<typeof emptyDraft>;

export default function ReceiveScreen() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [rows, setRows] = useState<ShipmentRow[]>([]);
  const [scanning, setScanning] = useState(false);
  const save = useAddShipment();

  const quantity = Number(draft.quantity);
  const canAdd = draft.productName.trim().length > 0 && Number.isFinite(quantity) && quantity > 0;

  function applyProduct(product: Product) {
    setDraft((current) => ({
      ...current,
      productName: product.name,
      barcode: product.barcode ?? current.barcode,
      unit: product.unit,
      warnDays: product.warnDays,
      category: product.category ?? guessCategory(product.name),
      categoryTouched: true,
    }));
  }

  /** Typing a name pre-selects a category until the owner picks one themselves. */
  function changeName(text: string) {
    setDraft((current) => ({
      ...current,
      productName: text,
      category: current.categoryTouched ? current.category : guessCategory(text),
    }));
  }

  async function handleScan(barcode: string) {
    setScanning(false);
    const known = await lookupBarcode(barcode);
    if (known) {
      applyProduct(known);
      return;
    }
    setDraft((current) => ({ ...current, barcode }));
    Alert.alert(
      'New barcode',
      "Type the product name once and this app will recognise the code from now on.",
    );
  }

  function addRow() {
    setRows((current) => [
      ...current,
      {
        productName: draft.productName.trim(),
        barcode: draft.barcode,
        unit: draft.unit,
        warnDays: draft.warnDays,
        category: draft.category,
        expiresAt: draft.expiresAt,
        quantity,
        location: draft.location.trim() || null,
      },
    ]);
    // Keep the date and location: a shipment usually shares both.
    setDraft((current) => ({
      ...emptyDraft(),
      expiresAt: current.expiresAt,
      location: current.location,
    }));
  }

  function saveShipment() {
    save.mutate(rows, {
      onSuccess: () => {
        const count = rows.length;
        setRows([]);
        Alert.alert(
          'Shipment recorded',
          `${count} ${count === 1 ? 'batch is' : 'batches are'} now being tracked.`,
          [{ text: 'View stock', onPress: () => router.push('/inventory') }, { text: 'Add more' }],
        );
      },
      onError: (error) => Alert.alert("Couldn't save this shipment", String(error)),
    });
  }

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="px-4 pb-8" keyboardShouldPersistTaps="handled">
          <View className="flex-row items-center justify-between py-3">
            <Text className="font-display text-2xl text-ink">Receive</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Scan a barcode"
              onPress={() => setScanning(true)}
              className="flex-row items-center gap-1.5 rounded-lg border border-line bg-card px-3 py-2"
            >
              <MaterialCommunityIcons name="barcode-scan" size={16} color={palette.ink} />
              <Text className="font-semibold text-xs text-ink">Scan</Text>
            </Pressable>
          </View>

          <View className="rounded-lg border border-line bg-card p-4">
            <Field label="Product" hint={draft.barcode ? `Barcode ${draft.barcode}` : undefined}>
              <ProductPicker value={draft.productName} onChangeText={changeName} onPick={applyProduct} />
            </Field>

            <Field label="Category" hint="Sets the icon on the card.">
              <CategoryPicker
                value={draft.category}
                onChange={(key) =>
                  setDraft((current) => ({ ...current, category: key, categoryTouched: true }))
                }
              />
            </Field>

            <Field label="Expires">
              <ExpiryField
                value={draft.expiresAt}
                onChange={(iso) => setDraft((current) => ({ ...current, expiresAt: iso }))}
              />
            </Field>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Field label="Quantity">
                  <TextInput
                    value={draft.quantity}
                    onChangeText={(text) =>
                      setDraft((current) => ({ ...current, quantity: text.replace(/[^0-9]/g, '') }))
                    }
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={palette.muted}
                    className="rounded-lg border border-line bg-card px-3 py-3 font-stampBold text-base text-ink"
                  />
                </Field>
              </View>
              <View className="flex-1">
                <Field label="Shelf or aisle">
                  <TextInput
                    value={draft.location}
                    onChangeText={(text) => setDraft((current) => ({ ...current, location: text }))}
                    placeholder="Optional"
                    placeholderTextColor={palette.muted}
                    className="rounded-lg border border-line bg-card px-3 py-3 font-body text-base text-ink"
                  />
                </Field>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={!canAdd}
              onPress={addRow}
              className="rounded-lg py-3.5"
              style={{ backgroundColor: canAdd ? palette.ink : palette.line }}
            >
              <Text
                className="text-center font-semibold text-sm"
                style={{ color: canAdd ? palette.card : palette.muted }}
              >
                Add to shipment
              </Text>
            </Pressable>
          </View>

          {rows.length > 0 && (
            <View className="mt-6">
              <Text
                className="mb-2 font-medium text-[11px] uppercase text-muted"
                style={{ letterSpacing: 1 }}
              >
                In this shipment
              </Text>

              {rows.map((row, index) => (
                <View
                  key={`${row.productName}-${row.expiresAt}-${index}`}
                  className="mb-2 flex-row items-center justify-between rounded-lg border border-line bg-card px-3 py-3"
                >
                  <CategoryIcon category={row.category ?? null} size="sm" />
                  <View className="flex-1 px-3">
                    <Text className="font-medium text-sm text-ink" numberOfLines={1}>
                      {row.productName}
                    </Text>
                    <Text className="font-body text-xs text-muted">
                      {row.quantity} {row.unit ?? 'pcs'}
                      {row.location ? ` · ${row.location}` : ''}
                    </Text>
                  </View>
                  <DateStamp date={row.expiresAt} stage="ok" size="sm" />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${row.productName} from this shipment`}
                    onPress={() => setRows((current) => current.filter((_, i) => i !== index))}
                    hitSlop={8}
                    className="ml-2 px-1 py-1"
                  >
                    <MaterialCommunityIcons name="close" size={16} color={palette.muted} />
                  </Pressable>
                </View>
              ))}

              <Pressable
                accessibilityRole="button"
                disabled={save.isPending}
                onPress={saveShipment}
                className="mt-3 rounded-lg py-4"
                style={{ backgroundColor: palette.ink, opacity: save.isPending ? 0.6 : 1 }}
              >
                <Text className="text-center font-semibold text-base text-card">
                  {save.isPending
                    ? 'Saving…'
                    : `Save shipment · ${rows.length} ${rows.length === 1 ? 'batch' : 'batches'}`}
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <BarcodeSheet
        visible={scanning}
        onClose={() => setScanning(false)}
        onScanned={handleScan}
      />
    </SafeAreaView>
  );
}
