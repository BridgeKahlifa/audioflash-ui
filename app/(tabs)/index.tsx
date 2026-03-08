import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ApiLanguage, fetchLanguages } from "../../lib/api";

interface Language {
  id: string;
  label: string;
  description: string;
  flag: string;
  available: boolean;
}

const fallbackLanguages: Language[] = [
  { id: "1", label: "Mandarin Chinese", description: "Characters + pinyin support", flag: "🇨🇳", available: true },
  { id: "2", label: "Spanish", description: "Coming soon", flag: "🇪🇸", available: false },
  { id: "3", label: "Japanese", description: "Coming soon", flag: "🇯🇵", available: false },
];

function languageFlag(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("mandarin") || lower.includes("chinese")) return "🇨🇳";
  if (lower.includes("spanish")) return "🇪🇸";
  if (lower.includes("japanese")) return "🇯🇵";
  if (lower.includes("french")) return "🇫🇷";
  if (lower.includes("korean")) return "🇰🇷";
  return "🌐";
}

function toUiLanguage(language: ApiLanguage): Language {
  const available = !language.language.toLowerCase().includes("coming soon");
  return {
    id: language.id,
    label: language.language,
    description: available ? "Practice lessons available" : "Coming soon",
    flag: languageFlag(language.language),
    available,
  };
}

function languageKey(label: string): string {
  return label.toLowerCase().replace(/\s+/g, "-");
}

export default function Home() {
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [languages, setLanguages] = useState<Language[]>(fallbackLanguages);
  const [apiLoaded, setApiLoaded] = useState(false);

  useEffect(() => {
    async function loadLanguages() {
      try {
        const data = await fetchLanguages();
        if (data.length > 0) {
          setLanguages(data.map(toUiLanguage));
          setApiLoaded(true);
        }
      } catch {
        // Keep fallback language list for offline/dev mode
      }
    }
    loadLanguages();
  }, []);

  const selected = useMemo(
    () => languages.find((language) => language.id === selectedLanguage),
    [languages, selectedLanguage]
  );

  const handleContinue = () => {
    if (!selected || !selected.available) return;

    router.push({
      pathname: "/categories",
      params: {
        language: languageKey(selected.label),
        languageLabel: selected.label,
        apiLanguageId: String(selected.id),
        apiLoaded: apiLoaded ? "true" : "false",
      },
    });
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
      <View className="flex-1 max-w-md w-full mx-auto">
        <View className="pt-8 pb-6 px-6">
          <Text className="text-3xl font-semibold text-foreground tracking-tight">
            Choose Language
          </Text>
          <Text className="text-muted mt-1">Pick what you want to practice first</Text>
        </View>

        <ScrollView
          className="flex-1 px-6"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 16 }}
        >
          <View className="gap-3">
            {languages.map((language) => {
              const isSelected = selectedLanguage === language.id;
              return (
                <Pressable
                  key={language.id}
                  onPress={() => language.available && setSelectedLanguage(language.id)}
                  disabled={!language.available}
                  className={`rounded-2xl p-4 border-2 flex-row items-center ${isSelected
                      ? "bg-accent border-primary"
                      : "bg-card border-transparent"
                    } ${!language.available ? "opacity-60" : ""}`}
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1,
                  }}
                >
                  <View className="w-12 h-12 rounded-xl items-center justify-center mr-4 bg-secondary">
                    <Text style={{ fontSize: 28 }}>{language.flag}</Text>
                  </View>

                  <View className="flex-1">
                    <Text className="text-foreground font-medium mb-0.5">{language.label}</Text>
                    <Text className="text-xs text-muted leading-snug">{language.description}</Text>
                  </View>

                  {!language.available && (
                    <Text className="text-xs text-muted font-medium">Soon</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <View className="p-6 pt-3">
          <Pressable
            onPress={handleContinue}
            disabled={!selectedLanguage || !selected?.available}
            className={`py-4 rounded-2xl items-center ${selectedLanguage && selected?.available ? "bg-primary" : "bg-secondary"
              }`}
            style={
              selectedLanguage && selected?.available
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
            <Text
              className={`text-base font-semibold ${selectedLanguage && selected?.available
                  ? "text-primary-foreground"
                  : "text-muted"
                }`}
            >
              Continue
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
