import { useState } from "react";
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
import { queryKeys } from "../../../lib/query-keys";
import {
  translateDeckPhrases,
  bulkCreateDeckCards,
  type ApiEphemeralDeckCard,
} from "../../../lib/api";

export default function QuickAdd() {
  const { id: deckId } = useLocalSearchParams<{ id: string }>();
  const { session, isDevAuth } = useAuth();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const userId = session?.user?.id ?? (isDevAuth ? "dev" : "");

  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "translating" | "saving" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const [previewCards, setPreviewCards] = useState<ApiEphemeralDeckCard[]>([]);
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());

  const inPreview = previewCards.length > 0;
  const phrases = input
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
const canTranslate = phrases.length > 0 && status !== "translating" && status !== "saving";
  const acceptedCards = previewCards.filter((c) => acceptedIds.has(c._clientId));
  const actionBarPaddingBottom = Platform.OS === "android" ? 24 + Math.max(insets.bottom, 12) : 24;

  async function handleTranslate() {
    if (!canTranslate || (!session && !isDevAuth) || !deckId) return;
    setStatus("translating");
    setErrorMessage("");
    try {
      const result = await translateDeckPhrases(session?.access_token, deckId, { phrases });
      setPreviewCards(result.flashcards);
      setAcceptedIds(new Set(result.flashcards.map((c) => c._clientId)));
      setStatus("idle");
    } catch (error: any) {
      setStatus("error");
      const msg = error?.message ?? "";
      if (msg.includes("422") || msg.includes("inappropriate")) {
        setErrorMessage("One or more phrases couldn't be translated. Please revise and try again.");
      } else {
        setErrorMessage("Translation failed. Please check your connection and try again.");
      }
    }
  }

  function toggleAccepted(clientId: string) {
    setAcceptedIds((prev) => {
      const s = new Set(prev);
      if (s.has(clientId)) s.delete(clientId);
      else s.add(clientId);
      return s;
    });
  }

  function handleRemoveCard(clientId: string) {
    setPreviewCards((prev) => prev.filter((c) => c._clientId !== clientId));
    setAcceptedIds((prev) => {
      const s = new Set(prev);
      s.delete(clientId);
      return s;
    });
  }

  async function handleSave() {
    if ((!session && !isDevAuth) || !deckId || acceptedCards.length === 0) return;
    setStatus("saving");
    setErrorMessage("");
    try {
      await bulkCreateDeckCards(session?.access_token, deckId, {
        cards: acceptedCards.map(({ _clientId: _omit, ...card }) => card),
      });
      qc.invalidateQueries({ queryKey: queryKeys.deckCards(userId, deckId) });
      qc.invalidateQueries({ queryKey: queryKeys.deck(userId, deckId) });
      qc.invalidateQueries({ queryKey: queryKeys.decks(userId) });
      router.back();
    } catch {
      setStatus("error");
      setErrorMessage("Couldn't save cards. Please try again.");
    }
  }

  function handleBackToForm() {
    setPreviewCards([]);
    setAcceptedIds(new Set());
    setStatus("idle");
    setErrorMessage("");
  }

  // ── Preview ──────────────────────────────────────────────────────────────────
  if (inPreview) {
    return (
      <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
        <View className="flex-1 max-w-md w-full mx-auto">
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
                {acceptedCards.length} of {previewCards.length} accepted · tap to toggle
              </Text>
            </View>
          </View>

          <ScrollView
            className="flex-1 px-6 pt-3"
            showsVerticalScrollIndicator={false}
          >
            {previewCards.map((card) => {
              const isAccepted = acceptedIds.has(card._clientId);
              return (
                <Pressable
                  key={card._clientId}
                  onPress={() => toggleAccepted(card._clientId)}
                  className={`border rounded-2xl px-4 py-4 mb-3 ${
                    isAccepted
                      ? "bg-primary/10 border-primary"
                      : "bg-card border-border opacity-50"
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
                    <View className="items-end gap-2">
                      {isAccepted ? (
                        <View className="w-6 h-6 rounded-full bg-primary items-center justify-center">
                          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                        </View>
                      ) : (
                        <View className="w-6 h-6 rounded-full bg-secondary items-center justify-center">
                          <Ionicons name="close" size={14} color="#737373" />
                        </View>
                      )}
                      <Pressable
                        onPress={() => handleRemoveCard(card._clientId)}
                        hitSlop={8}
                        className="w-7 h-7 rounded-full bg-secondary items-center justify-center"
                      >
                        <Ionicons name="trash-outline" size={14} color="#737373" />
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
                  <Text className="text-primary text-sm font-semibold">Go back</Text>
                </Pressable>
              </View>
            )}

            <View className="h-4" />
          </ScrollView>

          {previewCards.length > 0 && (
            <View className="px-6 pb-6 pt-3 gap-3">
              <Pressable
                onPress={() => void handleSave()}
                disabled={acceptedCards.length === 0 || status === "saving"}
                className={`py-4 rounded-2xl items-center ${
                  acceptedCards.length > 0 ? "bg-primary" : "bg-secondary"
                }`}
                style={
                  acceptedCards.length > 0
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
                {status === "saving" ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text
                    className={`text-base font-semibold ${
                      acceptedCards.length > 0 ? "text-primary-foreground" : "text-muted"
                    }`}
                  >
                    Save {acceptedCards.length} Card
                    {acceptedCards.length !== 1 ? "s" : ""}
                  </Text>
                )}
              </Pressable>
              <Pressable
                onPress={handleBackToForm}
                disabled={status === "saving"}
                className="py-3 rounded-2xl items-center bg-secondary"
              >
                <Text className="text-sm font-medium text-muted">Edit Phrases</Text>
              </Pressable>
            </View>
          )}
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
          <View className="px-6 pt-6 pb-2 flex-row items-center gap-3">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 items-center justify-center rounded-full bg-secondary"
            >
              <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
            </Pressable>
            <View>
              <Text className="text-2xl font-semibold text-foreground tracking-tight">
                Quick Add
              </Text>
              <Text className="text-muted text-sm">
                One phrase per line — AI translates them all
              </Text>
            </View>
          </View>

          <ScrollView
            className="flex-1 px-6 pt-4"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text className="text-sm font-semibold text-foreground mb-2">Phrases</Text>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={"hello, how are you\ngood morning\nwhere is the bathroom"}
              placeholderTextColor="#A0A0A0"
              multiline
              className="bg-card border border-border rounded-2xl px-4 py-4 text-foreground text-base mb-2"
              style={{ minHeight: 180, textAlignVertical: "top" }}
              editable={status !== "translating" && status !== "saving"}
              autoFocus
            />
            <Text className="text-xs text-muted mb-6 pl-1">
              {phrases.length} phrase{phrases.length !== 1 ? "s" : ""}
            </Text>

            {errorMessage ? (
              <View className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-4">
                <Text className="text-red-600 text-sm">{errorMessage}</Text>
              </View>
            ) : null}

            {status === "translating" && (
              <View className="items-center py-6 gap-3">
                <ActivityIndicator size="large" color="#FF6B4A" />
                <Text className="text-muted text-sm">Translating your phrases…</Text>
              </View>
            )}
          </ScrollView>

          <View className="px-6 pt-3" style={{ paddingBottom: actionBarPaddingBottom }}>
            <Pressable
              onPress={() => void handleTranslate()}
              disabled={!canTranslate}
              className={`py-4 rounded-2xl items-center ${
                canTranslate ? "bg-primary" : "bg-secondary"
              }`}
              style={
                canTranslate
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
                  canTranslate ? "text-primary-foreground" : "text-muted"
                }`}
              >
                Translate {phrases.length > 0 ? `${phrases.length} Phrase${phrases.length !== 1 ? "s" : ""}` : ""}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
