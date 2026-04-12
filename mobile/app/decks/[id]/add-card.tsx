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
import { queryKeys } from "../../../lib/query-keys";
import {
  createDeckCard,
  updateDeckCard,
  fetchDeckCards,
} from "../../../lib/api";

export default function AddCard() {
  const { id: deckId, editCardId } = useLocalSearchParams<{
    id: string;
    editCardId?: string;
  }>();
  const { session, isDevAuth } = useAuth();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const userId = session?.user?.id ?? (isDevAuth ? "dev" : "");
  const isEdit = !!editCardId;

  const [sourceText, setSourceText] = useState("");
  const [translation, setTranslation] = useState("");
  const [romanization, setRomanization] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const canSubmit =
    sourceText.trim().length >= 1 && translation.trim().length >= 1 && !submitting;
  const actionBarPaddingBottom = Platform.OS === "android" ? 24 + Math.max(insets.bottom, 12) : 24;

  // Pre-fill form when editing an existing card
  useEffect(() => {
    if (!isEdit) {
      return;
    }
    if ((!session && !isDevAuth) || !deckId || !editCardId) {
      setLoading(false);
      return;
    }
    fetchDeckCards(session?.access_token, deckId)
      .then((cards) => {
        const card = cards.find((c) => c.id === editCardId);
        if (card) {
          setSourceText(card.source_text);
          setTranslation(card.translation);
          setRomanization(card.romanization ?? "");
        }
      })
      .catch(() => setErrorMessage("Couldn't load card details."))
      .finally(() => setLoading(false));
  }, [deckId, editCardId, isDevAuth, isEdit, session, session?.access_token]);

  async function handleSubmit() {
    if (!canSubmit || (!session && !isDevAuth) || !deckId) return;
    setSubmitting(true);
    setErrorMessage("");
    try {
      if (isEdit && editCardId) {
        await updateDeckCard(session?.access_token, deckId, editCardId, {
          source_text: sourceText.trim(),
          translation: translation.trim(),
          romanization: romanization.trim() || null,
        });
      } else {
        await createDeckCard(session?.access_token, deckId, {
          source_text: sourceText.trim(),
          translation: translation.trim(),
          romanization: romanization.trim() || null,
        });
      }
      qc.invalidateQueries({ queryKey: queryKeys.deckCards(userId, deckId) });
      qc.invalidateQueries({ queryKey: queryKeys.deck(userId, deckId) });
      qc.invalidateQueries({ queryKey: queryKeys.decks(userId) });
      router.back();
    } catch {
      setErrorMessage(
        isEdit
          ? "Couldn't update the card. Please try again."
          : "Couldn't add the card. Please try again.",
      );
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#FF6B4A" />
        </View>
      </SafeAreaView>
    );
  }

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
                {isEdit ? "Edit Card" : "Add Card"}
              </Text>
              <Text className="text-muted text-sm">
                {isEdit ? "Update this flashcard" : "Create a new flashcard"}
              </Text>
            </View>
          </View>

          <ScrollView
            className="flex-1 px-6 pt-4"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Source text */}
            <Text className="text-sm font-semibold text-foreground mb-2">
              Word / Phrase
            </Text>
            <TextInput
              value={sourceText}
              onChangeText={setSourceText}
              placeholder="The word or phrase in the target language"
              placeholderTextColor="#A0A0A0"
              maxLength={300}
              className="bg-card border border-border rounded-2xl px-4 py-4 text-foreground text-base mb-1"
              returnKeyType="next"
              editable={!submitting}
              autoFocus
            />
            <Text className="text-xs text-muted mb-5 pl-1">{sourceText.length}/300</Text>

            {/* Translation */}
            <Text className="text-sm font-semibold text-foreground mb-2">Translation</Text>
            <TextInput
              value={translation}
              onChangeText={setTranslation}
              placeholder="English meaning"
              placeholderTextColor="#A0A0A0"
              maxLength={300}
              className="bg-card border border-border rounded-2xl px-4 py-4 text-foreground text-base mb-1"
              returnKeyType="next"
              editable={!submitting}
            />
            <Text className="text-xs text-muted mb-5 pl-1">{translation.length}/300</Text>

            {/* Romanization */}
            <Text className="text-sm font-semibold text-foreground mb-2">
              Romanization{" "}
              <Text className="text-muted font-normal">(optional)</Text>
            </Text>
            <TextInput
              value={romanization}
              onChangeText={setRomanization}
              placeholder="e.g. pinyin, romaji"
              placeholderTextColor="#A0A0A0"
              maxLength={300}
              className="bg-card border border-border rounded-2xl px-4 py-4 text-foreground text-base mb-6"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              editable={!submitting}
            />

            {errorMessage ? (
              <View className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-4">
                <Text className="text-red-600 text-sm">{errorMessage}</Text>
              </View>
            ) : null}
          </ScrollView>

          {/* Submit button */}
          <View className="px-6 pt-3" style={{ paddingBottom: actionBarPaddingBottom }}>
            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit}
              className={`py-4 rounded-2xl items-center ${
                canSubmit ? "bg-primary" : "bg-secondary"
              }`}
              style={
                canSubmit
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
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text
                  className={`text-base font-semibold ${
                    canSubmit ? "text-primary-foreground" : "text-muted"
                  }`}
                >
                  {isEdit ? "Save Changes" : "Add Card"}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
