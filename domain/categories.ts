/**
 * Product categories. Each one carries an icon and a tint so a shelf's worth of
 * cards can be told apart at a glance, without reading every name.
 *
 * Icon names come from MaterialCommunityIcons (@expo/vector-icons). This file
 * stays free of React so the domain remains testable off-device.
 */

export interface Category {
  key: string;
  label: string;
  /** MaterialCommunityIcons glyph name. */
  icon: string;
  color: string;
  /** Words that identify this category in a product name. */
  keywords: string[];
}

export const CATEGORIES: Category[] = [
  {
    key: 'dairy',
    label: 'Dairy',
    icon: 'cup',
    color: '#3E6FA8',
    keywords: ['milk', 'cheese', 'butter', 'yogurt', 'yoghurt', 'cream', 'margarine', 'kesong'],
  },
  {
    key: 'bakery',
    label: 'Bakery',
    icon: 'bread-slice',
    color: '#A8752B',
    keywords: ['bread', 'pandesal', 'bun', 'buns', 'cake', 'pastry', 'loaf', 'ensaymada', 'donut'],
  },
  {
    key: 'produce',
    label: 'Produce',
    icon: 'carrot',
    color: '#3F7A3F',
    keywords: ['apple', 'banana', 'tomato', 'lettuce', 'onion', 'garlic', 'potato', 'mango', 'kalabasa'],
  },
  {
    key: 'meat',
    label: 'Meat & fish',
    icon: 'food-drumstick',
    color: '#9B3B3B',
    keywords: ['chicken', 'pork', 'beef', 'fish', 'bangus', 'tilapia', 'ham', 'hotdog', 'longganisa'],
  },
  {
    key: 'canned',
    label: 'Canned',
    icon: 'food-variant',
    color: '#7A5C2E',
    keywords: ['canned', 'sardines', 'tuna', 'corned', 'beans', 'sauce', 'paste'],
  },
  {
    key: 'dry',
    label: 'Dry goods',
    icon: 'sack',
    color: '#8A6D0B',
    keywords: ['rice', 'flour', 'sugar', 'salt', 'noodles', 'pasta', 'pancit', 'oats', 'cereal'],
  },
  {
    key: 'frozen',
    label: 'Frozen',
    icon: 'snowflake',
    color: '#2E7D8A',
    keywords: ['frozen', 'ice', 'nuggets', 'siomai', 'lumpia'],
  },
  {
    key: 'drinks',
    label: 'Drinks',
    icon: 'bottle-soda',
    color: '#6B4A9B',
    keywords: ['juice', 'soda', 'water', 'coffee', 'tea', 'drink', 'cola', 'beer'],
  },
  {
    key: 'snacks',
    label: 'Snacks',
    icon: 'cookie',
    color: '#B5651D',
    keywords: ['chips', 'biscuit', 'cracker', 'candy', 'chocolate', 'snack', 'nuts'],
  },
  {
    key: 'household',
    label: 'Household',
    icon: 'spray-bottle',
    color: '#5E6B62',
    keywords: ['soap', 'detergent', 'bleach', 'shampoo', 'tissue', 'cleaner'],
  },
  {
    key: 'other',
    label: 'Other',
    icon: 'package-variant-closed',
    color: '#5E6B62',
    keywords: [],
  },
];

const OTHER = CATEGORIES[CATEGORIES.length - 1];

export function categoryFor(key: string | null | undefined): Category {
  return CATEGORIES.find((category) => category.key === key) ?? OTHER;
}

/**
 * Best-effort category from a product name, used to pre-select the chip when
 * receiving a shipment. The owner can always override it.
 */
export function guessCategory(name: string): string {
  // Split on non-letters so "ham" doesn't match inside "hammer".
  const words = new Set(name.toLowerCase().split(/[^a-z]+/).filter(Boolean));

  for (const category of CATEGORIES) {
    if (category.keywords.some((keyword) => words.has(keyword))) return category.key;
  }
  return OTHER.key;
}
