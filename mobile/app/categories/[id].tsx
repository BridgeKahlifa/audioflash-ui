import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { fetchLessonsByCategory, type ApiLessonCard } from "../../lib/api";
import { useAppTheme } from "../../lib/theme-context";

function CardRow({
  card,
  showLevel,
  fontFamily,
}: {
  card: ApiLessonCard;
  showLevel: boolean;
  fontFamily?: string;
}) {
  return (
    <View
      className="bg-card border border-border rounded-2xl px-4 py-4"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
      }}
    >
      <View className="flex-row items-start gap-3">
        <View className="flex-1">
          <Text className="text-xl font-semibold text-foreground mb-0.5" style={{ fontFamily }}>
            {card.source_text}
          </Text>
          {card.romanization ? (
            <Text className="text-sm text-primary mb-1" style={{ fontFamily }}>
              {card.romanization}
            </Text>
          ) : null}
          <Text className="text-sm text-muted" style={{ fontFamily }}>
            {card.translation}
          </Text>
        </View>
        {showLevel && card.difficulty ? (
          <View className="bg-secondary rounded-lg px-2 py-0.5 mt-1">
            <Text className="text-xs text-muted" style={{ fontFamily }}>
              Level {card.difficulty}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function CategoryDetail() {
  const {
    id: apiCategoryId,
    topic,
    title,
    language,
    languageLabel,
    apiLanguageId,
    supportedDifficulties,
    availableCardCount,
  } = useLocalSearchParams<{
    id: string;
    topic: string;
    title: string;
    language: string;
    languageLabel: string;
    apiLanguageId: string;
    supportedDifficulties: string;
    availableCardCount: string;
  }>();

  const { fontFamily } = useAppTheme();
  const [activeLevel, setActiveLevel] = useState<number | null>(null);
  const [cardQuery, setCardQuery] = useState("");

  const {
    data: cards,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["category-cards", apiCategoryId],
    queryFn: () =>
      fetchLessonsByCategory({ categoryId: apiCategoryId ?? "", shuffle: false }),
    enabled: !!apiCategoryId,
  });

  const presentLevels = cards
    ? Array.from(new Set(cards.map((c) => c.difficulty))).sort()
    : [];

  const effectiveLevel = presentLevels.length === 1 ? presentLevels[0] : activeLevel;

  const filteredCards = (cards ?? []).filter((c) => {
    const matchesLevel = effectiveLevel === null || c.difficulty === effectiveLevel;
    const matchesQuery =
      !cardQuery.trim() ||
      `${c.source_text} ${c.romanization ?? ""} ${c.translation}`
        .toLowerCase()
        .includes(cardQuery.toLowerCase());
    return matchesLevel && matchesQuery;
  });

  function handleStartLesson() {
    router.push({
      pathname: "/lesson-ready/[topic]",
      params: {
        topic: topic ?? apiCategoryId ?? "",
        topicTitle: title ?? "",
        language: language ?? "",
        languageLabel: languageLabel ?? "",
        apiLanguageId: apiLanguageId ?? "",
        apiLoaded: "true",
        apiCategoryId: apiCategoryId ?? "",
        supportedDifficulties: supportedDifficulties ?? "",
        availableCardCount: availableCardCount ?? "",
      },
    });
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
      <View className="flex-1 max-w-md w-full mx-auto">

        {/* Header */}
        <View className="px-6 pt-6 pb-2 flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center rounded-full bg-secondary"
          >
            <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
          </Pressable>
          <View className="flex-1">
            <Text
              className="text-2xl font-semibold text-foreground tracking-tight"
              numberOfLines={1}
              style={{ fontFamily }}
            >
              {title ?? "Category"}
            </Text>
          </View>
        </View>

        {/* Meta */}
        <View className="px-6 pb-3 flex-row items-center gap-1.5">
          <Text className="text-muted text-sm" style={{ fontFamily }}>
            {languageLabel ?? ""}
          </Text>
          {cards && !isLoading ? (
            <>
              <Text className="text-muted text-sm">{"  ·  "}</Text>
              <Text className="text-muted text-sm" style={{ fontFamily }}>
                {cards.length} card{cards.length !== 1 ? "s" : ""}
              </Text>
            </>
          ) : null}
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#FF6B4A" />
          </View>
        ) : error ? (
          <View className="mx-6 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
            <Text className="text-red-600 text-sm" style={{ fontFamily }}>
              Couldn't load cards.
            </Text>
            <Pressable onPress={() => void refetch()} className="mt-2">
              <Text className="text-primary text-sm font-medium" style={{ fontFamily }}>
                Try again
              </Text>
            </Pressable>
          </View>
        ) : !cards || cards.length === 0 ? (
          <View className="flex-1 items-center justify-center gap-3">
            <View className="w-14 h-14 rounded-full bg-secondary items-center justify-center">
              <Ionicons name="layers-outline" size={24} color="#A0A0A0" />
            </View>
            <Text className="text-foreground font-medium" style={{ fontFamily }}>
              No cards available
            </Text>
          </View>
        ) : (
          <>
            {/* Search */}
            <View className="px-6 pb-3">
              <View className="flex-row items-center bg-card border border-border rounded-2xl px-4 py-3 gap-2">
                <Ionicons name="search" size={16} color="#A0A0A0" />
                <TextInput
                  value={cardQuery}
                  onChangeText={setCardQuery}
                  placeholder="Search cards…"
                  placeholderTextColor="#A0A0A0"
                  className="flex-1 text-foreground"
                  style={{ fontSize: 16 }}
                  returnKeyType="search"
                  clearButtonMode="while-editing"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Level chips */}
            <View
              className="pb-3 grow-0"
              style={{ paddingHorizontal: 24, flexDirection: "row", gap: 6 }}
            >
              {presentLevels.length > 1 && (
                <Pressable
                  onPress={() => setActiveLevel(null)}
                  style={{
                    flex: 1,
                    paddingVertical: 6,
                    borderRadius: 999,
                    borderWidth: 1,
                    alignItems: "center",
                    backgroundColor: activeLevel === null ? "#FF6B4A" : "transparent",
                    borderColor: activeLevel === null ? "#FF6B4A" : "#E5E5E5",
                  }}
                >
                  <Text style={{ fontFamily, fontSize: 13, fontWeight: "600", color: activeLevel === null ? "#FFFFFF" : "#737373" }}>
                    All
                  </Text>
                </Pressable>
              )}

              {presentLevels.map((level) => {
                const isActive = presentLevels.length === 1 || activeLevel === level;
                return (
                  <Pressable
                    key={level}
                    onPress={() => {
                      if (presentLevels.length > 1) {
                        setActiveLevel(activeLevel === level ? null : level);
                      }
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: 6,
                      borderRadius: 999,
                      borderWidth: 1,
                      alignItems: "center",
                      backgroundColor: isActive ? "#FF6B4A" : "transparent",
                      borderColor: isActive ? "#FF6B4A" : "#E5E5E5",
                    }}
                  >
                    <Text style={{ fontFamily, fontSize: 13, fontWeight: "600", color: isActive ? "#FFFFFF" : "#737373" }}>
                      {presentLevels.length === 1 ? `Level ${level}` : `${level}`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Card list */}
            <ScrollView
              className="flex-1 px-6"
              contentContainerStyle={{ paddingBottom: 100 }}
              showsVerticalScrollIndicator={false}
            >
              {filteredCards.length === 0 ? (
                <View className="items-center py-10 gap-2">
                  <Ionicons name="search" size={28} color="#A0A0A0" />
                  <Text className="text-muted text-sm text-center" style={{ fontFamily }}>
                    No cards match
                  </Text>
                </View>
              ) : (
                <View className="gap-3">
                  {filteredCards.map((card) => (
                    <CardRow
                      key={card.id}
                      card={card}
                      showLevel={effectiveLevel === null}
                      fontFamily={fontFamily}
                    />
                  ))}
                </View>
              )}
            </ScrollView>
          </>
        )}

        {/* Start Lesson CTA */}
        {!isLoading && !error && (cards?.length ?? 0) > 0 && (
          <View className="px-6 pb-6 pt-3 border-t border-border bg-background">
            <Pressable
              onPress={handleStartLesson}
              className="py-4 rounded-2xl items-center bg-primary"
              style={{
                shadowColor: "#FF6B4A",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <Text
                className="text-base font-semibold text-primary-foreground"
                style={{ fontFamily }}
              >
                View Lesson
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
