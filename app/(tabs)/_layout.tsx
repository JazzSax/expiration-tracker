import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { palette } from '../../constants/theme';

/**
 * Four destinations, named for what the owner is doing: checking what needs
 * attention, looking something up, receiving a delivery, changing alerts.
 */
function TabIcon({
  glyph,
  label,
  focused,
}: {
  glyph: string;
  label: string;
  focused: boolean;
}) {
  return (
    <View className="w-20 items-center justify-center">
      <View
        className="h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: focused ? palette.ink : 'transparent' }}
      >
        <MaterialCommunityIcons
          name={glyph as never}
          size={20}
          color={focused ? palette.card : palette.muted}
        />
      </View>
      <Text
        className={focused ? 'mt-1 font-semibold text-[10px]' : 'mt-1 font-medium text-[10px]'}
        style={{ color: focused ? palette.ink : palette.muted, letterSpacing: 0.4 }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: palette.card,
          borderTopColor: palette.line,
          height: 70,
          paddingTop: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ focused }) => (
            <TabIcon glyph="calendar-alert" label="Today" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Stock',
          tabBarIcon: ({ focused }) => (
            <TabIcon glyph="view-list-outline" label="Stock" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Receive',
          tabBarIcon: ({ focused }) => (
            <TabIcon glyph="truck-delivery-outline" label="Receive" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ focused }) => (
            <TabIcon glyph="bell-outline" label="Alerts" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
