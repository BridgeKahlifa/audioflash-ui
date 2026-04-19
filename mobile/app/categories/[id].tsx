import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchLessonsByCategory, bulkCreateDeckCards, type ApiLessonCard } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import { useDecks, queryKeys } from "../../lib/queries";
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

  const { fontFamily, matrixMode } = useAppTheme();
  const { session, isDevAuth } = useAuth();
  const qc = useQueryClient();
  const userId = session?.user?.id ?? (isDevAuth ? "dev" : "");
  const { data: decks } = useDecks();
  const [activeLevel, setActiveLevel] = useState<number | null>(null);
  const [cardQuery, setCardQuery] = useState("");
  const [showDeckModal, setShowDeckModal] = useState(false);
  const [addingToDeckId, setAddingToDeckId] = useState<string | null>(null);
  const [deckSearch, setDeckSearch] = useState("");
  const backButtonPalette = matrixMode
    ? {
        background: "#202020",
        icon: "#ff8c42",
      }
    : {
        background: "#FBE7DE",
        icon: "#1A1A1A",
      };

  // Bottom-sheet animation for deck picker
  const deckModalOpacity = useRef(new Animated.Value(0)).current;
  const deckModalTranslateY = useRef(new Animated.Value(400)).current;
  const [deckModalMounted, setDeckModalMounted] = useState(false);

  useEffect(() => {
    if (showDeckModal) {
      setDeckModalMounted(true);
      Animated.parallel([
        Animated.timing(deckModalOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(deckModalTranslateY, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 280, mass: 0.8 }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(deckModalOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(deckModalTranslateY, { toValue: 400, duration: 160, useNativeDriver: true }),
      ]).start(() => { setDeckModalMounted(false); setDeckSearch(""); });
    }
  }, [showDeckModal, deckModalOpacity, deckModalTranslateY]);

  async function handleAddToDeck(deckId: string) {
    if (!cards || addingToDeckId) return;
    setAddingToDeckId(deckId);
    try {
      await bulkCreateDeckCards(session?.access_token ?? null, deckId, {
        cards: cards.map((c) => ({
          source_text: c.source_text,
          translation: c.translation,
          romanization: c.romanization ?? null,
          difficulty: c.difficulty ?? null,
        })),
      });
      qc.invalidateQueries({ queryKey: queryKeys.deckCards(userId, deckId) });
      qc.invalidateQueries({ queryKey: queryKeys.deck(userId, deckId) });
      qc.invalidateQueries({ queryKey: queryKeys.decks(userId) });
      setShowDeckModal(false);
      router.push({ pathname: "/decks/[id]", params: { id: deckId } });
    } catch {
      Alert.alert("Error", "Couldn't add cards to deck. Please try again.");
    } finally {
      setAddingToDeckId(null);
    }
  }

  function handleCreateNewDeck() {
    setShowDeckModal(false);
    router.push({
      pathname: "/decks/new",
      params: {
        categoryId: apiCategoryId ?? "",
        languageId: apiLanguageId ?? "",
      },
    });
  }

  const {
    data: cards,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["category-cards", apiCategoryId, apiLanguageId],
    queryFn: () =>
      fetchLessonsByCategory({
        token: session?.access_token ?? null,
        categoryId: apiCategoryId ?? "",
        languageId: apiLanguageId ?? undefined,
        shuffle: false,
      }),
    enabled: !!apiCategoryId && !!(session?.access_token || isDevAuth),
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

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace({
      pathname: "/(tabs)/categories",
      params: {
        language: language ?? "",
        languageLabel: languageLabel ?? "",
        apiLanguageId: apiLanguageId ?? "",
        apiLoaded: "true",
      },
    });
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
      <View className="flex-1 max-w-md w-full mx-auto">

        {/* Header */}
        <View className="px-6 pt-6 pb-2 flex-row items-center gap-3">
          <Pressable
            onPress={handleBack}
            className="w-10 h-10 items-center justify-center rounded-full"
            style={{ backgroundColor: backButtonPalette.background }}
          >
            <Ionicons name="chevron-back" size={22} color={backButtonPalette.icon} />
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
          <View className="px-6 pb-6 pt-3 border-t border-border bg-background gap-3">
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
            {(session || isDevAuth) && (
              <Pressable
                onPress={() => setShowDeckModal(true)}
                className="py-4 rounded-2xl items-center bg-card border border-border flex-row justify-center gap-2"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 1,
                }}
              >
                <Ionicons name="albums-outline" size={18} color="#FF6B4A" />
                <Text className="text-base font-semibold text-primary" style={{ fontFamily }}>
                  Add to Deck
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>

      {/* Deck picker modal */}
      <Modal
        visible={deckModalMounted}
        animationType="none"
        transparent
        onRequestClose={() => setShowDeckModal(false)}
      >
        <View style={{ flex: 1, overflow: "hidden" }}>
          <Animated.View style={{ flex: 1, opacity: deckModalOpacity }}>
            <Pressable
              style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }}
              onPress={() => setShowDeckModal(false)}
            />
          </Animated.View>
          <Animated.View
            style={{ transform: [{ translateY: deckModalTranslateY }], maxHeight: 480 }}
            className="bg-background rounded-t-3xl p-6"
          >
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-semibold text-foreground" style={{ fontFamily }}>
                Add to Deck
              </Text>
              <Pressable onPress={() => setShowDeckModal(false)}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </Pressable>
            </View>

            {/* Create new deck option */}
            <Pressable
              onPress={handleCreateNewDeck}
              className="flex-row items-center gap-3 py-3 px-4 rounded-2xl bg-accent border border-primary mb-3"
            >
              <View className="w-9 h-9 rounded-xl bg-primary items-center justify-center">
                <Ionicons name="add" size={20} color="#FFFFFF" />
              </View>
              <Text className="text-foreground font-semibold flex-1" style={{ fontFamily }}>
                Create new deck
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#FF6B4A" />
            </Pressable>

            {/* Existing decks — filtered to same language */}
            {decks && decks.filter((d) => d.language_id === apiLanguageId).length > 0 && (
              <>
                <Text className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 pl-1" style={{ fontFamily }}>
                  My Decks
                </Text>
                {decks.filter((d) => d.language_id === apiLanguageId).length > 4 && (
                  <View className="flex-row items-center bg-card border border-border rounded-2xl px-3 py-2.5 gap-2 mb-3">
                    <Ionicons name="search" size={15} color="#A0A0A0" />
                    <TextInput
                      value={deckSearch}
                      onChangeText={setDeckSearch}
                      placeholder="Search decks…"
                      placeholderTextColor="#A0A0A0"
                      className="flex-1 text-foreground"
                      style={{ fontSize: 15 }}
                      returnKeyType="search"
                      clearButtonMode="while-editing"
                      autoCorrect={false}
                    />
                  </View>
                )}
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View className="gap-2">
                    {decks.filter((d) => d.language_id === apiLanguageId && (!deckSearch.trim() || d.name.toLowerCase().includes(deckSearch.toLowerCase()))).map((deck) => (
                      <Pressable
                        key={deck.id}
                        onPress={() => void handleAddToDeck(deck.id)}
                        disabled={!!addingToDeckId}
                        className="flex-row items-center gap-3 py-3 px-4 rounded-2xl bg-secondary"
                      >
                        <View className="w-9 h-9 rounded-xl bg-card items-center justify-center">
                          {deck.icon ? (
                            <Text style={{ fontSize: 18 }}>{deck.icon}</Text>
                          ) : (
                            <Ionicons name="albums" size={18} color="#FF6B4A" />
                          )}
                        </View>
                        <View className="flex-1">
                          <Text className="text-foreground font-medium" style={{ fontFamily }}>
                            {deck.name}
                          </Text>
                          <Text className="text-muted text-xs" style={{ fontFamily }}>
                            {deck.card_count ?? 0} card{(deck.card_count ?? 0) !== 1 ? "s" : ""}
                          </Text>
                        </View>
                        {addingToDeckId === deck.id ? (
                          <ActivityIndicator size="small" color="#FF6B4A" />
                        ) : (
                          <Ionicons name="chevron-forward" size={16} color="#A0A0A0" />
                        )}
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}

            {decks && decks.filter((d) => d.language_id === apiLanguageId).length === 0 && (
              <View className="items-center py-4 gap-1">
                <Text className="text-muted text-sm text-center" style={{ fontFamily }}>
                  No matching decks — create one above.
                </Text>
              </View>
            )}
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
