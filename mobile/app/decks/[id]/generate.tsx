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
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../lib/auth-context";
import { captureHandledException, useAnalytics } from "../../../lib/analytics";
import { queryKeys } from "../../../lib/query-keys";
import {
  fetchDeck,
  generateDeckPreview,
  bulkCreateDeckCards,
  isLimitReachedError,
  type ApiDeck,
  type ApiEphemeralDeckCard,
} from "../../../lib/api";
import { useEntitlements } from "../../../lib/queries";
import { MAX_FREE_DIFFICULTY } from "../../../lib/entitlements";

const CARD_COUNT_OPTIONS = [5, 10, 15, 20];
const DIFFICULTY_OPTIONS = [1, 2, 3, 4, 5];

const TOPIC_SUGGESTIONS = [
  "Greetings",
  "Numbers",
  "Food & drink",
  "Directions",
  "Shopping",
  "Weather",
  "Family",
  "Time & dates",
];

export default function DeckGenerate() {
  const { id: deckId } = useLocalSearchParams<{ id: string }>();
  const { session, isDevAuth } = useAuth();
  const posthog = useAnalytics();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const userId = session?.user?.id ?? (isDevAuth ? "dev" : "");
  const { data: entitlements } = useEntitlements();

  const [deck, setDeck] = useState<ApiDeck | null>(null);
  const [topic, setTopic] = useState("");
  const [difficultyLevel, setDifficultyLevel] = useState(3);
  const [cardCount, setCardCount] = useState(10);
  // Lock difficulty 3+ behind Pro for non-paid plans. The default is 3, so free
  // users get clamped down to the max allowed once entitlements load.
  const lockHighDifficulty = entitlements?.tier === "free";
  useEffect(() => {
    if (lockHighDifficulty && difficultyLevel > MAX_FREE_DIFFICULTY) {
      setDifficultyLevel(MAX_FREE_DIFFICULTY);
    }
  }, [lockHighDifficulty, difficultyLevel]);
  const [status, setStatus] = useState<"idle" | "generating" | "saving" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Preview state — every generated card is kept and saved by default. Long-press
  // enters selection mode to bulk regenerate/delete; per-card icons act on one card.
  const [previewCards, setPreviewCards] = useState<ApiEphemeralDeckCard[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Which single card's regenerate icon is spinning (per-card regenerate).
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  const inPreview = previewCards.length > 0;
  const outOfGenerations =
    !!entitlements &&
    entitlements.ai_generations.limit !== null &&
    entitlements.ai_generations.limit - entitlements.ai_generations.used <= 0;
  const canGenerate =
    topic.trim().length >= 2 && status !== "generating" && status !== "saving" && !outOfGenerations;
  const actionBarPaddingBottom = Platform.OS === "android" ? 24 + Math.max(insets.bottom, 12) : 24;

  useEffect(() => {
    if ((!session && !isDevAuth) || !deckId) return;
    fetchDeck(session?.access_token, deckId)
      .then(setDeck)
      .catch((error) => {
        captureHandledException(posthog, error, {
          error_context: "deck_generate_load_deck",
          deck_id: deckId,
        });
      });
  }, [deckId, isDevAuth, session, session?.access_token]);

  async function handleGenerate() {
    if (!canGenerate || (!session && !isDevAuth) || !deckId) return;
    setStatus("generating");
    setErrorMessage("");
    try {
      const result = await generateDeckPreview(session?.access_token, deckId, {
        topic: topic.trim(),
        card_count: cardCount,
        difficulty_level: difficultyLevel,
      });
      setPreviewCards(result.flashcards);
      qc.invalidateQueries({ queryKey: queryKeys.entitlements(userId) });
      setStatus("idle");
    } catch (error: any) {
      if (isLimitReachedError(error)) {
        setStatus("error");
        setErrorMessage(
          (error.data as any)?.detail?.message ??
            "You've reached the Free plan's AI generation limit. Upgrade to Pro for unlimited generations.",
        );
        qc.invalidateQueries({ queryKey: queryKeys.entitlements(userId) });
        return;
      }
      const msg = error?.message ?? "";
      let errorType = "unknown";
      if (msg.includes("429") || msg.includes("limit")) {
        errorType = "rate_limit";
      } else if (msg.includes("422") || msg.includes("inappropriate")) {
        errorType = "inappropriate_topic";
      }

      captureHandledException(posthog, error, {
        error_context: "deck_generate_preview",
        deck_id: deckId,
        topic_length: topic.trim().length,
        difficulty: difficultyLevel,
        card_count: cardCount,
        error_type: errorType,
      });
      setStatus("error");
      if (msg.includes("429") || msg.includes("limit")) {
        setErrorMessage("You've hit the generation limit. Try again in an hour.");
      } else if (msg.includes("422") || msg.includes("inappropriate")) {
        setErrorMessage("That topic couldn't be used. Please try a different one.");
      } else {
        setErrorMessage("Generation failed. Please check your connection and try again.");
      }
    }
  }

  async function handleSave() {
    if ((!session && !isDevAuth) || !deckId || previewCards.length === 0) return;
    setStatus("saving");
    setErrorMessage("");
    try {
      await bulkCreateDeckCards(session?.access_token, deckId, {
        cards: previewCards.map(({ _clientId: _omit, ...card }) => card),
      });
      qc.invalidateQueries({ queryKey: queryKeys.deckCards(userId, deckId) });
      qc.invalidateQueries({ queryKey: queryKeys.deck(userId, deckId) });
      qc.invalidateQueries({ queryKey: queryKeys.decks(userId) });
      router.back();
    } catch (error) {
      captureHandledException(posthog, error, {
        error_context: "deck_generate_save",
        deck_id: deckId,
        card_count: previewCards.length,
      });
      setStatus("error");
      setErrorMessage("Couldn't save cards. Please try again.");
    }
  }

  function handleBackToForm() {
    setPreviewCards([]);
    exitSelection();
    setStatus("idle");
    setErrorMessage("");
  }

  function enterSelection(clientId: string) {
    setSelectionMode(true);
    setSelectedIds(new Set([clientId]));
  }

  function toggleSelected(clientId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  }

  function exitSelection() {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }

  function toggleSelectAll() {
    setSelectedIds((prev) =>
      prev.size === previewCards.length
        ? new Set()
        : new Set(previewCards.map((c) => c._clientId)),
    );
  }

  function deleteCards(clientIds: Set<string>) {
    if (clientIds.size === 0) return;
    setPreviewCards((prev) => prev.filter((c) => !clientIds.has(c._clientId)));
    exitSelection();
  }

  // Replace the target cards in place with freshly generated ones. Used for both
  // the per-card regenerate icon (one id) and bulk regenerate (the selection).
  async function regenerateCards(clientIds: Set<string>) {
    const targetIds = new Set(clientIds);
    if (targetIds.size === 0 || (!session && !isDevAuth) || !deckId) return;
    if (status === "generating" || status === "saving") return;
    const count = targetIds.size;
    setStatus("generating");
    // A single target is a per-card regenerate — spin that card's icon.
    if (count === 1) setRegeneratingId([...targetIds][0]);
    setErrorMessage("");
    try {
      const result = await generateDeckPreview(session?.access_token, deckId, {
        topic: topic.trim(),
        card_count: count,
        difficulty_level: difficultyLevel,
      });
      const fresh = [...result.flashcards];
      // Swap each target card for a freshly generated one, in place. Any target
      // without a replacement (server returned fewer) is dropped.
      setPreviewCards((prev) =>
        prev
          .map((c) => (targetIds.has(c._clientId) && fresh.length ? fresh.shift()! : c))
          .filter((c) => !targetIds.has(c._clientId)),
      );
      qc.invalidateQueries({ queryKey: queryKeys.entitlements(userId) });
      setStatus("idle");
      exitSelection();
    } catch (error: any) {
      if (isLimitReachedError(error)) {
        setStatus("error");
        setErrorMessage(
          (error.data as any)?.detail?.message ??
            "You've reached the Free plan's AI generation limit. Upgrade to Pro for unlimited generations.",
        );
        qc.invalidateQueries({ queryKey: queryKeys.entitlements(userId) });
        return;
      }
      captureHandledException(posthog, error, {
        error_context: "deck_generate_regenerate",
        deck_id: deckId,
        card_count: count,
        difficulty: difficultyLevel,
      });
      setStatus("error");
      setErrorMessage("Couldn't regenerate. Please try again.");
    } finally {
      setRegeneratingId(null);
    }
  }

  // ── Preview ──────────────────────────────────────────────────────────────────
  if (inPreview) {
    return (
      <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
        <View className="flex-1 max-w-md w-full mx-auto">
          {/* Header */}
          {selectionMode ? (
            <View className="px-6 pt-6 pb-2 flex-row items-center gap-3">
              <Pressable
                onPress={exitSelection}
                className="w-10 h-10 items-center justify-center rounded-full bg-secondary"
              >
                <Ionicons name="close" size={22} color="#1A1A1A" />
              </Pressable>
              <View className="flex-1">
                <Text className="text-2xl font-semibold text-foreground tracking-tight">
                  {selectedIds.size} selected
                </Text>
              </View>
              <Pressable onPress={toggleSelectAll} hitSlop={8} className="px-2 py-2">
                <Text className="text-primary font-semibold">
                  {selectedIds.size === previewCards.length ? "Clear" : "Select all"}
                </Text>
              </Pressable>
            </View>
          ) : (
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
                  {previewCards.length} card{previewCards.length !== 1 ? "s" : ""} · long-press to select
                </Text>
              </View>
            </View>
          )}

          <ScrollView
            className="flex-1 px-6 pt-3"
            showsVerticalScrollIndicator={false}
          >
            {previewCards.map((card) => {
              const isSelected = selectedIds.has(card._clientId);
              return (
                <Pressable
                  key={card._clientId}
                  onPress={() => (selectionMode ? toggleSelected(card._clientId) : undefined)}
                  onLongPress={() => !selectionMode && enterSelection(card._clientId)}
                  delayLongPress={300}
                  className={`border rounded-2xl px-4 py-4 mb-3 ${
                    selectionMode && isSelected
                      ? "bg-primary/10 border-primary"
                      : "bg-card border-border"
                  }`}
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 1,
                  }}
                >
                  <View className="flex-row items-start justify-between gap-3">
                    {selectionMode ? (
                      <View
                        className={`w-6 h-6 rounded-full items-center justify-center border mt-0.5 ${
                          isSelected ? "bg-primary border-primary" : "bg-transparent border-border"
                        }`}
                      >
                        {isSelected ? (
                          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                        ) : null}
                      </View>
                    ) : null}
                    <View className="flex-1">
                      <Text className="text-xl font-semibold text-foreground mb-0.5">
                        {card.source_text}
                      </Text>
                      {card.romanization ? (
                        <Text className="text-sm text-primary mb-1">
                          {card.romanization}
                        </Text>
                      ) : null}
                      <Text className="text-sm text-muted">{card.translation}</Text>
                    </View>
                    {selectionMode ? null : (
                      <View className="flex-row items-center gap-2">
                        <Pressable
                          onPress={() => void regenerateCards(new Set([card._clientId]))}
                          disabled={status === "generating" || status === "saving"}
                          hitSlop={6}
                          className="w-8 h-8 rounded-full bg-secondary items-center justify-center"
                        >
                          {regeneratingId === card._clientId ? (
                            <ActivityIndicator size="small" color="#737373" />
                          ) : (
                            <Ionicons name="refresh" size={16} color="#737373" />
                          )}
                        </Pressable>
                        <Pressable
                          onPress={() => deleteCards(new Set([card._clientId]))}
                          hitSlop={6}
                          className="w-8 h-8 rounded-full bg-secondary items-center justify-center"
                        >
                          <Ionicons name="trash-outline" size={16} color="#737373" />
                        </Pressable>
                      </View>
                    )}
                  </View>
                </Pressable>
              );
            })}

            <View className="h-4" />
          </ScrollView>

          {/* Actions */}
          {selectionMode ? (
            <View className="px-6 pb-6 pt-3 flex-row gap-3">
              <Pressable
                onPress={() => void regenerateCards(selectedIds)}
                disabled={selectedIds.size === 0 || status === "generating"}
                className={`flex-1 py-4 rounded-2xl items-center flex-row justify-center gap-2 ${
                  selectedIds.size === 0 ? "bg-secondary" : "bg-primary"
                }`}
              >
                {status === "generating" ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name="refresh"
                      size={18}
                      color={selectedIds.size === 0 ? "#A0A0A0" : "#FFFFFF"}
                    />
                    <Text
                      className={`text-base font-semibold ${
                        selectedIds.size === 0 ? "text-muted" : "text-primary-foreground"
                      }`}
                    >
                      Regenerate{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
                    </Text>
                  </>
                )}
              </Pressable>
              <Pressable
                onPress={() => deleteCards(selectedIds)}
                disabled={selectedIds.size === 0 || status === "generating"}
                className={`flex-1 py-4 rounded-2xl items-center flex-row justify-center gap-2 ${
                  selectedIds.size === 0 ? "bg-secondary" : "bg-red-500"
                }`}
              >
                <Ionicons
                  name="trash"
                  size={18}
                  color={selectedIds.size === 0 ? "#A0A0A0" : "#FFFFFF"}
                />
                <Text
                  className={`text-base font-semibold ${
                    selectedIds.size === 0 ? "text-muted" : "text-white"
                  }`}
                >
                  Delete{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
                </Text>
              </Pressable>
            </View>
          ) : previewCards.length > 0 ? (
            <View className="px-6 pb-6 pt-3">
              <Pressable
                onPress={() => void handleSave()}
                disabled={status === "saving" || status === "generating"}
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
                    Save {previewCards.length} Card
                    {previewCards.length !== 1 ? "s" : ""}
                  </Text>
                )}
              </Pressable>
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────────
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
                Generate Cards
              </Text>
              <Text className="text-muted text-sm">
                {deck ? `For "${deck.name}"` : "AI builds cards from any topic"}
              </Text>
            </View>
          </View>

          {entitlements && entitlements.ai_generations.limit !== null ? (
            <View className="px-6 pb-2">
              <View className="bg-secondary border border-border rounded-2xl px-4 py-3">
                <Text className="text-sm text-foreground font-medium">
                  {Math.max(0, entitlements.ai_generations.limit - entitlements.ai_generations.used)} of{" "}
                  {entitlements.ai_generations.limit} free AI generations left this month
                </Text>
                <Text className="text-xs text-muted mt-0.5">
                  Upgrade to Pro for unlimited generations.
                </Text>
              </View>
            </View>
          ) : null}

          <ScrollView
            className="flex-1 px-6 pt-4"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Topic */}
            <Text className="text-sm font-semibold text-foreground mb-2">Topic</Text>
            <TextInput
              value={topic}
              onChangeText={setTopic}
              placeholder="e.g. Ordering coffee, At the airport…"
              placeholderTextColor="#A0A0A0"
              maxLength={150}
              className="bg-card border border-border rounded-2xl px-4 py-4 text-foreground text-base mb-1"
              returnKeyType="done"
              onSubmitEditing={handleGenerate}
              editable={status !== "generating"}
            />
            <Text className="text-xs text-muted mb-5 pl-1">{topic.length}/150</Text>

            {/* Difficulty */}
            <Text className="text-sm font-semibold text-foreground mb-2">Difficulty</Text>
            <View className="flex-row gap-2 mb-5">
              {DIFFICULTY_OPTIONS.map((level) => {
                const selected = difficultyLevel === level;
                const locked = lockHighDifficulty && level > MAX_FREE_DIFFICULTY;
                return (
                  <Pressable
                    key={level}
                    disabled={locked}
                    onPress={() => setDifficultyLevel(level)}
                    accessibilityState={{ disabled: locked, selected }}
                    className={`flex-1 py-2.5 rounded-xl border items-center ${
                      locked
                        ? "bg-card border-border opacity-40"
                        : selected
                          ? "bg-primary border-primary"
                          : "bg-card border-border"
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        selected && !locked ? "text-primary-foreground" : "text-muted"
                      }`}
                    >
                      {level}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {lockHighDifficulty ? (
              <Text className="text-xs text-muted pl-1 -mt-3 mb-5">
                Difficulty 3+ is available on Pro.
              </Text>
            ) : null}

            {/* Card count */}
            <Text className="text-sm font-semibold text-foreground mb-2">
              Number of Cards
            </Text>
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
                    <Text
                      className={`text-xs font-bold ${
                        selected ? "text-primary-foreground" : "text-muted"
                      }`}
                    >
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
                <Text className="text-muted text-sm">Building your cards…</Text>
              </View>
            )}
          </ScrollView>

          {/* Generate button */}
          <View className="px-6 pt-3" style={{ paddingBottom: actionBarPaddingBottom }}>
            <Pressable
              onPress={handleGenerate}
              disabled={!canGenerate}
              className={`py-4 rounded-2xl items-center ${
                canGenerate ? "bg-primary" : "bg-secondary"
              }`}
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
                <Text
                  className={`text-base font-semibold ${
                    canGenerate ? "text-primary-foreground" : "text-muted"
                  }`}
                >
                  Generate Cards
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
