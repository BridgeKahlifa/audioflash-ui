import { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ApiLanguage } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import { useLanguages, useCategories } from "../../lib/queries";
import { LanguageFlag } from "../../components/LanguageFlag";

interface Topic {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  apiCategoryId?: string;
  supportedDifficulties: number[];
}


const CATEGORY_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  "airplane", "car", "restaurant", "heart",
  "briefcase", "school", "bag-handle", "home",
];

export default function Categories() {
  const { profile, profileLoading, updateProfileData } = useAuth();
  const { data: languages = [] } = useLanguages();
  const { data: contextCategories = [] } = useCategories();

  const preferredLanguageId = profile?.target_language_ids?.[0] ?? null;
  const needsLanguagePicker = profile !== null && !preferredLanguageId;

  const [savingLanguage, setSavingLanguage] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  // True while the user has manually opened the language picker to switch languages.
  // Prevents the useEffect from immediately re-resolving resolvedLanguage from the
  // profile (which still has the old language) before the new one is saved.
  const [switchingLanguage, setSwitchingLanguage] = useState(false);

  const [resolvedLanguage, setResolvedLanguage] = useState<ApiLanguage | null>(null);
  useEffect(() => {
    if (switchingLanguage) return;
    if (!preferredLanguageId || languages.length === 0) {
      setResolvedLanguage(null);
      return;
    }
    const found = languages.find((l) => String(l.id) === String(preferredLanguageId));
    if (found) setResolvedLanguage(found);
  }, [preferredLanguageId, languages, switchingLanguage]);

  // Derive topics from context categories
  const topics = contextCategories.map((cat, i) => ({
    id: `category-${cat.id}`,
    title: cat.name,
    icon: CATEGORY_ICONS[i % CATEGORY_ICONS.length],
    apiCategoryId: String(cat.id),
    supportedDifficulties: cat.supported_difficulties ?? [],
  }));

  async function handleSelectLanguage(lang: ApiLanguage) {
    setResolvedLanguage(lang);
    setSavingLanguage(true);

    const { error } = await updateProfileData({ target_language_ids: [String(lang.id)] });
    setSavingLanguage(false);

    if (error) {
      setResolvedLanguage(null);
      // Keep switchingLanguage true so the picker stays visible for retry
    } else {
      setSwitchingLanguage(false);
    }
  }

  const handleStartLesson = () => {
    if (!selectedTopic || !resolvedLanguage) return;
    const topic = topics.find((t) => t.id === selectedTopic);
    router.push({
      pathname: "/lesson-ready/[topic]",
      params: {
        topic: selectedTopic,
        topicTitle: topic?.title ?? selectedTopic,
        language: resolvedLanguage.language.toLowerCase().replace(/\s+/g, "-"),
        languageLabel: resolvedLanguage.language,
        apiLanguageId: String(resolvedLanguage.id),
        apiLoaded: "true",
        apiCategoryId: topic?.apiCategoryId ?? "",
        supportedDifficulties: (topic?.supportedDifficulties ?? []).join(","),
      },
    });
  };

  // Profile still loading — don't render anything yet
  if (profile === null && profileLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FAFAF8", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#FF6B4A" />
      </View>
    );
  }

  // --- Language selection ---
  if (needsLanguagePicker || switchingLanguage) {
    return (
      <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
        <View className="flex-1 max-w-md w-full mx-auto">
          <View className="px-6 pt-8 pb-4">
            <Text className="text-3xl font-semibold text-foreground tracking-tight">
              Choose Language
            </Text>
            <Text className="text-muted text-sm mt-1">
              Pick the language you want to learn
            </Text>
          </View>

          <ScrollView
            className="flex-1 px-6"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 16 }}
          >
            <View className="gap-3">
                {languages.map((lang) => {
                  const available = !lang.language.toLowerCase().includes("coming soon");
                  return (
                    <Pressable
                      key={lang.id}
                      onPress={() => {
                        if (available && !savingLanguage) handleSelectLanguage(lang);
                      }}
                      className={`rounded-2xl p-4 border-2 border-transparent flex-row items-center bg-card ${!available ? "opacity-60" : ""}`}
                      style={{
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.05,
                        shadowRadius: 2,
                        elevation: 1,
                      }}
                    >
                      <View className="w-12 h-12 rounded-xl items-center justify-center mr-4 bg-secondary">
                        <LanguageFlag name={lang.language} size="lg" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-foreground font-medium">{lang.language}</Text>
                        <Text className="text-xs text-muted">
                          {available ? "Practice lessons available" : "Coming soon"}
                        </Text>
                      </View>
                      {savingLanguage ? (
                        <ActivityIndicator size="small" color="#FF6B4A" />
                      ) : (
                        <Ionicons name="chevron-forward" size={18} color="#A0A0A0" />
                      )}
                    </Pressable>
                  );
                })}
              </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  // --- Category selection ---
  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
      <View className="flex-1 max-w-md w-full mx-auto">
        <View className="pt-8 pb-6 px-6">
          <Text className="text-3xl font-semibold text-foreground tracking-tight">Browse</Text>
          {resolvedLanguage ? (
            <Pressable onPress={() => { setSwitchingLanguage(true); setResolvedLanguage(null); }} className="flex-row items-center mt-1">
              <View style={{ marginRight: 4 }}>
                <LanguageFlag name={resolvedLanguage.language} size="sm" />
              </View>
              <Text className="text-muted">Language: </Text>
              <Text className="text-foreground font-medium">{resolvedLanguage.language}</Text>
              <Ionicons name="chevron-down" size={14} color="#A0A0A0" style={{ marginLeft: 2 }} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          className="flex-1 px-6"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 16 }}
        >
          {topics.length === 0 ? (
            <View className="items-center justify-center py-16">
              <Text className="text-muted text-center">No categories available</Text>
            </View>
          ) : null}
          <View className="flex-row flex-wrap gap-3">
            {topics.map((topic) => {
              const isSelected = selectedTopic === topic.id;
              return (
                <Pressable
                  key={topic.id}
                  onPress={() => setSelectedTopic(topic.id)}
                  className={`rounded-2xl p-4 border-2 ${isSelected ? "bg-accent border-primary" : "bg-card border-transparent"}`}
                  style={{
                    width: "47.5%",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1,
                  }}
                >
                  <View className={`w-10 h-10 rounded-xl items-center justify-center mb-3 ${isSelected ? "bg-primary" : "bg-secondary"}`}>
                    <Ionicons name={topic.icon} size={20} color={isSelected ? "#FFFFFF" : "#1A1A1A"} />
                  </View>
                  <Text className="text-foreground font-medium mb-0.5">{topic.title}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <View className="p-6 pt-3">
          <Pressable
            onPress={handleStartLesson}
            disabled={!selectedTopic}
            className={`py-4 rounded-2xl items-center ${selectedTopic ? "bg-primary" : "bg-secondary"}`}
            style={selectedTopic ? { shadowColor: "#FF6B4A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 } : undefined}
          >
            <Text className={`text-base font-semibold ${selectedTopic ? "text-primary-foreground" : "text-muted"}`}>
              Start Lesson
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
