import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ApiLanguage } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import { useLanguages, useCategories } from "../../lib/queries";
import { useAppTheme } from "../../lib/theme-context";
import { LanguageFlag } from "../../components/LanguageFlag";

interface Topic {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  apiCategoryId?: string;
  supportedDifficulties: number[];
  availableCardCount?: number;
}

const CATEGORY_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  "airplane", "car", "restaurant", "heart",
  "briefcase", "school", "bag-handle", "home",
];

export default function Categories() {
  const { profile, profileLoading, updateProfileData } = useAuth();
  const { matrixMode, fontFamily } = useAppTheme();
  const { data: languages = [], isPending: languagesLoading, error: languagesError } = useLanguages();
  const {
    data: contextCategories = [],
    isPending: categoriesLoading,
    error: categoriesError,
    refetch: refetchCategories,
  } = useCategories(profile?.target_language_ids?.[0] ?? undefined);

  const preferredLanguageId = profile?.target_language_ids?.[0] ?? null;
  const needsLanguagePicker = profile !== null && !preferredLanguageId;

  const [savingLanguage, setSavingLanguage] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [switchingLanguage, setSwitchingLanguage] = useState(false);
  const [resolvedLanguage, setResolvedLanguage] = useState<ApiLanguage | null>(null);
  const [topicQuery, setTopicQuery] = useState("");
  const [langQuery, setLangQuery] = useState("");

  const palette = matrixMode
    ? {
        loadingBackground: "#000000",
        iconContainer: "#202020",
        iconSelectedContainer: "#2f140d",
        iconColor: "#ff8c42",
        iconSelectedColor: "#ff6b4a",
        chevron: "#c9714d",
        cardShadow: "#ff6b4a",
      }
    : {
        loadingBackground: "#FAFAF8",
        iconContainer: "#FBE7DE",
        iconSelectedContainer: "#FF6B4A",
        iconColor: "#1A1A1A",
        iconSelectedColor: "#FFFFFF",
        chevron: "#A0A0A0",
        cardShadow: "#000000",
      };

  useFocusEffect(
    useCallback(() => {
      void refetchCategories();
    }, [refetchCategories])
  );

  useEffect(() => {
    if (switchingLanguage) return;
    if (!preferredLanguageId || languages.length === 0) {
      setResolvedLanguage(null);
      return;
    }

    const found = languages.find((lang) => String(lang.id) === String(preferredLanguageId));
    if (found) setResolvedLanguage(found);
  }, [preferredLanguageId, languages, switchingLanguage]);

  const topics: Topic[] = contextCategories
    .filter((category) => category.is_public !== false)
    .filter((category) => typeof category.total_cards !== "number" || category.total_cards > 0)
    .map((category, index) => ({
      id: `category-${category.id}`,
      title: category.name,
      icon: CATEGORY_ICONS[index % CATEGORY_ICONS.length],
      apiCategoryId: String(category.id),
      supportedDifficulties: category.supported_difficulties ?? [],
      availableCardCount:
        typeof category.total_cards === "number" ? category.total_cards : undefined,
    }));

  async function handleSelectLanguage(lang: ApiLanguage) {
    setResolvedLanguage(lang);
    setSavingLanguage(true);
    setErrorMessage("");

    const { error } = await updateProfileData({ target_language_ids: [String(lang.id)] });
    setSavingLanguage(false);

    if (error) {
      setResolvedLanguage(null);
      setErrorMessage("We couldn't save your language selection right now. Please try again.");
      return;
    }

    setSwitchingLanguage(false);
  }

  function handleBrowseCategory(topic: Topic) {
    if (!resolvedLanguage) return;

    router.push({
      pathname: "/lesson-ready/[topic]",
      params: {
        topic: topic.id,
        topicTitle: topic.title,
        language: resolvedLanguage.language.toLowerCase().replace(/\s+/g, "-"),
        languageLabel: resolvedLanguage.language,
        apiLanguageId: String(resolvedLanguage.id),
        apiLoaded: "true",
        apiCategoryId: topic.apiCategoryId ?? "",
        supportedDifficulties: (topic.supportedDifficulties ?? []).join(","),
        availableCardCount:
          typeof topic.availableCardCount === "number"
            ? String(topic.availableCardCount)
            : "",
      },
    });
  }

  const queryErrorMessage = languagesError
    ? "We couldn't load the available languages right now. Please try again in a moment."
    : categoriesError
      ? "We couldn't load the available categories right now. Please try again in a moment."
      : "";
  const visibleErrorMessage = errorMessage || queryErrorMessage;

  if (profile === null && profileLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.loadingBackground, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#FF6B4A" />
      </View>
    );
  }

  if (needsLanguagePicker || switchingLanguage) {
    return (
      <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
        <View className="flex-1 max-w-md w-full mx-auto">
          <View className="px-6 pt-8 pb-4">
            <Text className="text-3xl font-semibold text-foreground tracking-tight" style={{ fontFamily }}>
              Choose Language
            </Text>
            <Text className="text-muted text-sm mt-1" style={{ fontFamily }}>Pick the language you want to learn</Text>
          </View>

          <View className="px-6 pb-3">
            <View className="flex-row items-center bg-card border border-border rounded-2xl px-4 py-3 gap-2">
              <Ionicons name="search" size={16} color="#A0A0A0" />
              <TextInput
                value={langQuery}
                onChangeText={setLangQuery}
                placeholder="Search languages…"
                placeholderTextColor="#A0A0A0"
                className="flex-1 text-foreground" style={{ fontSize: 16 }}
                returnKeyType="search"
                clearButtonMode="while-editing"
                autoCorrect={false}
              />
            </View>
          </View>

          <ScrollView
            className="flex-1 px-6"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 16 }}
          >
            {visibleErrorMessage ? (
              <View className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-4">
                <Text className="text-red-600 text-sm">{visibleErrorMessage}</Text>
              </View>
            ) : null}

            {languagesLoading ? (
              <View className="items-center justify-center py-16">
                <ActivityIndicator size="large" color="#FF6B4A" />
              </View>
            ) : (
              <View className="gap-3">
                {(langQuery.trim()
                  ? languages.filter((l) =>
                      l.language.toLowerCase().includes(langQuery.toLowerCase()),
                    )
                  : languages
                ).map((lang) => {
                  const available = !lang.language.toLowerCase().includes("coming soon");
                  return (
                    <Pressable
                      key={lang.id}
                      onPress={() => {
                        if (available && !savingLanguage) void handleSelectLanguage(lang);
                      }}
                      className={`rounded-2xl p-4 border-2 border-transparent flex-row items-center bg-card ${!available ? "opacity-60" : ""}`}
                      style={{
                        shadowColor: palette.cardShadow,
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: matrixMode ? 0.15 : 0.05,
                        shadowRadius: matrixMode ? 8 : 2,
                        elevation: matrixMode ? 3 : 1,
                      }}
                    >
                      <View
                        className="w-12 h-12 rounded-xl items-center justify-center mr-4 bg-secondary"
                        style={{ backgroundColor: palette.iconContainer }}
                      >
                        <LanguageFlag name={lang.language} size="lg" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-foreground font-medium" style={{ fontFamily }}>{lang.language}</Text>
                        <Text className="text-xs text-muted" style={{ fontFamily }}>
                          {available ? "Practice lessons available" : "Coming soon"}
                        </Text>
                      </View>
                      {savingLanguage ? (
                        <ActivityIndicator size="small" color="#FF6B4A" />
                      ) : (
                        <Ionicons name="chevron-forward" size={18} color={palette.chevron} />
                      )}
                    </Pressable>
                  );
                })}
                {langQuery.trim() &&
                  languages.filter((l) =>
                    l.language.toLowerCase().includes(langQuery.toLowerCase()),
                  ).length === 0 && (
                  <View className="items-center py-10 gap-2">
                    <Ionicons name="search" size={28} color="#A0A0A0" />
                    <Text className="text-muted text-sm text-center">
                      No languages match "{langQuery}"
                    </Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
      <View className="flex-1 max-w-md w-full mx-auto">
        <View className="pt-8 pb-3 px-6">
          <Text className="text-3xl font-semibold text-foreground tracking-tight" style={{ fontFamily }}>Browse</Text>
          {resolvedLanguage ? (
            <Pressable
              onPress={() => {
                setSwitchingLanguage(true);
                setResolvedLanguage(null);
              }}
              className="flex-row items-center mt-1"
            >
              <View style={{ marginRight: 4 }}>
                <LanguageFlag name={resolvedLanguage.language} size="sm" />
              </View>
              <Text className="text-muted" style={{ fontFamily }}>Language: </Text>
              <Text className="text-foreground font-medium" style={{ fontFamily }}>{resolvedLanguage.language}</Text>
              <Ionicons name="chevron-down" size={14} color={palette.chevron} style={{ marginLeft: 2 }} />
            </Pressable>
          ) : null}
        </View>

        <View className="px-6 pb-3">
          <View className="flex-row items-center bg-card border border-border rounded-2xl px-4 py-3 gap-2">
            <Ionicons name="search" size={16} color="#A0A0A0" />
            <TextInput
              value={topicQuery}
              onChangeText={setTopicQuery}
              placeholder="Search categories…"
              placeholderTextColor="#A0A0A0"
              className="flex-1 text-foreground" style={{ fontSize: 16 }}
              returnKeyType="search"
              clearButtonMode="while-editing"
              autoCorrect={false}
            />
          </View>
        </View>

        <ScrollView
          className="flex-1 px-6"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 16 }}
        >
          {visibleErrorMessage ? (
            <View className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-4">
              <Text className="text-red-600 text-sm">{visibleErrorMessage}</Text>
            </View>
          ) : null}

          {categoriesLoading ? (
            <View className="items-center justify-center py-16">
              <ActivityIndicator size="large" color="#FF6B4A" />
            </View>
          ) : topics.length === 0 ? (
            <View className="items-center justify-center py-16">
              <Text className="text-muted text-center" style={{ fontFamily }}>No categories available</Text>
            </View>
          ) : null}

          <View className="flex-row flex-wrap gap-3">
            {(topicQuery.trim()
              ? topics.filter((t) =>
                  t.title.toLowerCase().includes(topicQuery.toLowerCase()),
                )
              : topics
            ).map((topic) => {
              return (
                <Pressable
                  key={topic.id}
                  onPress={() => handleBrowseCategory(topic)}
                  className="rounded-2xl p-4 border-2 bg-card border-transparent"
                  style={{
                    width: "47.5%",
                    shadowColor: palette.cardShadow,
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: matrixMode ? 0.15 : 0.05,
                    shadowRadius: matrixMode ? 8 : 2,
                    elevation: matrixMode ? 3 : 1,
                  }}
                >
                  <View
                    className="w-10 h-10 rounded-xl items-center justify-center mb-3"
                    style={{
                      backgroundColor: palette.iconContainer,
                      borderWidth: matrixMode ? 1 : 0,
                      borderColor: matrixMode ? "rgba(255, 107, 74, 0.18)" : "transparent",
                    }}
                  >
                    <Ionicons
                      name={topic.icon}
                      size={20}
                      color={palette.iconColor}
                    />
                  </View>
                  <Text className="text-foreground font-medium mb-0.5" style={{ fontFamily }}>{topic.title}</Text>
                  <Ionicons name="chevron-forward" size={14} color={palette.chevron} style={{ position: "absolute", top: 16, right: 12 }} />
                </Pressable>
              );
            })}
            {topicQuery.trim() &&
              topics.filter((t) =>
                t.title.toLowerCase().includes(topicQuery.toLowerCase()),
              ).length === 0 && (
              <View className="w-full items-center py-10 gap-2">
                <Ionicons name="search" size={28} color="#A0A0A0" />
                <Text className="text-muted text-sm text-center" style={{ fontFamily }}>
                  No categories match "{topicQuery}"
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

      </View>
    </SafeAreaView>
  );
}
