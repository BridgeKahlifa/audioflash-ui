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
import { fetchDeck, updateDeck } from "../../../lib/api";
import { DeckEmojiInput } from "../../../components/DeckEmojiInput";

export default function EditDeck() {
  const { id: deckId } = useLocalSearchParams<{ id: string }>();
  const { session, isDevAuth } = useAuth();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const userId = session?.user?.id ?? (isDevAuth ? "dev" : "");

  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const canSubmit = name.trim().length >= 1 && !submitting;
  const actionBarPaddingBottom = Platform.OS === "android" ? 24 + Math.max(insets.bottom, 12) : 24;

  useEffect(() => {
    if ((!session && !isDevAuth) || !deckId) {
      setLoading(false);
      return;
    }
    fetchDeck(session?.access_token, deckId)
      .then((deck) => {
        setName(deck.name);
        setIcon(deck.icon);
        setDescription(deck.description ?? "");
      })
      .catch(() => setErrorMessage("Couldn't load deck details."))
      .finally(() => setLoading(false));
  }, [isDevAuth, session, session?.access_token, deckId]);

  async function handleSave() {
    if (!canSubmit || (!session && !isDevAuth) || !deckId) return;
    setSubmitting(true);
    setErrorMessage("");
    try {
      await updateDeck(session?.access_token, deckId, {
        name: name.trim(),
        icon: icon ?? null,
        description: description.trim() || null,
      });
      qc.invalidateQueries({ queryKey: queryKeys.deck(userId, deckId) });
      qc.invalidateQueries({ queryKey: queryKeys.decks(userId) });
      router.back();
    } catch {
      setErrorMessage("Couldn't save changes. Please try again.");
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
                Edit Deck
              </Text>
              <Text className="text-muted text-sm">Update name, icon, or description</Text>
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
              placeholder="Deck name"
              placeholderTextColor="#A0A0A0"
              maxLength={80}
              className="bg-card border border-border rounded-2xl px-4 py-4 text-foreground text-base mb-1"
              returnKeyType="done"
              editable={!submitting}
            />
            <Text className="text-xs text-muted mb-5 pl-1">{name.length}/80</Text>

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

          {/* Save button */}
          <View className="px-6 pt-3" style={{ paddingBottom: actionBarPaddingBottom }}>
            <Pressable
              onPress={handleSave}
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
                  Save Changes
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
