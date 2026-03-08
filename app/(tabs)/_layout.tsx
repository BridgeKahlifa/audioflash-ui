import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { View, Text, Pressable } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: "home",
  review: "refresh-circle",
  progress: "stats-chart",
  goals: "flag",
  settings: "settings",
};

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: "#FFFFFFF2",
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
                backgroundColor: isFocused ? "#FF6B4A" : "transparent",
                borderRadius: 12,
                paddingHorizontal: 10,
                paddingTop: 6,
                paddingBottom: 6,
                alignItems: "center",
                minWidth: 58,
              }}
            >
              <Ionicons
                name={iconName}
                size={20}
                color={isFocused ? "#FFFFFF" : "#7A7A7A"}
              />
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "600",
                  color: isFocused ? "#FFFFFF" : "#7A7A7A",
                  marginTop: 3,
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
      <Tabs.Screen name="review" options={{ title: "Review" }} />
      <Tabs.Screen name="progress" options={{ title: "Progress" }} />
      <Tabs.Screen name="goals" options={{ title: "Goals" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
      <Tabs.Screen name="categories" options={{ href: null }} />
    </Tabs>
  );
}
