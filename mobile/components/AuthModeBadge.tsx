import { Platform, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useConfig } from "../lib/config-context";
import { useAuth } from "../lib/auth-context";
import { clearQueryCache } from "../lib/query-client";

function badgeStyle(
  pressed: boolean,
  colors: { border: string; background: string; pressedBackground: string }
) {
  return {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: pressed ? colors.pressedBackground : colors.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  } as const;
}

export function AuthModeBadge() {
  const { dbEnv } = useConfig();
  const { updateProfileData } = useAuth();

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
        style={badgeStyle(false, {
          border: "#FED7AA",
          background: "#FFF7ED",
          pressedBackground: "#FFF7ED",
        })}
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
      >
        <View
          pointerEvents="none"
          style={badgeStyle(false, {
            border: "#93C5FD",
            background: "#DBEAFE",
            pressedBackground: "#BFDBFE",
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

        </View>
      </Pressable>

      <Pressable
        onPress={() => {
          void updateProfileData({ onboarding_completed: false }).then(({ error }) => {
            if (error) return;
            router.replace("/(onboarding)");
          });
        }}
      >
        <View
          pointerEvents="none"
          style={badgeStyle(false, {
            border: "#86EFAC",
            background: "#DCFCE7",
            pressedBackground: "#BBF7D0",
          })}
        >
          <Text
            style={{
              color: "#15803D",
              fontSize: 10,
              fontWeight: "700",
              letterSpacing: 0.9,
              textTransform: "uppercase",
            }}
          >
            Onboard
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
