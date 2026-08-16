import { Text, View } from 'react-native';
import { stageColor } from '../constants/theme';
import type { Stage } from '../domain/types';
import { formatStamp } from '../lib/format';

/**
 * The signature element: the expiry date set like the ink stamp printed on a
 * carton. Mono, letter-spaced, boxed in a hairline rule.
 */
export function DateStamp({
  date,
  stage,
  size = 'md',
}: {
  date: string;
  stage: Stage;
  size?: 'sm' | 'md';
}) {
  const color = stageColor[stage];
  return (
    <View
      className={size === 'sm' ? 'border px-1.5 py-0.5' : 'border px-2 py-1'}
      style={{ borderColor: color }}
    >
      <Text
        className={size === 'sm' ? 'font-stamp text-[10px]' : 'font-stampBold text-xs'}
        style={{ color, letterSpacing: 1.4 }}
      >
        EXP {formatStamp(date)}
      </Text>
    </View>
  );
}
