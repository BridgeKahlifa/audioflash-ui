import { useEffect, useMemo, useState } from "react";
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
import { useAuth } from "../../lib/auth-context";
import { useLanguages } from "../../lib/queries";
import { queryKeys } from "../../lib/query-keys";
import { createDeck, fetchLessonsByCategory, bulkCreateDeckCards } from "../../lib/api";
import { DeckEmojiInput } from "../../components/DeckEmojiInput";
import { LanguagePickerModal } from "../../components/LanguagePickerModal";

export default function NewDeck() {
  const { session, isDevAuth, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const userId = session?.user?.id ?? (isDevAuth ? "dev" : "");

  const { categoryId, languageId: languageIdParam } = useLocalSearchParams<{
    categoryId?: string;
    languageId?: string;
  }>();

  const { data: languages } = useLanguages();

  const [name, setName] = useState("");
  const [selectedLanguageId, setSelectedLanguageId] = useState<string | null>(
    languageIdParam ?? null,
  );
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [icon, setIcon] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const availableLanguages = useMemo(
    () => (languages ?? []).filter((language) => !language.language.toLowerCase().includes("coming soon")),
    [languages],
  );
  const selectedLanguageLabel = availableLanguages.find((language) => language.id === selectedLanguageId)?.language ?? "Select a language";
  const canSubmit = name.trim().length >= 1 && selectedLanguageId !== null && !submitting;
  const actionBarPaddingBottom = Platform.OS === "android" ? 24 + Math.max(insets.bottom, 12) : 24;

  useEffect(() => {
    if (selectedLanguageId || availableLanguages.length === 0) return;
    const preferredLanguageId = profile?.target_language_ids?.[0];
    const preferredLanguage = availableLanguages.find((language) => language.id === preferredLanguageId);
    setSelectedLanguageId(preferredLanguage?.id ?? availableLanguages[0]?.id ?? null);
  }, [availableLanguages, profile?.target_language_ids, selectedLanguageId]);

  async function handleCreate() {
    if (!canSubmit || (!session && !isDevAuth)) return;
    setSubmitting(true);
    setErrorMessage("");
    try {
      const deck = await createDeck(session?.access_token, {
        name: name.trim(),
        language_id: selectedLanguageId!,
        icon: icon ?? null,
        description: description.trim() || null,
      });

      // If launched from a category, bulk-import its cards into the new deck
      if (categoryId) {
        try {
          const categoryCards = await fetchLessonsByCategory({ categoryId, shuffle: false });
          if (categoryCards.length > 0) {
            await bulkCreateDeckCards(session?.access_token ?? null, deck.id, {
              cards: categoryCards.map((c) => ({
                source_text: c.source_text,
                translation: c.translation,
                romanization: c.romanization ?? null,
                difficulty: c.difficulty ?? null,
              })),
            });
          }
          qc.invalidateQueries({ queryKey: queryKeys.deckCards(userId, deck.id) });
          qc.invalidateQueries({ queryKey: queryKeys.deck(userId, deck.id) });
        } catch {
          // Cards failed to import — still navigate to the deck, user can add manually
        }
      }

      qc.invalidateQueries({ queryKey: queryKeys.decks(userId) });
      router.replace({ pathname: "/decks/[id]", params: { id: deck.id } });
    } catch {
      setErrorMessage("Couldn't create the deck. Please try again.");
      setSubmitting(false);
    }
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
                New Deck
              </Text>
              <Text className="text-muted text-sm">
                {categoryId ? "Cards will be imported automatically" : "Create a custom flashcard deck"}
              </Text>
            </View>
          </View>

          <ScrollView
            className="flex-1 px-6 pt-4"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Deck name */}
            <Text className="text-sm font-semibold text-foreground mb-2">Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={selectedLanguageId && selectedLanguageLabel !== "Select a language" ? `e.g. ${selectedLanguageLabel} Travel Phrases` : "e.g. Travel Phrases"}
              placeholderTextColor="#A0A0A0"
              maxLength={80}
              className="bg-card border border-border rounded-2xl px-4 py-4 text-foreground text-base mb-1"
              returnKeyType="done"
              editable={!submitting}
            />
            <Text className="text-xs text-muted mb-5 pl-1">{name.length}/80</Text>

            {/* Language */}
            <Text className="text-sm font-semibold text-foreground mb-2">Language</Text>
            <Pressable
              onPress={() => { if (!languageIdParam) setShowLanguagePicker(true); }}
              className="bg-card border border-border rounded-2xl px-4 py-4 mb-5 flex-row items-center justify-between"
              style={languageIdParam ? { opacity: 0.6 } : undefined}
            >
              <View className="flex-1 pr-3">
                <Text className="text-base font-medium text-foreground">
                  {selectedLanguageLabel}
                </Text>
                <Text className="text-xs text-muted mt-1">
                  {languageIdParam ? "Inherited from category." : "Choose the language for this deck."}
                </Text>
              </View>
              {languageIdParam ? (
                <Ionicons name="lock-closed" size={16} color="#9CA3AF" />
              ) : (
                <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
              )}
            </Pressable>

            {/* Icon */}
            <Text className="text-sm font-semibold text-foreground mb-2">
              Icon{" "}
              <Text className="text-muted font-normal">(optional)</Text>
            </Text>
            <DeckEmojiInput value={icon} onChange={setIcon} disabled={submitting} />

            {/* Description */}
            <Text className="text-sm font-semibold text-foreground mb-2">
              Description{" "}
              <Text className="text-muted font-normal">(optional)</Text>
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What will you practice in this deck?"
              placeholderTextColor="#A0A0A0"
              maxLength={200}
              multiline
              numberOfLines={3}
              className="bg-card border border-border rounded-2xl px-4 py-4 text-foreground text-base mb-1"
              style={{ textAlignVertical: "top", minHeight: 80 }}
              editable={!submitting}
            />
            <Text className="text-xs text-muted mb-6 pl-1">{description.length}/200</Text>

            {errorMessage ? (
              <View className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-4">
                <Text className="text-red-600 text-sm">{errorMessage}</Text>
              </View>
            ) : null}
          </ScrollView>

          {/* Create button */}
          <View className="px-6 pt-3" style={{ paddingBottom: actionBarPaddingBottom }}>
            <Pressable
              onPress={handleCreate}
              disabled={!canSubmit}
              className={`py-4 rounded-2xl items-center ${canSubmit ? "bg-primary" : "bg-secondary"
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
                  className={`text-base font-semibold ${canSubmit ? "text-primary-foreground" : "text-muted"
                    }`}
                >
                  {categoryId ? "Create Deck & Import Cards" : "Create Deck"}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
      <LanguagePickerModal
        visible={showLanguagePicker}
        languages={availableLanguages}
        selectedIds={selectedLanguageId ? [selectedLanguageId] : []}
        onToggle={setSelectedLanguageId}
        onClose={() => setShowLanguagePicker(false)}
      />
    </SafeAreaView>
  );
}
