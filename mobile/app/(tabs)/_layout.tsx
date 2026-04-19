import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { View, Text, Pressable } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useAppTheme } from "../../lib/theme-context";

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: "home",
  categories: "grid",
  decks: "albums",
  progress: "stats-chart",
  settings: "settings",
};

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { matrixMode, fontFamily } = useAppTheme();

  const palette = matrixMode
    ? {
        barBackground: "#1a1a1af2",
        barBorder: "rgba(255, 107, 74, 0.18)",
        activeBackground: "#ff6b4a",
        activeForeground: "#000000",
        inactiveForeground: "#8f8f8f",
      }
    : {
        barBackground: "#fffffff2",
        barBorder: "transparent",
        activeBackground: "#FF6B4A",
        activeForeground: "#FFFFFF",
        inactiveForeground: "#7A7A7A",
      };

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: palette.barBackground,
        borderTopWidth: 1,
        borderTopColor: palette.barBorder,
        paddingTop: 8,
        paddingBottom: Math.max(insets.bottom, 10),
        paddingHorizontal: 6,
      }}
    >
      {state.routes.filter((route) => ICON_MAP[route.name]).map((route) => {
        const index = state.routes.findIndex((r) => r.key === route.key);
        const { options } = descriptors[route.key];
        const label = options.title ?? route.name;
        const isFocused = state.index === index;
        const iconName = ICON_MAP[route.name] ?? "ellipse";

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={{ flex: 1, alignItems: "center" }}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
          >
            <View
              style={{
                backgroundColor: isFocused ? palette.activeBackground : "transparent",
                borderRadius: 12,
                paddingHorizontal: 10,
                paddingTop: 6,
                paddingBottom: 6,
                alignItems: "center",
                minWidth: 58,
                borderWidth: matrixMode && isFocused ? 1 : 0,
                borderColor: matrixMode ? "rgba(255, 107, 74, 0.35)" : "transparent",
              }}
            >
              <Ionicons
                name={iconName}
                size={20}
                color={isFocused ? palette.activeForeground : palette.inactiveForeground}
              />
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "600",
                  color: isFocused ? palette.activeForeground : palette.inactiveForeground,
                  marginTop: 3,
                  fontFamily,
                }}
              >
                {label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true, animation: "none" }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="categories" options={{ title: "Browse" }} />
      <Tabs.Screen name="decks" options={{ title: "Decks" }} />
      <Tabs.Screen name="progress" options={{ title: "Progress" }} />
      <Tabs.Screen name="goals" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
