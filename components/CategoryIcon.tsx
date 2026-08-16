import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { View } from 'react-native';
import { categoryFor } from '../domain/categories';

/**
 * A tinted glyph per product category. Shape and color together make a product
 * findable in a long list without reading it — the name still sits beside it,
 * so the icon never carries meaning on its own.
 */
export function CategoryIcon({
  category,
  size = 'md',
}: {
  category: string | null;
  size?: 'sm' | 'md';
}) {
  const { icon, color } = categoryFor(category);
  const box = size === 'sm' ? 28 : 40;
  const glyph = size === 'sm' ? 16 : 22;

  return (
    <View
      className="items-center justify-center rounded-lg"
      style={{ width: box, height: box, backgroundColor: `${color}1A` }}
    >
      <MaterialCommunityIcons name={icon as never} size={glyph} color={color} />
    </View>
  );
}
