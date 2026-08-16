import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 font-medium text-[11px] uppercase text-muted" style={{ letterSpacing: 1 }}>
        {label}
      </Text>
      {children}
      {hint ? <Text className="mt-1 font-body text-xs text-muted">{hint}</Text> : null}
    </View>
  );
}
