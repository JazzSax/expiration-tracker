import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Text, View } from 'react-native';
import { palette } from '../constants/theme';
import type { CategorySummary } from '../domain/summary';

/**
 * All stock, shown as what it is rather than as another list of batches: a
 * breakdown by category. Answers "what do I actually hold?" in one glance,
 * which a scrolling list of every batch never does. The full list lives in Stock.
 */
export function StockBreakdown({ summary }: { summary: CategorySummary[] }) {
  return (
    <View className="flex-row flex-wrap" style={{ gap: 10 }}>
      {summary.map((row) => (
        <View
          key={row.category.key}
          className="rounded-xl border border-line bg-card p-3"
          style={{ width: '48%' }}
          accessibilityLabel={`${row.category.label}: ${row.batches} batches, ${row.quantity} units`}
        >
          <View className="flex-row items-center gap-2">
            <View
              className="h-8 w-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${row.category.color}1A` }}
            >
              <MaterialCommunityIcons
                name={row.category.icon as never}
                size={18}
                color={row.category.color}
              />
            </View>
            <Text className="flex-1 font-semibold text-xs text-ink" numberOfLines={1}>
              {row.category.label}
            </Text>
          </View>

          <View className="mt-2.5 flex-row items-end gap-1">
            <Text className="font-display text-2xl text-ink">{row.quantity}</Text>
            <Text className="pb-1 font-body text-[11px] text-muted">units</Text>
          </View>

          <Text className="mt-0.5 font-body text-[11px]" style={{ color: palette.muted }}>
            {row.products} {row.products === 1 ? 'product' : 'products'} · {row.batches}{' '}
            {row.batches === 1 ? 'batch' : 'batches'}
          </Text>
        </View>
      ))}
    </View>
  );
}
