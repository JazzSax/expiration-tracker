import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { palette } from '../constants/theme';
import { addDays, todayIso } from '../domain/expiry';
import { formatFullDate, formatStamp } from '../lib/format';

const QUICK_ADD = [
  { label: '+1 wk', days: 7 },
  { label: '+1 mo', days: 30 },
  { label: '+6 mo', days: 182 },
  { label: '+1 yr', days: 365 },
];

function toDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toIso(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

/**
 * The date is the whole point of the app, so it gets the stamp treatment and
 * shortcuts for the shelf lives that come up over and over.
 */
export function ExpiryField({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const [picking, setPicking] = useState(false);

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Expiry date, currently ${formatFullDate(value)}. Tap to change.`}
        onPress={() => setPicking(true)}
        className="flex-row items-center justify-between rounded-lg border border-line bg-card px-3 py-3"
      >
        <Text className="font-stampBold text-lg text-ink" style={{ letterSpacing: 2 }}>
          {formatStamp(value)}
        </Text>
        <Text className="font-body text-xs text-muted">{formatFullDate(value)}</Text>
      </Pressable>

      <View className="mt-2 flex-row gap-2">
        {QUICK_ADD.map((option) => (
          <Pressable
            key={option.label}
            accessibilityRole="button"
            onPress={() => onChange(addDays(todayIso(), option.days))}
            className="rounded-full border border-line bg-card px-3 py-1.5"
          >
            <Text className="font-medium text-xs text-ink">{option.label}</Text>
          </Pressable>
        ))}
      </View>

      {picking && (
        <DateTimePicker
          value={toDate(value)}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          accentColor={palette.ink}
          onChange={(event, selected) => {
            if (Platform.OS !== 'ios') setPicking(false);
            if (event.type === 'set' && selected) onChange(toIso(selected));
          }}
        />
      )}

      {picking && Platform.OS === 'ios' && (
        <Pressable
          accessibilityRole="button"
          onPress={() => setPicking(false)}
          className="mt-2 self-end rounded-md px-3 py-2"
          style={{ backgroundColor: palette.ink }}
        >
          <Text className="font-medium text-xs text-card">Done</Text>
        </Pressable>
      )}
    </View>
  );
}
