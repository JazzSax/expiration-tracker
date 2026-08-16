import { Text, View } from 'react-native';
import { palette } from '../constants/theme';

/** Marks the example stock loaded on first launch so it's never mistaken for real inventory. */
export function SampleBadge() {
  return (
    <View className="rounded-sm px-1.5 py-0.5" style={{ backgroundColor: palette.line }}>
      <Text className="font-stampBold text-[9px]" style={{ color: palette.muted, letterSpacing: 1 }}>
        SAMPLE
      </Text>
    </View>
  );
}
