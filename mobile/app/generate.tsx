import { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../lib/auth-context";
import {
  fetchLanguages,
  generateLesson,
  generateReplacements,
  startLesson,
  type ApiLanguage,
  type ApiLessonCard,
} from "../lib/api";
import { setCurrentCards } from "../lib/storage";
import type { Flashcard } from "../lib/types";

const TOPIC_SUGGESTIONS = [
  "Ordering coffee",
  "At the airport",
  "Making friends",
  "At the doctor",
  "Shopping for clothes",
  "Asking for directions",
  "Business meeting",
  "At a restaurant",
];

const CARD_COUNT_OPTIONS = [5, 10, 15, 20, 25, 30];

const DIFFICULTY_OPTIONS = [
  { level: 1, label: "A1" },
  { level: 2, label: "A2" },
  { level: 3, label: "B1" },
  { level: 4, label: "B2" },
  { level: 5, label: "C1+" },
];

interface GeneratedResult {
  categoryId: string;
  categoryName: string;
  languageId: string;
  languageSlug: string;
  languageLabel: string;
  cards: ApiLessonCard[];
}

export default function Generate() {
  const { session, profile } = useAuth();
  const [topic, setTopic] = useState("");
  const [languages, setLanguages] = useState<ApiLanguage[]>([]);
  const [selectedLanguageId, setSelectedLanguageId] = useState<string | null>(null);
  const [difficultyLevel, setDifficultyLevel] = useState(3);
  const [cardCount, setCardCount] = useState(10);
  const [status, setStatus] = useState<"idle" | "generating" | "starting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Preview step
  const [generatedResult, setGeneratedResult] = useState<GeneratedResult | null>(null);
  const [previewCards, setPreviewCards] = useState<ApiLessonCard[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [replacingIds, setReplacingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchLanguages()
      .then((langs) => {
        const available = langs.filter(
          (l) => !l.language.toLowerCase().includes("coming soon"),
        );
        setLanguages(available);
        const targetId = profile?.target_language_ids?.[0];
        if (targetId) {
          const match = available.find((l) => l.id === targetId);
          if (match) setSelectedLanguageId(match.id);
        }
        if (!selectedLanguageId && available.length > 0) {
          setSelectedLanguageId(available[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const canGenerate =
    topic.trim().length >= 2 && selectedLanguageId !== null && status === "idle";

  async function handleGenerate() {
    if (!canGenerate || !session?.access_token) return;

    setStatus("generating");
    setErrorMessage("");

    try {
      const selectedLang = languages.find((l) => l.id === selectedLanguageId);
      const result = await generateLesson(session.access_token, {
        language_id: selectedLanguageId!,
        topic: topic.trim(),
        card_count: cardCount,
        difficulty_level: difficultyLevel,
      });

      setGeneratedResult({
        categoryId: String(result.category.id),
        categoryName: result.category.name,
        languageId: selectedLanguageId!,
        languageSlug: selectedLang?.language.toLowerCase().replace(/\s+/g, "-") ?? "unknown",
        languageLabel: selectedLang?.language ?? "",
        cards: result.flashcards,
      });
      setPreviewCards(result.flashcards);
      setStatus("idle");
    } catch (error: any) {
      setStatus("error");
      const msg = error?.message ?? "";
      if (msg.includes("429") || msg.includes("limit")) {
        setErrorMessage("You've hit the generation limit. Try again in an hour.");
      } else if (msg.includes("422") || msg.includes("inappropriate")) {
        setErrorMessage("That topic couldn't be used. Please try a different one.");
      } else {
        setErrorMessage("Generation failed. Please check your connection and try again.");
      }
    }
  }

  async function handleStartLesson() {
    if (!generatedResult || !session?.access_token || previewCards.length === 0) return;

    const profileId = profile?.id ?? session.user?.id;
    if (!profileId) return;

    setStatus("starting");

    try {
      const topicKey = `generated-${generatedResult.categoryId}`;
      const mappedCards: Flashcard[] = previewCards.map((card, index) => ({
        id: index + 1,
        dbId: String(card.id),
        chinese: card.source_text,
        pinyin: card.romanization ?? "",
        english: card.translation,
      }));
      await setCurrentCards(topicKey, mappedCards);

      const lessonSession = await startLesson(session.access_token, {
        profile_id: profileId,
        category_id: generatedResult.categoryId,
        started_at: new Date().toISOString(),
      });

      router.replace({
        pathname: "/practice/[topic]",
        params: {
          topic: topicKey,
          topicTitle: generatedResult.categoryName,
          language: generatedResult.languageSlug,
          languageLabel: generatedResult.languageLabel,
          apiLanguageId: generatedResult.languageId,
          apiCategoryId: generatedResult.categoryId,
          apiLoaded: "true",
          lessonSessionId: lessonSession.session_id,
        },
      });
    } catch {
      setStatus("error");
      setErrorMessage("Couldn't start the lesson. Please try again.");
    }
  }

  function handleRemoveCard(cardId: string) {
    setPreviewCards((prev) => prev.filter((c) => String(c.id) !== cardId));
    setSelectedIds((prev) => { const s = new Set(prev); s.delete(cardId); return s; });
  }

  function toggleSelected(cardId: string) {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      if (s.has(cardId)) s.delete(cardId);
      else s.add(cardId);
      return s;
    });
  }

  async function handleRegenerateSelected() {
    if (!generatedResult || !session?.access_token || selectedIds.size === 0) return;

    const idsToReplace = Array.from(selectedIds);
    setReplacingIds(new Set(idsToReplace));
    setSelectedIds(new Set());

    try {
      const excludeIds = previewCards
        .filter((c) => !idsToReplace.includes(String(c.id)))
        .map((c) => String(c.id));

      const result = await generateReplacements(session.access_token, {
        language_id: generatedResult.languageId,
        topic: generatedResult.categoryName,
        difficulty_level: difficultyLevel,
        count: idsToReplace.length,
        exclude_ids: excludeIds,
      });

      setPreviewCards((prev) => {
        const replacements = [...result.flashcards];
        return prev.map((card) => {
          if (idsToReplace.includes(String(card.id))) {
            return replacements.shift() ?? card;
          }
          return card;
        });
      });
    } catch {
      setErrorMessage("Couldn't regenerate cards. Please try again.");
    } finally {
      setReplacingIds(new Set());
    }
  }

  function handleBackToForm() {
    setGeneratedResult(null);
    setPreviewCards([]);
    setSelectedIds(new Set());
    setReplacingIds(new Set());
    setStatus("idle");
    setErrorMessage("");
  }

  // ── Preview ─────────────────────────────────────────────────────────────────
  if (generatedResult) {
    const diffLabel = DIFFICULTY_OPTIONS.find((d) => d.level === difficultyLevel)?.label ?? "";

    return (
      <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
        <View className="flex-1 max-w-md w-full mx-auto">
          {/* Header */}
          <View className="px-6 pt-6 pb-2 flex-row items-center gap-3">
            <Pressable
              onPress={handleBackToForm}
              className="w-10 h-10 items-center justify-center rounded-full bg-secondary"
            >
              <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
            </Pressable>
            <View className="flex-1">
              <Text className="text-2xl font-semibold text-foreground tracking-tight">
                Review Cards
              </Text>
              <Text className="text-muted text-sm">
                {selectedIds.size > 0
                  ? `${selectedIds.size} selected · tap to deselect`
                  : `${previewCards.length} card${previewCards.length !== 1 ? "s" : ""} · ${generatedResult.languageLabel} · ${diffLabel} · tap to select`}
              </Text>
            </View>
          </View>

          <ScrollView
            className="flex-1 px-6 pt-3"
            showsVerticalScrollIndicator={false}
          >
            {previewCards.map((card) => {
              const cardId = String(card.id);
              const isSelected = selectedIds.has(cardId);
              const isReplacing = replacingIds.has(cardId);
              return (
                <Pressable
                  key={cardId}
                  onPress={() => !isReplacing && toggleSelected(cardId)}
                  className={`border rounded-2xl px-4 py-4 mb-3 ${
                    isSelected
                      ? "bg-primary/10 border-primary"
                      : "bg-card border-border"
                  }`}
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 1,
                    opacity: isReplacing ? 0.5 : 1,
                  }}
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      {isReplacing ? (
                        <ActivityIndicator size="small" color="#FF6B4A" />
                      ) : (
                        <>
                          <Text className="text-xl font-semibold text-foreground mb-0.5">
                            {card.source_text}
                          </Text>
                          {card.romanization ? (
                            <Text className="text-sm text-primary mb-1">{card.romanization}</Text>
                          ) : null}
                          <Text className="text-sm text-muted">{card.translation}</Text>
                        </>
                      )}
                    </View>
                    <View className="items-end gap-2">
                      {isSelected ? (
                        <View className="w-6 h-6 rounded-full bg-primary items-center justify-center">
                          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                        </View>
                      ) : (
                        <View className="bg-secondary rounded-lg px-2 py-0.5">
                          <Text className="text-xs font-semibold text-muted">
                            {card.difficulty === 1 ? "A1"
                              : card.difficulty === 2 ? "A2"
                              : card.difficulty === 3 ? "B1"
                              : card.difficulty === 4 ? "B2"
                              : "C1+"}
                          </Text>
                        </View>
                      )}
                      <Pressable
                        onPress={() => handleRemoveCard(cardId)}
                        hitSlop={8}
                        className="w-7 h-7 rounded-full bg-secondary items-center justify-center"
                      >
                        <Ionicons name="close" size={16} color="#737373" />
                      </Pressable>
                    </View>
                  </View>
                </Pressable>
              );
            })}

            {previewCards.length === 0 && (
              <View className="items-center py-12">
                <Text className="text-muted text-sm">All cards removed.</Text>
                <Pressable onPress={handleBackToForm} className="mt-3">
                  <Text className="text-primary text-sm font-semibold">Regenerate</Text>
                </Pressable>
              </View>
            )}

            <View className="h-4" />
          </ScrollView>

          {/* Actions */}
          {previewCards.length > 0 && (
            <View className="px-6 pb-6 pt-3 gap-3">
              {selectedIds.size > 0 ? (
                <Pressable
                  onPress={handleRegenerateSelected}
                  disabled={replacingIds.size > 0}
                  className="py-4 rounded-2xl items-center bg-primary"
                  style={{
                    shadowColor: "#FF6B4A",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                >
                  {replacingIds.size > 0 ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text className="text-base font-semibold text-primary-foreground">
                      Regenerate Selected ({selectedIds.size})
                    </Text>
                  )}
                </Pressable>
              ) : (
                <Pressable
                  onPress={handleStartLesson}
                  disabled={status === "starting"}
                  className="py-4 rounded-2xl items-center bg-primary"
                  style={{
                    shadowColor: "#FF6B4A",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                >
                  {status === "starting" ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text className="text-base font-semibold text-primary-foreground">
                      Start Lesson ({previewCards.length} cards)
                    </Text>
                  )}
                </Pressable>
              )}
              <Pressable
                onPress={handleBackToForm}
                disabled={status === "starting" || replacingIds.size > 0}
                className="py-3 rounded-2xl items-center bg-secondary"
              >
                <Text className="text-sm font-medium text-muted">Regenerate All</Text>
              </Pressable>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 max-w-md w-full mx-auto">
          {/* Header */}
          <View className="px-6 pt-6 pb-2 flex-row items-center gap-3">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 items-center justify-center rounded-full bg-secondary"
            >
              <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
            </Pressable>
            <View>
              <Text className="text-2xl font-semibold text-foreground tracking-tight">
                Generate a Lesson
              </Text>
              <Text className="text-muted text-sm">AI builds cards from any topic</Text>
            </View>
          </View>

          <ScrollView
            className="flex-1 px-6 pt-4"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Language */}
            <Text className="text-sm font-semibold text-foreground mb-2">Language</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-5"
              contentContainerStyle={{ gap: 8 }}
            >
              {languages.map((lang) => {
                const selected = selectedLanguageId === lang.id;
                return (
                  <Pressable
                    key={lang.id}
                    onPress={() => setSelectedLanguageId(lang.id)}
                    className={`rounded-xl px-4 py-2 border ${
                      selected ? "bg-primary border-primary" : "bg-card border-border"
                    }`}
                  >
                    <Text className={`font-medium text-sm ${selected ? "text-primary-foreground" : "text-foreground"}`}>
                      {lang.language}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Topic */}
            <Text className="text-sm font-semibold text-foreground mb-2">Topic</Text>
            <TextInput
              value={topic}
              onChangeText={setTopic}
              placeholder="e.g. Ordering coffee, At the airport…"
              placeholderTextColor="#A0A0A0"
              maxLength={150}
              className="bg-card border border-border rounded-2xl px-4 py-4 text-foreground text-base mb-1"
              style={{ fontFamily: undefined }}
              returnKeyType="done"
              onSubmitEditing={handleGenerate}
              editable={status !== "generating"}
            />
            <Text className="text-xs text-muted mb-5 pl-1">{topic.length}/150</Text>

            {/* Difficulty */}
            <Text className="text-sm font-semibold text-foreground mb-2">Difficulty</Text>
            <View className="flex-row gap-2 mb-5">
              {DIFFICULTY_OPTIONS.map(({ level, label }) => {
                const selected = difficultyLevel === level;
                return (
                  <Pressable
                    key={level}
                    onPress={() => setDifficultyLevel(level)}
                    className={`flex-1 py-2.5 rounded-xl border items-center ${
                      selected ? "bg-primary border-primary" : "bg-card border-border"
                    }`}
                  >
                    <Text className={`text-xs font-bold ${selected ? "text-primary-foreground" : "text-muted"}`}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Card count */}
            <Text className="text-sm font-semibold text-foreground mb-2">Number of Cards</Text>
            <View className="flex-row gap-2 mb-5">
              {CARD_COUNT_OPTIONS.map((count) => {
                const selected = cardCount === count;
                return (
                  <Pressable
                    key={count}
                    onPress={() => setCardCount(count)}
                    className={`flex-1 py-2.5 rounded-xl border items-center ${
                      selected ? "bg-primary border-primary" : "bg-card border-border"
                    }`}
                  >
                    <Text className={`text-xs font-bold ${selected ? "text-primary-foreground" : "text-muted"}`}>
                      {count}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Suggestions */}
            <Text className="text-sm font-semibold text-foreground mb-2">Suggestions</Text>
            <View className="flex-row flex-wrap gap-2 mb-6">
              {TOPIC_SUGGESTIONS.map((suggestion) => (
                <Pressable
                  key={suggestion}
                  onPress={() => setTopic(suggestion)}
                  className="rounded-full px-3 py-1.5 bg-secondary border border-border"
                >
                  <Text className="text-sm text-foreground">{suggestion}</Text>
                </Pressable>
              ))}
            </View>

            {errorMessage ? (
              <View className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-4">
                <Text className="text-red-600 text-sm">{errorMessage}</Text>
              </View>
            ) : null}

            {status === "generating" && (
              <View className="items-center py-6 gap-3">
                <ActivityIndicator size="large" color="#FF6B4A" />
                <Text className="text-muted text-sm">Building your lesson…</Text>
              </View>
            )}
          </ScrollView>

          {/* Generate button */}
          <View className="px-6 pb-6 pt-3">
            <Pressable
              onPress={handleGenerate}
              disabled={!canGenerate}
              className={`py-4 rounded-2xl items-center ${canGenerate ? "bg-primary" : "bg-secondary"}`}
              style={
                canGenerate
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
              {status === "generating" ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className={`text-base font-semibold ${canGenerate ? "text-primary-foreground" : "text-muted"}`}>
                  Generate Lesson
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
