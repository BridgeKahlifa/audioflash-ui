import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
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
  generateLesson,
  generateReplacements,
  type ApiEphemeralCard,
  bulkCreateDeckCards,
} from "../lib/api";
import { useAuth } from "../lib/auth-context";
import {
  clearGeneratedDeckImport,
  setGeneratedDeckImport,
} from "../lib/storage";
import { LanguagePickerModal } from "../components/LanguagePickerModal";
import { useDecks, useLanguages, queryKeys } from "../lib/queries";
import { useQueryClient } from "@tanstack/react-query";
import { useAppTheme } from "../lib/theme-context";
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
  topic: string;
  languageId: string;
  languageLabel: string;
}

export default function Generate() {
  const { session, profile, isDevAuth } = useAuth();
  const posthog = useAnalytics();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { fontFamily } = useAppTheme();
  const userId = session?.user?.id ?? (isDevAuth ? "dev" : "");
  const { data: decks } = useDecks();
  const { data: languagesData, error: languagesError } = useLanguages();
  const [topic, setTopic] = useState("");
  const [selectedLanguageId, setSelectedLanguageId] = useState<string | null>(
    profile?.target_language_ids?.[0] ?? null,
  );
  const [difficultyLevel, setDifficultyLevel] = useState(1);
  const [cardCount, setCardCount] = useState(10);
  const [status, setStatus] = useState<"idle" | "generating" | "saving" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  // Preview step
  const [generatedResult, setGeneratedResult] = useState<GeneratedResult | null>(null);
  const [previewCards, setPreviewCards] = useState<ApiEphemeralCard[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [replacingIds, setReplacingIds] = useState<Set<string>>(new Set());
  const [showDeckModal, setShowDeckModal] = useState(false);
  const [addingToDeckId, setAddingToDeckId] = useState<string | null>(null);
  const [deckSearch, setDeckSearch] = useState("");
  const deckModalOpacity = useRef(new Animated.Value(0)).current;
  const deckModalTranslateY = useRef(new Animated.Value(400)).current;
  const [deckModalMounted, setDeckModalMounted] = useState(false);

  const languages = useMemo(
    () => (languagesData ?? []).filter((language) => !language.language.toLowerCase().includes("coming soon")),
    [languagesData],
  );

  useEffect(() => {
    if (languagesError) {
      setLoadError("We couldn't load the available languages right now. Please try again in a moment.");
      return;
    }
    setLoadError("");
  }, [languagesError]);

  useEffect(() => {
    if (selectedLanguageId || languages.length === 0) return;
    const preferredLanguageId = profile?.target_language_ids?.[0];
    const preferredLanguage = languages.find((language) => language.id === preferredLanguageId);
    setSelectedLanguageId(preferredLanguage?.id ?? languages[0]?.id ?? null);
  }, [languages, profile?.target_language_ids, selectedLanguageId]);

  const canGenerate =
    topic.trim().length >= 2 && selectedLanguageId !== null && status === "idle";
  const actionBarPaddingBottom = Platform.OS === "android" ? 24 + Math.max(insets.bottom, 12) : 24;
  const matchingDecks = useMemo(
    () => (decks ?? []).filter((deck) => deck.language_id === generatedResult?.languageId),
    [decks, generatedResult?.languageId],
  );
  const filteredDecks = useMemo(
    () =>
      matchingDecks.filter((deck) =>
        !deckSearch.trim() || deck.name.toLowerCase().includes(deckSearch.toLowerCase()),
      ),
    [deckSearch, matchingDecks],
  );

  async function handleGenerate() {
    if (!canGenerate || !session?.access_token) return;

    setStatus("generating");
    setErrorMessage("");

    const selectedLang = languages.find((l) => l.id === selectedLanguageId);
    posthog?.capture("lesson_generate_started", {
      language: selectedLang?.language ?? "",
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
        languageId: selectedLanguageId!,
        languageLabel: selectedLang?.language ?? "",
      });
      setPreviewCards(result.flashcards);
      posthog?.capture("lesson_generated", {
        language: selectedLang?.language ?? "",
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
        language: selectedLang?.language ?? "",
        topic: topic.trim(),
        error_type,
      });
    }
  }

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
      ]).start(() => {
        setDeckModalMounted(false);
        setDeckSearch("");
      });
    }
  }, [deckModalOpacity, deckModalTranslateY, showDeckModal]);

  async function handleAddToDeck(deckId: string) {
    if (!session?.access_token || previewCards.length === 0 || addingToDeckId) return;
    setStatus("saving");
    setAddingToDeckId(deckId);
    setErrorMessage("");

    try {
      await bulkCreateDeckCards(session.access_token, deckId, {
        cards: previewCards.map(({ _clientId: _omit, ...card }) => card),
      });
      qc.invalidateQueries({ queryKey: queryKeys.deckCards(userId, deckId) });
      qc.invalidateQueries({ queryKey: queryKeys.deck(userId, deckId) });
      qc.invalidateQueries({ queryKey: queryKeys.decks(userId) });
      posthog?.capture("flashcards_saved_to_deck", {
        deck_id: deckId,
        topic: generatedResult?.topic ?? topic.trim(),
        language: generatedResult?.languageLabel ?? "",
        card_count: previewCards.length,
      });
      setShowDeckModal(false);
      router.push({ pathname: "/decks/[id]", params: { id: deckId } });
    } catch {
      setStatus("error");
      setErrorMessage("Couldn't save cards to this deck. Please try again.");
      Alert.alert("Error", "Couldn't add cards to deck. Please try again.");
    } finally {
      setAddingToDeckId(null);
      setStatus("idle");
    }
  }

  async function handleCreateNewDeck() {
    if (!generatedResult || previewCards.length === 0) return;
    await setGeneratedDeckImport({
      languageId: generatedResult.languageId,
      cards: previewCards.map(({ _clientId: _omit, ...card }) => ({
        ...card,
        difficulty: card.difficulty,
      })),
    });
    setShowDeckModal(false);
    router.push({
      pathname: "/decks/new",
      params: {
        languageId: generatedResult.languageId,
        importSource: "generated",
      },
    });
  }

  function handleRemoveCard(clientId: string) {
    setPreviewCards((prev) => prev.filter((c) => c._clientId !== clientId));
    setSelectedIds((prev) => { const s = new Set(prev); s.delete(clientId); return s; });
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

  function handleBackToForm() {
    setGeneratedResult(null);
    setPreviewCards([]);
    setSelectedIds(new Set());
    setReplacingIds(new Set());
    setStatus("idle");
    setErrorMessage("");
    setShowDeckModal(false);
    void clearGeneratedDeckImport();
  }

  function renderDeckModal() {
    return (
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
                Save Flashcards
              </Text>
              <Pressable onPress={() => setShowDeckModal(false)}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </Pressable>
            </View>

            <Pressable
              onPress={() => void handleCreateNewDeck()}
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

            {matchingDecks.length > 0 && (
              <>
                <Text className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 pl-1" style={{ fontFamily }}>
                  My Decks
                </Text>
                {matchingDecks.length > 4 && (
                  <View className="flex-row items-center bg-card border border-border rounded-2xl px-3 py-2.5 gap-2 mb-3">
                    <Ionicons name="search" size={15} color="#A0A0A0" />
                    <TextInput
                      value={deckSearch}
                      onChangeText={setDeckSearch}
                      placeholder="Search decks…"
                      placeholderTextColor="#A0A0A0"
                      className="flex-1 text-foreground"
                      style={{ fontSize: 15, fontFamily }}
                      returnKeyType="search"
                      clearButtonMode="while-editing"
                      autoCorrect={false}
                    />
                  </View>
                )}
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View className="gap-2">
                    {filteredDecks.map((deck) => (
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

            {matchingDecks.length === 0 && (
              <View className="items-center py-4 gap-1">
                <Text className="text-muted text-sm text-center" style={{ fontFamily }}>
                  No matching decks — create one above.
                </Text>
              </View>
            )}
          </Animated.View>
        </View>
      </Modal>
    );
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
                  onPress={() => setShowDeckModal(true)}
                  disabled={status === "saving"}
                  className="py-4 rounded-2xl items-center bg-primary"
                  style={{
                    shadowColor: "#FF6B4A",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                >
                  {status === "saving" ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text className="text-base font-semibold text-primary-foreground">
                      Save Flashcards ({previewCards.length})
                    </Text>
                  )}
                </Pressable>
              )}
              <Pressable
                onPress={handleBackToForm}
                disabled={status === "saving" || replacingIds.size > 0}
                className="py-3 rounded-2xl items-center bg-secondary"
              >
                <Text className="text-sm font-medium text-muted">Regenerate All</Text>
              </Pressable>
            </View>
          )}
        </View>
        {renderDeckModal()}
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
                Generate Flashcards
              </Text>
              <Text className="text-muted text-sm">AI builds flashcards from any topic</Text>
            </View>
          </View>

          <ScrollView
            className="flex-1 px-6 pt-4"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Language */}
            <Text className="text-sm font-semibold text-foreground mb-2">Language</Text>
            <Pressable
              onPress={() => setShowLanguagePicker(true)}
              className="bg-card border border-border rounded-2xl px-4 py-4 mb-5 flex-row items-center justify-between"
            >
              <View className="flex-1 pr-3">
                <Text className="text-base font-medium text-foreground">
                  {languages.find((l) => l.id === selectedLanguageId)?.language ?? "Select a language"}
                </Text>
                <Text className="text-xs text-muted mt-1">Choose the language for these flashcards.</Text>
              </View>
              <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
            </Pressable>

            {/* Topic */}
            <Text className="text-sm font-semibold text-foreground mb-2">Topic</Text>
            <TextInput
              value={topic}
              onChangeText={setTopic}
              placeholder="e.g. Ordering coffee, At the airport…"
              placeholderTextColor="#A0A0A0"
              maxLength={300}
              className="bg-card border border-border rounded-2xl px-4 py-6 text-foreground text-base mb-1"
              style={{ fontFamily: undefined }}
              returnKeyType="done"
              onSubmitEditing={handleGenerate}
              editable={status !== "generating"}
              multiline
            />
            <Text className="text-xs text-muted mb-5 pl-1">{topic.length}/300</Text>

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
                <Text className="text-muted text-sm">Building your flashcards…</Text>
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
                  Generate Flashcards
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
      {renderDeckModal()}
      <LanguagePickerModal
        visible={showLanguagePicker}
        languages={languages}
        selectedIds={selectedLanguageId ? [selectedLanguageId] : []}
        onToggle={setSelectedLanguageId}
        onClose={() => setShowLanguagePicker(false)}
      />
    </SafeAreaView>
  );
}
