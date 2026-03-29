import { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { fetchCategories, fetchLanguages } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";

interface Topic {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  apiCategoryId?: string;
  supportedDifficulties: number[];
}

function languageFlagCode(name: string): "cn" | "es" | "jp" | "fr" | "kr" | "globe" {
  const lower = name.toLowerCase();
  if (lower.includes("mandarin") || lower.includes("chinese")) return "cn";
  if (lower.includes("spanish")) return "es";
  if (lower.includes("japanese")) return "jp";
  if (lower.includes("french")) return "fr";
  if (lower.includes("korean")) return "kr";
  return "globe";
}

function LanguageFlag({ languageName }: { languageName: string }) {
  const code = languageFlagCode(languageName);

  if (code === "cn") {
    return (
      <View
        style={{
          width: 18,
          height: 12,
          borderRadius: 3,
          backgroundColor: "#DE2910",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 6,
        }}
      >
        <Text style={{ color: "#FFDE00", fontSize: 8, lineHeight: 9 }}>★</Text>
      </View>
    );
  }

  if (code === "jp") {
    return (
      <View
        style={{
          width: 18,
          height: 12,
          borderRadius: 3,
          backgroundColor: "#FFFFFF",
          borderWidth: 1,
          borderColor: "#E5E7EB",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 6,
        }}
      >
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            backgroundColor: "#BC002D",
          }}
        />
      </View>
    );
  }

  if (code === "fr") {
    return (
      <View style={{ width: 18, height: 12, borderRadius: 3, overflow: "hidden", flexDirection: "row", marginRight: 6 }}>
        <View style={{ flex: 1, backgroundColor: "#0055A4" }} />
        <View style={{ flex: 1, backgroundColor: "#FFFFFF" }} />
        <View style={{ flex: 1, backgroundColor: "#EF4135" }} />
      </View>
    );
  }

  if (code === "es") {
    return (
      <View style={{ width: 18, height: 12, borderRadius: 3, overflow: "hidden", marginRight: 6 }}>
        <View style={{ flex: 1, backgroundColor: "#AA151B" }} />
        <View style={{ flex: 2, backgroundColor: "#F1BF00" }} />
        <View style={{ flex: 1, backgroundColor: "#AA151B" }} />
      </View>
    );
  }

  if (code === "kr") {
    return (
      <View
        style={{
          width: 18,
          height: 12,
          borderRadius: 3,
          backgroundColor: "#FFFFFF",
          borderWidth: 1,
          borderColor: "#E5E7EB",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 6,
        }}
      >
        <View style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: "#CD2E3A" }} />
      </View>
    );
  }

  return (
    <View
      style={{
        width: 18,
        height: 12,
        borderRadius: 3,
        backgroundColor: "#E5E7EB",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 6,
      }}
    >
      <Ionicons name="globe-outline" size={9} color="#6B7280" />
    </View>
  );
}


export default function Categories() {
  const { profile, profileError } = useAuth();
  const { language, languageLabel, apiLanguageId, apiLoaded } = useLocalSearchParams<{
    language?: string;
    languageLabel?: string;
    apiLanguageId?: string;
    apiLoaded?: string;
  }>();

  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(apiLoaded === "true");

  useEffect(() => {
    async function resolveLanguage() {
      if (apiLoaded === "true") return;

      const preferredLanguageId = profile?.target_language_ids?.[0];
      if (!preferredLanguageId) {
        router.replace("/browse-languages");
        return;
      }

      try {
        const languages = await fetchLanguages();
        const preferredLanguage = languages.find(
          (item) => String(item.id) === String(preferredLanguageId),
        );

        if (!preferredLanguage) {
          router.replace("/browse-languages");
          return;
        }

        router.replace({
          pathname: "/categories",
          params: {
            language: preferredLanguage.language.toLowerCase().replace(/\s+/g, "-"),
            languageLabel: preferredLanguage.language,
            apiLanguageId: String(preferredLanguage.id),
            apiLoaded: "true",
          },
        });
      } catch {
        router.replace("/browse-languages");
      }
    }

    resolveLanguage();
  }, [apiLoaded, profile?.target_language_ids]);

  useEffect(() => {
    async function loadCategories() {
      if (apiLoaded !== "true") return;
      try {
        const categories = await fetchCategories();
        if (categories.length === 0) return;
        const icons: (keyof typeof Ionicons.glyphMap)[] = [
          "airplane",
          "car",
          "restaurant",
          "heart",
          "briefcase",
          "school",
          "bag-handle",
          "home",
        ];
        setTopics(
          categories.map((category, index) => ({
            id: `category-${category.id}`,
            title: category.name,
            description: "Real-world practice",
            icon: icons[index % icons.length],
            apiCategoryId: String(category.id),
            supportedDifficulties: category.supported_difficulties ?? [],
          }))
        );
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    }
    loadCategories();
  }, [apiLoaded]);

  const handleGenerateLesson = () => {
    if (!selectedTopic) return;
    const topic = topics.find((t) => t.id === selectedTopic);

    router.push({
      pathname: "/lesson-ready/[topic]",
      params: {
        topic: selectedTopic,
        topicTitle: topic?.title ?? selectedTopic,
        language: language,
        languageLabel: languageLabel,
        apiLanguageId: apiLanguageId ?? "",
        apiLoaded: apiLoaded ?? "",
        apiCategoryId: topic?.apiCategoryId ?? "",
        supportedDifficulties: (topic?.supportedDifficulties ?? []).join(","),
      },
    });
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
      <View className="flex-1 max-w-md w-full mx-auto">
        <View className="pt-8 pb-6 px-6">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center rounded-full bg-secondary mb-4"
          >
            <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
          </Pressable>

          <Text className="text-3xl font-semibold text-foreground tracking-tight">
            Choose Category
          </Text>
          <View className="flex-row items-center mt-1">
            <Text className="text-muted">Language: </Text>
            <Text className="text-foreground font-medium">{languageLabel}</Text>
            <View style={{ marginLeft: 6 }}>
              <LanguageFlag languageName={languageLabel ?? ""} />
            </View>
          </View>
          {profileError ? (
            <View className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
              <Text className="text-sm text-red-600">
                Profile failed to load - support has been notified
              </Text>
            </View>
          ) : null}
        </View>

        <ScrollView
          className="flex-1 px-6"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 16 }}
        >
          {isLoading ? (
            <View className="flex-1 items-center justify-center py-16">
              <ActivityIndicator size="large" color="#FF6B4A" />
            </View>
          ) : topics.length === 0 ? (
            <View className="flex-1 items-center justify-center py-16">
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
                  className={`rounded-2xl p-4 border-2 ${
                    isSelected
                      ? "bg-accent border-primary"
                      : "bg-card border-transparent"
                  }`}
                  style={{
                    width: "47.5%",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1,
                  }}
                >
                  <View
                    className={`w-10 h-10 rounded-xl items-center justify-center mb-3 ${
                      isSelected ? "bg-primary" : "bg-secondary"
                    }`}
                  >
                    <Ionicons
                      name={topic.icon}
                      size={20}
                      color={isSelected ? "#FFFFFF" : "#1A1A1A"}
                    />
                  </View>
                  <Text className="text-foreground font-medium mb-0.5">
                    {topic.title}
                  </Text>
                  <Text className="text-xs text-muted leading-snug">
                    {topic.description}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <View className="p-6 pt-3">
          <Pressable
            onPress={handleGenerateLesson}
            disabled={!selectedTopic}
            className={`py-4 rounded-2xl items-center ${
              selectedTopic ? "bg-primary" : "bg-secondary"
            }`}
            style={
              selectedTopic
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
              className={`text-base font-semibold ${
                selectedTopic ? "text-primary-foreground" : "text-muted"
              }`}
            >
              Start Lesson
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
