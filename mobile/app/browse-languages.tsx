import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ApiLanguage, fetchLanguages } from "../lib/api";

function languageFlag(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("mandarin") || lower.includes("chinese")) return "🇨🇳";
  if (lower.includes("spanish")) return "🇪🇸";
  if (lower.includes("japanese")) return "🇯🇵";
  if (lower.includes("french")) return "🇫🇷";
  if (lower.includes("korean")) return "🇰🇷";
  return "🌐";
}

function languageKey(label: string): string {
  return label.toLowerCase().replace(/\s+/g, "-");
}

export default function BrowseLanguages() {
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [languages, setLanguages] = useState<ApiLanguage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLanguages()
      .then(setLanguages)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const selected = useMemo(
    () => languages.find((l) => l.id === selectedLanguage),
    [languages, selectedLanguage],
  );

  const handleContinue = () => {
    if (!selected) return;
    router.push({
      pathname: "/categories",
      params: {
        language: languageKey(selected.language),
        languageLabel: selected.language,
        apiLanguageId: String(selected.id),
        apiLoaded: "true",
      },
    });
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
      <View className="flex-1 max-w-md w-full mx-auto">
        <View className="px-6 pt-6 pb-2 flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center rounded-full bg-secondary"
          >
            <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
          </Pressable>
          <View>
            <Text className="text-2xl font-semibold text-foreground tracking-tight">
              Choose Language
            </Text>
            <Text className="text-muted text-sm">Pick what you want to practice</Text>
          </View>
        </View>

        <ScrollView
          className="flex-1 px-6 pt-4"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 16 }}
        >
          {isLoading ? (
            <View className="flex-1 items-center justify-center py-16">
              <ActivityIndicator size="large" color="#FF6B4A" />
            </View>
          ) : (
            <View className="gap-3">
              {languages.map((language) => {
                const isSelected = selectedLanguage === language.id;
                const available = !language.language.toLowerCase().includes("coming soon");
                return (
                  <Pressable
                    key={language.id}
                    onPress={() => available && setSelectedLanguage(language.id)}
                    disabled={!available}
                    className={`rounded-2xl p-4 border-2 flex-row items-center ${
                      isSelected ? "bg-accent border-primary" : "bg-card border-transparent"
                    } ${!available ? "opacity-60" : ""}`}
                    style={{
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.05,
                      shadowRadius: 2,
                      elevation: 1,
                    }}
                  >
                    <View className="w-12 h-12 rounded-xl items-center justify-center mr-4 bg-secondary">
                      <Text style={{ fontSize: 28 }}>{languageFlag(language.language)}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-foreground font-medium">{language.language}</Text>
                      <Text className="text-xs text-muted">
                        {available ? "Practice lessons available" : "Coming soon"}
                      </Text>
                    </View>
                    {!available && <Text className="text-xs text-muted font-medium">Soon</Text>}
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>

        <View className="p-6 pt-3">
          <Pressable
            onPress={handleContinue}
            disabled={!selectedLanguage}
            className={`py-4 rounded-2xl items-center ${selectedLanguage ? "bg-primary" : "bg-secondary"}`}
            style={
              selectedLanguage
                ? {
                    shadowColor: "#FF6B4A",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 4,
                  }
                : undefined
            }
          >
            <Text className={`text-base font-semibold ${selectedLanguage ? "text-primary-foreground" : "text-muted"}`}>
              Continue
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
