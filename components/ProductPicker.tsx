import { Pressable, Text, TextInput, View } from 'react-native';
import { palette } from '../constants/theme';
import type { Product } from '../domain/types';
import { useProductSearch } from '../hooks/useStock';

/**
 * Type-ahead over the products already received. Picking a remembered product
 * carries its unit and warn window forward, so a repeat delivery only needs a
 * date and a count.
 */
export function ProductPicker({
  value,
  onChangeText,
  onPick,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onPick: (product: Product) => void;
}) {
  const { data: matches = [] } = useProductSearch(value);
  const exact = matches.some((product) => product.name.toLowerCase() === value.trim().toLowerCase());
  const suggestions = value.trim().length > 0 && !exact ? matches.slice(0, 4) : [];

  return (
    <View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="e.g. Evaporated Milk 370ml"
        placeholderTextColor={palette.muted}
        autoCapitalize="words"
        autoCorrect={false}
        className="rounded-lg border border-line bg-card px-3 py-3 font-body text-base text-ink"
      />

      {suggestions.length > 0 && (
        <View className="mt-1.5 overflow-hidden rounded-lg border border-line bg-card">
          {suggestions.map((product, index) => (
            <Pressable
              key={product.id}
              accessibilityRole="button"
              onPress={() => onPick(product)}
              className={`px-3 py-2.5 ${index > 0 ? 'border-t border-line' : ''}`}
            >
              <Text className="font-medium text-sm text-ink">{product.name}</Text>
              <Text className="font-body text-xs text-muted">
                Received before{product.unit ? ` · ${product.unit}` : ''}
                {product.warnDays !== null ? ` · warns ${product.warnDays} days ahead` : ''}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
