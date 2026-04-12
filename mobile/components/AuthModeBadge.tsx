import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useConfig } from "../lib/config-context";
import { useAuth } from "../lib/auth-context";
import { clearQueryCache } from "../lib/query-client";

export function AuthModeSettingsCard() {
  const { dbEnv } = useConfig();
  const { updateProfileData } = useAuth();

  if (!dbEnv || dbEnv.toLowerCase() === "prod") {
    return null;
  }

  return (
    <View className="bg-card border border-border rounded-2xl p-4 gap-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-4">
          <Text className="text-foreground font-medium">Environment Tools</Text>
          <Text className="text-xs text-muted mt-1">
            Debug actions for local and non-production builds.
          </Text>
        </View>
        <View className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1">
          <Text className="text-[11px] font-bold uppercase tracking-[1px] text-orange-700">
            {dbEnv}
          </Text>
        </View>
      </View>

      <View className="gap-3">
        <Pressable
          onPress={() => {
            void clearQueryCache({ coldStart: true });
          }}
          className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3"
        >
          <Text className="text-sm font-semibold text-blue-700">
            Clear Cache
          </Text>
          <Text className="mt-1 text-xs text-blue-700/80">
            Reset persisted query state and force a clean app reload path.
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            void updateProfileData({ onboarding_completed: false }).then(({ error }) => {
              if (error) return;
              router.replace("/(onboarding)");
            });
          }}
          className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3"
        >
          <Text className="text-sm font-semibold text-emerald-700">
            Restart Onboarding
          </Text>
          <Text className="mt-1 text-xs text-emerald-700/80">
            Mark onboarding as incomplete and jump back into the onboarding flow.
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
