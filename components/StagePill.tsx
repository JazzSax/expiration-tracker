import { Text, View } from 'react-native';
import { stageColor, stageSoftColor } from '../constants/theme';
import type { Stage } from '../domain/types';
import { formatCountdown } from '../lib/format';

/**
 * Time remaining, always spelled out. Color repeats what the words already
 * say, so the app stays readable without relying on color alone.
 */
export function StagePill({ stage, daysLeft }: { stage: Stage; daysLeft: number }) {
  return (
    <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: stageSoftColor[stage] }}>
      <Text className="font-semibold text-xs" style={{ color: stageColor[stage] }}>
        {formatCountdown(daysLeft)}
      </Text>
    </View>
  );
}
