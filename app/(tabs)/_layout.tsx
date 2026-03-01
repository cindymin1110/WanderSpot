/**
 * Tab navigator — Explore, News, and Saved tabs.
 * Uses Ionicons from @expo/vector-icons for the tab bar icons.
 */

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface TabIcon {
  name: IoniconsName;
  outlineName: IoniconsName;
}

const TAB_ICONS: Record<string, TabIcon> = {
  index: { name: 'compass', outlineName: 'compass-outline' },
  news: { name: 'newspaper', outlineName: 'newspaper-outline' },
  saved: { name: 'bookmark', outlineName: 'bookmark-outline' },
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.text,
        headerTitleStyle: { fontWeight: '700' },
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        // Render the correct icon depending on active state
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          if (!icons) return null;
          return (
            <Ionicons
              name={focused ? icons.name : icons.outlineName}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Explore' }} />
      <Tabs.Screen name="news" options={{ title: 'News' }} />
      <Tabs.Screen name="saved" options={{ title: 'Saved' }} />
    </Tabs>
  );
}
