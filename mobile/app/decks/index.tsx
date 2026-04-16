import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useDecks } from "../../lib/queries";
import { useAppTheme } from "../../lib/theme-context";

export default function DecksIndex() {
  const { data: decks, isLoading, error, refetch, isStale } = useDecks();
  const { matrixMode } = useAppTheme();
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
            <Text className="text-2xl font-semibold text-foreground tracking-tight">
              My Decks
            </Text>
            <Text className="text-muted text-sm">Your custom flashcard decks</Text>
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
              <Text className="text-red-600 text-sm">
                Couldn't load decks. Please try again.
              </Text>
            </View>
          ) : !decks || decks.length === 0 ? (
            <View className="items-center py-16 gap-3">
              <View className="w-16 h-16 rounded-full bg-secondary items-center justify-center">
                <Ionicons name="albums-outline" size={28} color="#A0A0A0" />
              </View>
              <Text className="text-foreground font-medium text-center">
                No decks yet
              </Text>
              <Text className="text-muted text-sm text-center">
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
                <Text className="text-primary-foreground font-semibold">
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
                <Pressable
                  key={deck.id}
                  onPress={() =>
                    router.push({
                      pathname: "/decks/[id]",
                      params: { id: deck.id },
                    })
                  }
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
                    <Text className="text-foreground font-semibold">{deck.name}</Text>
                    {deck.description ? (
                      <Text className="text-muted text-xs mt-0.5" numberOfLines={1}>
                        {deck.description}
                      </Text>
                    ) : null}
                    <Text className="text-muted text-xs mt-0.5">
                      {deck.card_count ?? 0} card
                      {(deck.card_count ?? 0) !== 1 ? "s" : ""}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#A0A0A0" />
                </Pressable>
              ))}
              {query.trim() &&
                decks.filter((d) =>
                  `${d.name} ${d.description ?? ""}`.toLowerCase().includes(query.toLowerCase()),
                ).length === 0 && (
                <View className="items-center py-10 gap-2">
                  <Ionicons name="search" size={28} color="#A0A0A0" />
                  <Text className="text-muted text-sm text-center">
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
