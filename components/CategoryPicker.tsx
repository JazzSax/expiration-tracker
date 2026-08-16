import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, ScrollView, Text } from 'react-native';
import { palette } from '../constants/theme';
import { CATEGORIES } from '../domain/categories';

/**
 * Picking a category is optional — it only decides the icon on the card. It's
 * pre-selected from the product name, so most shipments need no thought here.
 */
export function CategoryPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pr-4">
      {CATEGORIES.map((category) => {
        const selected = category.key === value;
        return (
          <Pressable
            key={category.key}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={category.label}
            onPress={() => onChange(category.key)}
            className="flex-row items-center gap-1.5 rounded-full border px-3 py-2"
            style={{
              borderColor: selected ? category.color : palette.line,
              backgroundColor: selected ? `${category.color}1A` : palette.card,
            }}
          >
            <MaterialCommunityIcons
              name={category.icon as never}
              size={15}
              color={selected ? category.color : palette.muted}
            />
            <Text
              className="font-medium text-xs"
              style={{ color: selected ? category.color : palette.muted }}
            >
              {category.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
