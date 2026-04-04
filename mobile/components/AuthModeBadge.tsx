import { Platform, Pressable, Text, View } from "react-native";
import { useConfig } from "../lib/config-context";
import { clearQueryCache } from "../lib/query-client";

export function AuthModeBadge() {
  const { dbEnv } = useConfig();

  if (!dbEnv || dbEnv.toLowerCase() === "prod") {
    return null;
  }

  return (
    <View
      style={{
        position: "absolute",
        top: Platform.OS === "ios" ? 56 : 18,
        right: 16,
        zIndex: 1000,
        alignItems: "flex-end",
        gap: 6,
      }}
    >
      <View
        pointerEvents="none"
        style={{
          borderRadius: 999,
          borderWidth: 1,
          borderColor: "#FED7AA",
          backgroundColor: "#FFF7ED",
          paddingHorizontal: 10,
          paddingVertical: 4,
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
            fontSize: 10,
            fontWeight: "700",
            letterSpacing: 0.9,
            textTransform: "uppercase",
          }}
        >
          {dbEnv}
        </Text>
      </View>

      <Pressable
        onPress={() => {
          void clearQueryCache({ coldStart: true });
        }}
        style={({ pressed }) => ({
          borderRadius: 999,
          borderWidth: 1,
          borderColor: "#BFDBFE",
          backgroundColor: pressed ? "#DBEAFE" : "#EFF6FF",
          paddingHorizontal: 10,
          paddingVertical: 4,
          shadowColor: "#000000",
          shadowOpacity: 0.08,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
        })}
      >
        <Text
          style={{
            color: "#1D4ED8",
            fontSize: 10,
            fontWeight: "700",
            letterSpacing: 0.9,
            textTransform: "uppercase",
          }}
        >
          Clear Cache
        </Text>
      </Pressable>
    </View>
  );
}
