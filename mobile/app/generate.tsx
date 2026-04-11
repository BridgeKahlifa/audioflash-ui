import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useAnalytics } from "../lib/analytics";
import {
  commitGeneratedLesson,
  createLessonSession,
  fetchLanguages,
  generateLesson,
  generateReplacements,
  type ApiEphemeralCard,
  type ApiLanguage,
} from "../lib/api";
import { useAuth } from "../lib/auth-context";
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
  { level: 1, label: "1" },
  { level: 2, label: "2" },
  { level: 3, label: "3" },
  { level: 4, label: "4" },
  { level: 5, label: "5" },
];

interface GeneratedResult {
  /** The original user-typed topic — used for the commit hash. */
  topic: string;
  categoryName: string;
  languageId: string;
  languageSlug: string;
  languageLabel: string;
}

/** Cards committed to the DB. Stored so a second action (save → start) skips re-commit. */
interface CommittedResult {
  categoryId: string;
  categoryName: string;
  /** DB card IDs in the same order as previewCards at commit time. */
  cardIds: string[];
}

export default function Generate() {
  const { session, profile } = useAuth();
  const posthog = useAnalytics();
  const insets = useSafeAreaInsets();
  const [topic, setTopic] = useState("");
  const [languages, setLanguages] = useState<ApiLanguage[]>([]);
  const [selectedLanguageId, setSelectedLanguageId] = useState<string | null>(null);
  const [difficultyLevel, setDifficultyLevel] = useState(3);
  const [cardCount, setCardCount] = useState(10);
  const [status, setStatus] = useState<"idle" | "generating" | "starting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [loadError, setLoadError] = useState("");

  // Preview step
  const [generatedResult, setGeneratedResult] = useState<GeneratedResult | null>(null);
  const [previewCards, setPreviewCards] = useState<ApiEphemeralCard[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [replacingIds, setReplacingIds] = useState<Set<string>>(new Set());
  const [committedResult, setCommittedResult] = useState<CommittedResult | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoadError("");
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
      .catch(() => {
        setLoadError("We couldn't load the available languages right now. Please try again in a moment.");
      });
  }, []);

  const canGenerate =
    topic.trim().length >= 2 && selectedLanguageId !== null && status === "idle";
  const actionBarPaddingBottom = Platform.OS === "android" ? 24 + Math.max(insets.bottom, 12) : 24;

  async function handleGenerate() {
    if (!canGenerate || !session?.access_token) return;

    setStatus("generating");
    setErrorMessage("");

    const selectedLang = languages.find((l) => l.id === selectedLanguageId);
    posthog?.capture("lesson_generate_started", {
      language: selectedLang?.language,
      difficulty: difficultyLevel,
      card_count: cardCount,
      topic: topic.trim(),
    });

    try {
      const result = await generateLesson(session.access_token, {
        language_id: selectedLanguageId!,
        topic: topic.trim(),
        card_count: cardCount,
        difficulty_level: difficultyLevel,
      });

      setGeneratedResult({
        topic: topic.trim(),
        categoryName: result.category_name,
        languageId: selectedLanguageId!,
        languageSlug: selectedLang?.language.toLowerCase().replace(/\s+/g, "-") ?? "unknown",
        languageLabel: selectedLang?.language ?? "",
      });
      setPreviewCards(result.flashcards);
      setCommittedResult(null);
      setIsSaved(false);
      posthog?.capture("lesson_generated", {
        language: selectedLang?.language,
        difficulty: difficultyLevel,
        card_count: result.flashcards.length,
        topic: topic.trim(),
      });
      setStatus("idle");
    } catch (error: any) {
      setStatus("error");
      const msg = error?.message ?? "";
      let error_type = "unknown";
      if (msg.includes("429") || msg.includes("limit")) {
        setErrorMessage("You've hit the generation limit. Try again in an hour.");
        error_type = "rate_limit";
      } else if (msg.includes("422") || msg.includes("inappropriate")) {
        setErrorMessage("That topic couldn't be used. Please try a different one.");
        error_type = "inappropriate_topic";
      } else {
        setErrorMessage("Generation failed. Please check your connection and try again.");
      }
      posthog?.capture("lesson_generate_failed", {
        language: selectedLang?.language,
        topic: topic.trim(),
        error_type,
      });
    }
  }

  /**
   * Persist the current previewCards to the DB if not already done.
   * Returns the committed result, or null on failure.
   */
  async function ensureCommitted(): Promise<CommittedResult | null> {
    if (committedResult) return committedResult;
    if (!generatedResult || !session?.access_token || previewCards.length === 0) return null;

    const committed = await commitGeneratedLesson(session.access_token, {
      language_id: generatedResult.languageId,
      topic: generatedResult.topic,
      difficulty_level: difficultyLevel,
      cards: previewCards.map(({ _clientId: _omit, ...card }) => card),
    });

    const result: CommittedResult = {
      categoryId: String(committed.category_id),
      categoryName: committed.category_name,
      cardIds: committed.flashcards.map((f) => String(f.id)),
    };
    setCommittedResult(result);
    return result;
  }

  async function handleStartLesson() {
    if (!generatedResult || !session?.access_token || previewCards.length === 0) return;

    const profileId = profile?.id ?? session.user?.id;
    if (!profileId) return;

    setStatus("starting");

    try {
      const committed = await ensureCommitted();
      if (!committed) throw new Error("Commit failed");

      const topicKey = `generated-${committed.categoryId}`;
      const mappedCards: Flashcard[] = committed.cardIds.map((dbId, index) => ({
        id: index + 1,
        dbId,
        sourceText: previewCards[index]?.source_text ?? "",
        romanization: previewCards[index]?.romanization ?? "",
        translation: previewCards[index]?.translation ?? "",
      }));
      await setCurrentCards(topicKey, mappedCards);

      const lessonSession = await createLessonSession(session.access_token, {
        profile_id: profileId,
        category_id: committed.categoryId,
        difficulty: difficultyLevel,
        started_at: new Date().toISOString(),
        card_ids: committed.cardIds,
        current_index: 0,
        status: "in_progress",
        completed: false,
      });

      posthog?.capture("lesson_started", {
        language: generatedResult.languageLabel,
        topic: generatedResult.categoryName,
        difficulty: difficultyLevel,
        card_count: mappedCards.length,
      });

      router.replace({
        pathname: "/practice/[topic]",
        params: {
          topic: topicKey,
          topicTitle: committed.categoryName,
          language: generatedResult.languageSlug,
          languageLabel: generatedResult.languageLabel,
          apiLanguageId: generatedResult.languageId,
          apiCategoryId: committed.categoryId,
          difficulty: String(difficultyLevel),
          apiLoaded: "true",
          lessonSessionId: lessonSession.session_id,
          activityId: lessonSession.activity_id ?? lessonSession.session_id,
        },
      });
    } catch {
      setStatus("error");
      setErrorMessage("Couldn't start the lesson. Please try again.");
    }
  }

  function handleRemoveCard(clientId: string) {
    setPreviewCards((prev) => prev.filter((c) => c._clientId !== clientId));
    setSelectedIds((prev) => { const s = new Set(prev); s.delete(clientId); return s; });
    // Card list changed — any commit is now stale
    setCommittedResult(null);
    setIsSaved(false);
  }

  function toggleSelected(clientId: string) {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      if (s.has(clientId)) s.delete(clientId);
      else s.add(clientId);
      return s;
    });
  }

  async function handleRegenerateSelected() {
    if (!generatedResult || !session?.access_token || selectedIds.size === 0) return;

    const idsToReplace = Array.from(selectedIds);
    setReplacingIds(new Set(idsToReplace));
    setSelectedIds(new Set());
    // Replacements invalidate any commit
    setCommittedResult(null);
    setIsSaved(false);

    try {
      const result = await generateReplacements(session.access_token, {
        language_id: generatedResult.languageId,
        topic: generatedResult.topic,
        difficulty_level: difficultyLevel,
        count: idsToReplace.length,
      });

      setPreviewCards((prev) => {
        const replacements = [...result.flashcards];
        return prev.map((card) => {
          if (idsToReplace.includes(card._clientId)) {
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

  async function handleSave() {
    if (!generatedResult || !session?.access_token || saving) return;
    setSaving(true);
    try {
      await ensureCommitted();
      setIsSaved(true);
      posthog?.capture("lesson_saved", {
        language: generatedResult.languageLabel,
        card_count: previewCards.length,
        topic: generatedResult.topic,
      });
    } catch {
      // ignore — user can still start the lesson
    } finally {
      setSaving(false);
    }
  }

  function handleBackToForm() {
    setGeneratedResult(null);
    setPreviewCards([]);
    setSelectedIds(new Set());
    setReplacingIds(new Set());
    setCommittedResult(null);
    setIsSaved(false);
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
            <Pressable
              onPress={handleSave}
              disabled={saving || isSaved}
              className="w-10 h-10 items-center justify-center rounded-full bg-secondary"
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FF6B4A" />
              ) : (
                <Ionicons
                  name={isSaved ? "bookmark" : "bookmark-outline"}
                  size={20}
                  color={isSaved ? "#FF6B4A" : "#1A1A1A"}
                />
              )}
            </Pressable>
          </View>

          <ScrollView
            className="flex-1 px-6 pt-3"
            showsVerticalScrollIndicator={false}
          >
            {previewCards.map((card) => {
              const isSelected = selectedIds.has(card._clientId);
              const isReplacing = replacingIds.has(card._clientId);
              return (
                <Pressable
                  key={card._clientId}
                  onPress={() => !isReplacing && toggleSelected(card._clientId)}
                  className={`border rounded-2xl px-4 py-4 mb-3 ${isSelected
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
                            {card.difficulty}
                          </Text>
                        </View>
                      )}
                      <Pressable
                        onPress={() => handleRemoveCard(card._clientId)}
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
                    className={`rounded-xl px-4 py-2 border ${selected ? "bg-primary border-primary" : "bg-card border-border"
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
                    className={`flex-1 py-2.5 rounded-xl border items-center ${selected ? "bg-primary border-primary" : "bg-card border-border"
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
                    className={`flex-1 py-2.5 rounded-xl border items-center ${selected ? "bg-primary border-primary" : "bg-card border-border"
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

            {loadError ? (
              <View className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-4">
                <Text className="text-red-600 text-sm">{loadError}</Text>
              </View>
            ) : null}

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
          <View className="px-6 pt-3" style={{ paddingBottom: actionBarPaddingBottom }}>
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
