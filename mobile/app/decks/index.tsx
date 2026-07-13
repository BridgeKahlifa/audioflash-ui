import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../lib/auth-context";
import { useDecks } from "../../lib/queries";
import { queryKeys } from "../../lib/query-keys";
import { useAppTheme } from "../../lib/theme-context";
import { deleteDeck, type ApiDeck } from "../../lib/api";

export default function DecksIndex() {
  const { data: decks, isLoading, error, refetch, isStale } = useDecks();
  const { session, isDevAuth } = useAuth();
  const qc = useQueryClient();
  const userId = session?.user?.id ?? (isDevAuth ? "dev" : "");
  const { matrixMode, fontFamily } = useAppTheme();

  const handleEditDeck = useCallback((deckId: string) => {
    router.push({ pathname: "/decks/[id]/edit", params: { id: deckId } });
  }, []);

  const handleDeleteDeck = useCallback(
    (deck: ApiDeck) => {
      if (!session && !isDevAuth) return;
      Alert.alert(
        "Delete Deck",
        `Delete "${deck.name}"? This will remove all cards in the deck.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                await deleteDeck(session?.access_token, deck.id);
                qc.invalidateQueries({ queryKey: queryKeys.decks(userId) });
              } catch {
                Alert.alert("Error", "Couldn't delete the deck. Please try again.");
              }
            },
          },
        ],
      );
    },
    [session, isDevAuth, qc, userId],
  );
  const isStaleRef = useRef(false);
  isStaleRef.current = isStale;
  const [query, setQuery] = useState("");
  const backButtonPalette = matrixMode
    ? {
        background: "#202020",
        icon: "#ff8c42",
      }
    : {
        background: "#FBE7DE",
        icon: "#1A1A1A",
      };

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/(tabs)");
  }

  useFocusEffect(
    useCallback(() => {
      if (isStaleRef.current) refetch();
    }, [refetch]),
  );

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
            <Text className="text-2xl font-semibold text-foreground tracking-tight" style={{ fontFamily }}>
              My Decks
            </Text>
            <Text className="text-muted text-sm" style={{ fontFamily }}>Your custom flashcard decks</Text>
          </View>
          <Pressable
            onPress={() => router.push("/decks/new")}
            className="w-10 h-10 items-center justify-center rounded-full bg-primary"
            style={{
              shadowColor: "#FF6B4A",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Search */}
        <View className="px-6 pb-3">
          <View className="flex-row items-center bg-card border border-border rounded-2xl px-4 py-3 gap-2">
            <Ionicons name="search" size={16} color="#A0A0A0" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search decks…"
              placeholderTextColor="#A0A0A0"
              className="flex-1 text-foreground" style={{ fontSize: 16 }}
              returnKeyType="search"
              clearButtonMode="while-editing"
              autoCorrect={false}
            />
          </View>
        </View>

        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View className="items-center py-16">
              <ActivityIndicator size="large" color="#FF6B4A" />
            </View>
          ) : error ? (
            <View className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-4">
              <Text className="text-red-600 text-sm" style={{ fontFamily }}>
                Couldn't load decks. Please try again.
              </Text>
            </View>
          ) : !decks || decks.length === 0 ? (
            <View className="items-center py-16 gap-3">
              <View className="w-16 h-16 rounded-full bg-secondary items-center justify-center">
                <Ionicons name="albums-outline" size={28} color="#A0A0A0" />
              </View>
              <Text className="text-foreground font-medium text-center" style={{ fontFamily }}>
                No decks yet
              </Text>
              <Text className="text-muted text-sm text-center" style={{ fontFamily }}>
                Create a deck to build your own flashcard sets.
              </Text>
              <Pressable
                onPress={() => router.push("/decks/new")}
                className="mt-2 rounded-2xl px-5 py-3 bg-primary"
                style={{
                  shadowColor: "#FF6B4A",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <Text className="text-primary-foreground font-semibold" style={{ fontFamily }}>
                  Create a Deck
                </Text>
              </Pressable>
            </View>
          ) : (
            <View className="gap-3">
              {(query.trim()
                ? decks.filter((d) =>
                    `${d.name} ${d.description ?? ""}`.toLowerCase().includes(query.toLowerCase()),
                  )
                : decks
              ).map((deck) => (
                <DeckRow
                  key={deck.id}
                  deck={deck}
                  fontFamily={fontFamily}
                  onEdit={handleEditDeck}
                  onDelete={handleDeleteDeck}
                />
              ))}
              {query.trim() &&
                decks.filter((d) =>
                  `${d.name} ${d.description ?? ""}`.toLowerCase().includes(query.toLowerCase()),
                ).length === 0 && (
                <View className="items-center py-10 gap-2">
                  <Ionicons name="search" size={28} color="#A0A0A0" />
                  <Text className="text-muted text-sm text-center" style={{ fontFamily }}>
                    No decks match "{query}"
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function DeckRow({
  deck,
  fontFamily,
  onEdit,
  onDelete,
}: {
  deck: ApiDeck;
  fontFamily?: string;
  onEdit: (deckId: string) => void;
  onDelete: (deck: ApiDeck) => void;
}) {
  const swipeableRef = useRef<SwipeableMethods>(null);

  const close = useCallback(() => swipeableRef.current?.close(), []);

  const openDeck = useCallback(() => {
    router.push({ pathname: "/decks/[id]", params: { id: deck.id } });
  }, [deck.id]);

  const showActions = useCallback(() => {
    Alert.alert(deck.name, undefined, [
      { text: "Edit", onPress: () => onEdit(deck.id) },
      { text: "Delete", style: "destructive", onPress: () => onDelete(deck) },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [deck, onEdit, onDelete]);

  const renderRightActions = useCallback(
    () => (
      <View className="flex-row items-stretch ml-3 gap-3">
        <Pressable
          onPress={() => {
            close();
            onEdit(deck.id);
          }}
          className="w-16 rounded-2xl items-center justify-center bg-secondary"
        >
          <Ionicons name="pencil" size={20} color="#1A1A1A" />
          <Text className="text-foreground text-xs mt-1" style={{ fontFamily }}>
            Edit
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            close();
            onDelete(deck);
          }}
          className="w-16 rounded-2xl items-center justify-center bg-red-500"
        >
          <Ionicons name="trash" size={20} color="#FFFFFF" />
          <Text className="text-white text-xs mt-1" style={{ fontFamily }}>
            Delete
          </Text>
        </Pressable>
      </View>
    ),
    [deck, close, onEdit, onDelete, fontFamily],
  );

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={renderRightActions}
    >
      <Pressable
        onPress={openDeck}
        onLongPress={showActions}
        delayLongPress={300}
        className="bg-card border border-border rounded-2xl p-4 flex-row items-center"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 1,
        }}
      >
        <View className="w-12 h-12 rounded-xl bg-accent items-center justify-center mr-4 flex-shrink-0">
          {deck.icon ? (
            <Text style={{ fontSize: 24 }}>{deck.icon}</Text>
          ) : (
            <Ionicons name="albums" size={24} color="#FF6B4A" />
          )}
        </View>
        <View className="flex-1">
          <Text className="text-foreground font-semibold" style={{ fontFamily }}>
            {deck.name}
          </Text>
          {deck.description ? (
            <Text className="text-muted text-xs mt-0.5" numberOfLines={1} style={{ fontFamily }}>
              {deck.description}
            </Text>
          ) : null}
          <Text className="text-muted text-xs mt-0.5" style={{ fontFamily }}>
            {deck.card_count ?? 0} card
            {(deck.card_count ?? 0) !== 1 ? "s" : ""}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#A0A0A0" />
      </Pressable>
    </ReanimatedSwipeable>
  );
}
