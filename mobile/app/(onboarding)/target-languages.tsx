import { useEffect, useMemo, useState } from "react";
import {
  View, Text, Pressable, ScrollView, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "../../lib/auth-context";
import { captureHandledException, useAnalytics } from "../../lib/analytics";
import { fetchLanguages, ApiLanguage } from "../../lib/api";
import { StepDots } from "../../components/onboarding/StepDots";
import { LanguageFlag } from "../../components/LanguageFlag";

const V1_LANGUAGE_ORDER = ["Chinese", "Spanish", "French", "German", "Japanese"] as const;

function normalizeLanguageName(value: string): string {
  return value.trim().toLowerCase();
}

export default function OnboardingTargetLanguages() {
  const { updateProfileData } = useAuth();
  const posthog = useAnalytics();
  const [languages, setLanguages] = useState<ApiLanguage[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loadingLanguages, setLoadingLanguages] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLanguages()
      .then(setLanguages)
      .catch((error) => {
        captureHandledException(posthog, error, {
          error_context: "onboarding_load_languages",
        });
        setError("Couldn't load languages. Please try again.");
      })
      .finally(() => setLoadingLanguages(false));
  }, []);

  const { launchLanguages, comingSoonLanguages } = useMemo(() => {
    const byName = new Map(
      languages.map((language) => [normalizeLanguageName(language.language), language] as const),
    );

    const launch = V1_LANGUAGE_ORDER.map((name) => byName.get(normalizeLanguageName(name))).filter(
      (language): language is ApiLanguage => Boolean(language),
    );

    const launchIds = new Set(launch.map((language) => String(language.id)));
    const comingSoon = languages.filter((language) => !launchIds.has(String(language.id)));

    return {
      launchLanguages: launch,
      comingSoonLanguages: comingSoon,
    };
  }, [languages]);

  function toggleLanguage(id: string) {
    setError(null);
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );
  }

  async function handleContinue() {
    if (selectedIds.length === 0) return;
    setSaving(true);
    const { error } = await updateProfileData({
      target_language_ids: selectedIds,
      onboarding_completed: true,
    });
    setSaving(false);
    if (error) {
      setError(error);
      return;
    }
    posthog?.capture("onboarding_target_languages_set", { count: selectedIds.length });
    posthog?.capture("onboarding_completed", { target_language_count: selectedIds.length });
    router.replace("/(tabs)");
  }

  const canContinue = selectedIds.length > 0;

  return (
    <SafeAreaView edges={["top", "left", "right", "bottom"]} className="flex-1 bg-background">
      <View className="flex-1 px-6 max-w-md w-full mx-auto">
        <View className="pt-8 pb-10">
          <StepDots current={2} total={2} />
        </View>

        <Text className="text-3xl font-semibold text-foreground tracking-tight mb-2">
          What do you want to learn?
        </Text>
        <Text className="text-muted mb-6">
          Pick one or more languages. You can always add more later.
        </Text>

        {loadingLanguages ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#E86A4A" />
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 16 }}
          >
            {launchLanguages.map((lang) => {
              const isSelected = selectedIds.includes(String(lang.id));
              return (
                <Pressable
                  key={String(lang.id)}
                  onPress={() => toggleLanguage(String(lang.id))}
                  className={`flex-row items-center justify-between py-3.5 px-4 rounded-2xl mb-2 border ${
                    isSelected ? "bg-accent border-primary" : "bg-card border-border"
                  }`}
                >
                  <View className="flex-row items-center flex-1 pr-3">
                    <View className="w-12 h-12 rounded-xl items-center justify-center mr-4 bg-secondary">
                      <LanguageFlag name={lang.language} size="lg" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-medium text-foreground">
                        {lang.language}
                      </Text>
                      <Text className="text-xs text-muted mt-1">
                        Practice lessons available
                      </Text>
                    </View>
                  </View>
                  {isSelected && <Ionicons name="checkmark" size={18} color="#E86A4A" />}
                </Pressable>
              );
            })}

            {comingSoonLanguages.length > 0 ? (
              <View className="mt-4">
                <Text className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">
                  Coming Soon
                </Text>
                {comingSoonLanguages.map((lang) => (
                  <View
                    key={String(lang.id)}
                    className="flex-row items-center justify-between py-3.5 px-4 rounded-2xl mb-2 border border-border bg-card opacity-60"
                  >
                    <View className="flex-row items-center flex-1 pr-3">
                      <View className="w-12 h-12 rounded-xl items-center justify-center mr-4 bg-secondary">
                        <LanguageFlag name={lang.language} size="lg" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-base font-medium text-foreground">
                          {lang.language}
                        </Text>
                        <Text className="text-xs text-muted mt-1">
                          Coming soon
                        </Text>
                      </View>
                    </View>
                    <Text className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Soon
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </ScrollView>
        )}

        {error && (
          <Text className="text-red-500 text-sm mb-3">{error}</Text>
        )}

        <View className="pb-6 pt-2">
          <Pressable
            onPress={handleContinue}
            disabled={!canContinue || saving}
            className={`py-4 rounded-2xl items-center ${canContinue ? "bg-primary" : "bg-secondary"}`}
            style={canContinue ? {
              shadowColor: "#E86A4A",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            } : undefined}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text className={`font-semibold text-base ${canContinue ? "text-primary-foreground" : "text-muted"}`}>
                  Continue
                </Text>
            }
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
