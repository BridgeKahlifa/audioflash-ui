import { Platform, Text, View } from "react-native";
import { useConfig } from "../lib/config-context";

export function AuthModeBadge() {
  const { dbEnv } = useConfig();

  if (!dbEnv || dbEnv.toLowerCase() === "prod") {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: Platform.OS === "ios" ? 52 : 20,
        left: 0,
        right: 0,
        zIndex: 1000,
        alignItems: "center",
      }}
    >
      <View
        style={{
          borderRadius: 999,
          borderWidth: 1,
          borderColor: "#FED7AA",
          backgroundColor: "#FFF7ED",
          paddingHorizontal: 12,
          paddingVertical: 5,
          shadowColor: "#000000",
          shadowOpacity: 0.08,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
        }}
      >
        <Text
          style={{
            color: "#C2410C",
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 1.2,
            textTransform: "uppercase",
          }}
        >
          {dbEnv}
        </Text>
      </View>
    </View>
  );
}
