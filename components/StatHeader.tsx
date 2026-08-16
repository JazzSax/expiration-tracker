import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Text, View } from 'react-native';
import { palette, stageColor } from '../constants/theme';
import type { Digest, StagedBatch } from '../domain/types';
import { formatCountdown, formatStamp } from '../lib/format';

/**
 * A read-only summary, not a control. Expiring gets the width and the large
 * numeral because it's the number that decides whether the owner walks the
 * shelves today; expired and total stock are context beside it.
 */
export function StatHeader({
  counts,
  soonest,
}: {
  counts: Digest['counts'];
  soonest: StagedBatch | null;
}) {
  const expiring = counts.urgent + counts.soon;

  return (
    <View className="flex-row gap-3">
      <View
        className="flex-[1.45] justify-between rounded-xl border border-line bg-card p-4"
        accessibilityLabel={`${expiring} batches expiring soon`}
      >
        <View>
          <View className="flex-row items-center gap-1.5">
            <MaterialCommunityIcons name="clock-alert-outline" size={14} color={stageColor.urgent} />
            <Text
              className="font-medium text-[11px] uppercase"
              style={{ color: palette.muted, letterSpacing: 0.9 }}
            >
              Expiring
            </Text>
          </View>

          <Text className="mt-1 font-display text-6xl" style={{ color: stageColor.urgent }}>
            {expiring}
          </Text>
        </View>

        {soonest ? (
          <View className="mt-3 border-t border-line pt-2.5">
            <Text className="font-body text-[11px] text-muted">Soonest</Text>
            <Text className="mt-0.5 font-semibold text-xs text-ink" numberOfLines={1}>
              {soonest.product.name}
            </Text>
            <View className="mt-1 flex-row items-center gap-1.5">
              <Text
                className="font-stampBold text-[11px]"
                style={{ color: stageColor[soonest.stage], letterSpacing: 1 }}
              >
                {formatStamp(soonest.expiresAt)}
              </Text>
              <Text className="font-body text-[11px] text-muted">
                · {formatCountdown(soonest.daysLeft)}
              </Text>
            </View>
          </View>
        ) : (
          <View className="mt-3 border-t border-line pt-2.5">
            <Text className="font-body text-[11px] text-muted">
              Nothing due — the shelves are clear.
            </Text>
          </View>
        )}
      </View>

      <View className="flex-1 gap-3">
        <View
          className="flex-1 justify-center rounded-xl border border-line bg-card p-3.5"
          accessibilityLabel={`${counts.expired} batches expired`}
        >
          <View className="flex-row items-center gap-1.5">
            <MaterialCommunityIcons name="alert-octagon-outline" size={13} color={stageColor.expired} />
            <Text
              className="font-medium text-[10px] uppercase"
              style={{ color: palette.muted, letterSpacing: 0.9 }}
            >
              Expired
            </Text>
          </View>
          <Text className="mt-0.5 font-display text-3xl" style={{ color: stageColor.expired }}>
            {counts.expired}
          </Text>
        </View>

        <View
          className="flex-1 justify-center rounded-xl border border-line bg-card p-3.5"
          accessibilityLabel={`${counts.total} batches in stock`}
        >
          <View className="flex-row items-center gap-1.5">
            <MaterialCommunityIcons name="package-variant-closed" size={13} color={palette.muted} />
            <Text
              className="font-medium text-[10px] uppercase"
              style={{ color: palette.muted, letterSpacing: 0.9 }}
            >
              All stock
            </Text>
          </View>
          <Text className="mt-0.5 font-display text-3xl text-ink">{counts.total}</Text>
        </View>
      </View>
    </View>
  );
}
