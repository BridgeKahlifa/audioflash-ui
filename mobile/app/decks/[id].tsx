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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../lib/auth-context";
import { useDeck, useDeckCards, useLanguages } from "../../lib/queries";
import { queryKeys } from "../../lib/query-keys";
import { useAppTheme } from "../../lib/theme-context";
import {
  deleteDeckCard,
  deleteDeck,
  type ApiDeckCard,
} from "../../lib/api";

export default function DeckDetail() {
  const { id: deckId } = useLocalSearchParams<{ id: string }>();
  const { session, isDevAuth } = useAuth();
  const { matrixMode } = useAppTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const userId = session?.user?.id ?? (isDevAuth ? "dev" : "");
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);
  const [cardQuery, setCardQuery] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const palette = matrixMode
    ? {
        secondaryButtonBackground: "#202020",
        secondaryButtonIcon: "#ff8c42",
        secondaryButtonMutedIcon: "#A0A0A0",
      }
    : {
        secondaryButtonBackground: "#FBE7DE",
        secondaryButtonIcon: "#1A1A1A",
        secondaryButtonMutedIcon: "#737373",
      };

  const {
    data: deck,
    isLoading: deckLoading,
    error: deckError,
    refetch: refetchDeck,
    isStale: deckStale,
  } = useDeck(deckId ?? "");

  const {
    data: cards,
    isLoading: cardsLoading,
    error: cardsError,
    refetch: refetchCards,
    isStale: cardsStale,
  } = useDeckCards(deckId ?? "");

  const { data: languages } = useLanguages();

  const cardsStaleRef = useRef(false);
  cardsStaleRef.current = cardsStale;
  const deckStaleRef = useRef(false);
  deckStaleRef.current = deckStale;

  useFocusEffect(
    useCallback(() => {
      if (!deckId) return;
      if (deckStaleRef.current) refetchDeck();
      if (cardsStaleRef.current) refetchCards();
    }, [deckId, refetchCards, refetchDeck]),
  );

  const languageName = deck
    ? (languages?.find((l) => l.id === deck.language_id)?.language ?? "")
    : "";
  const languageSlug = languageName.toLowerCase().replace(/\s+/g, "-");

  function handleEditCard(card: ApiDeckCard) {
    router.push({
      pathname: "/decks/[id]/add-card",
      params: { id: deckId!, editCardId: card.id },
    });
  }

  async function handleDeleteCard(card: ApiDeckCard) {
    if ((!session && !isDevAuth) || deletingCardId) return;
    Alert.alert("Delete Card", `Remove "${card.source_text}" from this deck?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeletingCardId(card.id);
          try {
            await deleteDeckCard(session?.access_token, deckId!, card.id);
            qc.invalidateQueries({ queryKey: queryKeys.deckCards(userId, deckId!) });
            qc.invalidateQueries({ queryKey: queryKeys.deck(userId, deckId!) });
            qc.invalidateQueries({ queryKey: queryKeys.decks(userId) });
          } catch {
            Alert.alert("Error", "Couldn't delete the card. Please try again.");
          } finally {
            setDeletingCardId(null);
          }
        },
      },
    ]);
  }

  async function handleDeleteDeck() {
    if (!session && !isDevAuth) return;
    Alert.alert(
      "Delete Deck",
      `Delete "${deck?.name}"? This will remove all cards in the deck.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDeck(session?.access_token, deckId!);
              qc.invalidateQueries({ queryKey: queryKeys.decks(userId) });
              router.replace("/(tabs)/decks");
            } catch {
              Alert.alert("Error", "Couldn't delete the deck. Please try again.");
            }
          },
        },
      ],
    );
  }

  function handleStartPractice() {
    if (activeCards.length === 0 || !deckId) return;
    router.push({ pathname: "/decks/[id]/practice-ready", params: { id: deckId } });
  }

  function enterSelection(card: ApiDeckCard) {
    setSelectionMode(true);
    setSelectedCardIds(new Set([card.id]));
  }

  function toggleSelectCard(card: ApiDeckCard) {
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(card.id)) next.delete(card.id);
      else next.add(card.id);
      return next;
    });
  }

  function exitSelection() {
    setSelectionMode(false);
    setSelectedCardIds(new Set());
  }

  function toggleSelectAll() {
    setSelectedCardIds((prev) =>
      prev.size === visibleCards.length
        ? new Set()
        : new Set(visibleCards.map((c) => c.id)),
    );
  }

  async function handleDeleteSelected() {
    if ((!session && !isDevAuth) || selectedCardIds.size === 0 || bulkDeleting) return;
    const ids = Array.from(selectedCardIds);
    Alert.alert(
      "Delete Cards",
      `Delete ${ids.length} selected card${ids.length !== 1 ? "s" : ""}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setBulkDeleting(true);
            try {
              await Promise.all(
                ids.map((id) => deleteDeckCard(session?.access_token, deckId!, id)),
              );
              qc.invalidateQueries({ queryKey: queryKeys.deckCards(userId, deckId!) });
              qc.invalidateQueries({ queryKey: queryKeys.deck(userId, deckId!) });
              qc.invalidateQueries({ queryKey: queryKeys.decks(userId) });
              exitSelection();
            } catch {
              Alert.alert("Error", "Couldn't delete the selected cards. Please try again.");
            } finally {
              setBulkDeleting(false);
            }
          },
        },
      ],
    );
  }

  const activeCards = cards?.filter((c) => !c.archived_at) ?? [];
  const visibleCards = cardQuery.trim()
    ? activeCards.filter((c) =>
        `${c.source_text} ${c.romanization ?? ""} ${c.translation}`
          .toLowerCase()
          .includes(cardQuery.toLowerCase()),
      )
    : activeCards;
  const practiceFooterPaddingBottom = Math.max(insets.bottom, 12);
  const practiceFooterHeight = 76 + practiceFooterPaddingBottom;

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
      <View className="flex-1 max-w-md w-full mx-auto">
        {/* Header */}
        {selectionMode ? (
          <View className="px-6 pt-6 pb-2 flex-row items-center gap-3">
            <Pressable
              onPress={exitSelection}
              className="w-10 h-10 items-center justify-center rounded-full"
              style={{ backgroundColor: palette.secondaryButtonBackground }}
            >
              <Ionicons name="close" size={22} color={palette.secondaryButtonIcon} />
            </Pressable>
            <View className="flex-1">
              <Text className="text-2xl font-semibold text-foreground tracking-tight">
                {selectedCardIds.size} selected
              </Text>
            </View>
            <Pressable onPress={toggleSelectAll} hitSlop={8} className="px-2 py-2">
              <Text className="text-primary font-semibold">
                {selectedCardIds.size === visibleCards.length ? "Clear" : "Select all"}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View className="px-6 pt-6 pb-2 flex-row items-center gap-3">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 items-center justify-center rounded-full"
              style={{ backgroundColor: palette.secondaryButtonBackground }}
            >
              <Ionicons name="chevron-back" size={22} color={palette.secondaryButtonIcon} />
            </Pressable>
            <View className="flex-1">
              {deckLoading ? (
                <View className="h-7 w-40 bg-secondary rounded-lg" />
              ) : (
                <Text
                  className="text-2xl font-semibold text-foreground tracking-tight"
                  numberOfLines={1}
                >
                  {deck?.name ?? "Deck"}
                </Text>
              )}
            </View>
            <Pressable
              onPress={() =>
                router.push({ pathname: "/decks/[id]/edit", params: { id: deckId! } })
              }
              className="w-10 h-10 items-center justify-center rounded-full"
              style={{ backgroundColor: palette.secondaryButtonBackground }}
            >
              <Ionicons name="pencil" size={18} color={palette.secondaryButtonIcon} />
            </Pressable>
            <Pressable
              onPress={handleDeleteDeck}
              className="w-10 h-10 items-center justify-center rounded-full"
              style={{ backgroundColor: palette.secondaryButtonBackground }}
            >
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </Pressable>
          </View>
        )}

        {/* Deck meta */}
        {deck && !deckLoading && (
          <View className="px-6 pb-3 flex-row items-center gap-2">
            {deck.icon ? (
              <Text style={{ fontSize: 18 }}>{deck.icon}</Text>
            ) : null}
            <Text className="text-muted text-sm">
              {languageName || "—"}
              {"  ·  "}
              {activeCards.length} card{activeCards.length !== 1 ? "s" : ""}
            </Text>
            {deck.description ? (
              <Text className="text-muted text-xs" numberOfLines={1}>
                {"  ·  "}{deck.description}
              </Text>
            ) : null}
          </View>
        )}

        {deckError ? (
          <View className="mx-6 mb-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
            <Text className="text-red-600 text-sm">Couldn't load deck details.</Text>
          </View>
        ) : null}

        {/* Action row */}
        <View className="px-6 pb-4 flex-row gap-2">
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/decks/[id]/add-card",
                params: { id: deckId! },
              })
            }
            className="flex-1 py-3 rounded-2xl items-center bg-card border border-border flex-row justify-center gap-1"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 1,
            }}
          >
            <Ionicons name="add-circle-outline" size={16} color="#FF6B4A" />
            <Text className="text-primary font-semibold text-xs">Manual</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/decks/[id]/quick-add",
                params: { id: deckId! },
              })
            }
            className="flex-1 py-3 rounded-2xl items-center bg-card border border-border flex-row justify-center gap-1"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 1,
            }}
          >
            <Ionicons name="list-outline" size={16} color="#FF6B4A" />
            <Text className="text-primary font-semibold text-xs">Quick Add</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/decks/[id]/generate",
                params: { id: deckId! },
              })
            }
            className="flex-1 py-3 rounded-2xl items-center bg-card border border-border flex-row justify-center gap-1"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 1,
            }}
          >
            <Ionicons name="sparkles" size={16} color="#FF6B4A" />
            <Text className="text-primary font-semibold text-xs">Generate</Text>
          </Pressable>
        </View>

        {/* Card search */}
        {activeCards.length > 0 && (
          <View className="px-6 pb-3">
            <View className="flex-row items-center bg-card border border-border rounded-2xl px-4 py-3 gap-2">
              <Ionicons name="search" size={16} color="#A0A0A0" />
              <TextInput
                value={cardQuery}
                onChangeText={setCardQuery}
                placeholder="Search cards…"
                placeholderTextColor="#A0A0A0"
                className="flex-1 text-foreground" style={{ fontSize: 16 }}
                returnKeyType="search"
                clearButtonMode="while-editing"
                autoCorrect={false}
              />
            </View>
          </View>
        )}

        {/* Card list */}
        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{ paddingBottom: activeCards.length > 0 ? practiceFooterHeight : 24 }}
          showsVerticalScrollIndicator={false}
        >
          {cardsLoading ? (
            <View className="items-center py-16">
              <ActivityIndicator size="large" color="#FF6B4A" />
            </View>
          ) : cardsError ? (
            <View className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
              <Text className="text-red-600 text-sm">Couldn't load cards.</Text>
            </View>
          ) : activeCards.length === 0 ? (
            <View className="items-center py-12 gap-3">
              <View className="w-14 h-14 rounded-full bg-secondary items-center justify-center">
                <Ionicons name="layers-outline" size={24} color="#A0A0A0" />
              </View>
              <Text className="text-foreground font-medium text-center">No cards yet</Text>
              <Text className="text-muted text-sm text-center">
                Add cards manually, quick-add with auto-translation, or generate with AI.
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {visibleCards.map((card) => (
                <CardRow
                  key={card.id}
                  card={card}
                  palette={palette}
                  deleting={deletingCardId === card.id}
                  selectionMode={selectionMode}
                  selected={selectedCardIds.has(card.id)}
                  onEdit={handleEditCard}
                  onDelete={handleDeleteCard}
                  onToggleSelect={toggleSelectCard}
                  onEnterSelection={enterSelection}
                />
              ))}
              {cardQuery.trim() && visibleCards.length === 0 && (
                <View className="items-center py-10 gap-2">
                  <Ionicons name="search" size={28} color="#A0A0A0" />
                  <Text className="text-muted text-sm text-center">
                    No cards match "{cardQuery}"
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Selection action bar / Practice CTA */}
        {selectionMode ? (
          <View
            className="px-6 pt-3 border-t border-border bg-background"
            style={{ paddingBottom: practiceFooterPaddingBottom }}
          >
            <Pressable
              onPress={handleDeleteSelected}
              disabled={selectedCardIds.size === 0 || bulkDeleting}
              className={`py-4 rounded-2xl items-center flex-row justify-center gap-2 ${
                selectedCardIds.size === 0 ? "bg-secondary" : "bg-red-500"
              }`}
            >
              {bulkDeleting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name="trash"
                    size={18}
                    color={selectedCardIds.size === 0 ? "#A0A0A0" : "#FFFFFF"}
                  />
                  <Text
                    className={`text-base font-semibold ${
                      selectedCardIds.size === 0 ? "text-muted" : "text-white"
                    }`}
                  >
                    Delete {selectedCardIds.size > 0 ? `(${selectedCardIds.size})` : ""}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        ) : activeCards.length > 0 ? (
          <View
            className="px-6 pt-3 border-t border-border bg-background"
            style={{ paddingBottom: practiceFooterPaddingBottom }}
          >
            <Pressable
              onPress={handleStartPractice}
              className="py-4 rounded-2xl items-center bg-primary"
              style={{
                shadowColor: "#FF6B4A",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <Text className="text-base font-semibold text-primary-foreground">
                Practice ({activeCards.length} cards)
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const cardShadow = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 4,
  elevation: 1,
} as const;

function CardContent({ card }: { card: ApiDeckCard }) {
  return (
    <View className="flex-1">
      <Text className="text-xl font-semibold text-foreground mb-0.5">
        {card.source_text}
      </Text>
      {card.romanization ? (
        <Text className="text-sm text-primary mb-1">{card.romanization}</Text>
      ) : null}
      <Text className="text-sm text-muted">{card.translation}</Text>
    </View>
  );
}

function CardRow({
  card,
  palette,
  deleting,
  selectionMode,
  selected,
  onEdit,
  onDelete,
  onToggleSelect,
  onEnterSelection,
}: {
  card: ApiDeckCard;
  palette: { secondaryButtonBackground: string; secondaryButtonMutedIcon: string };
  deleting: boolean;
  selectionMode: boolean;
  selected: boolean;
  onEdit: (card: ApiDeckCard) => void;
  onDelete: (card: ApiDeckCard) => void;
  onToggleSelect: (card: ApiDeckCard) => void;
  onEnterSelection: (card: ApiDeckCard) => void;
}) {
  const swipeableRef = useRef<SwipeableMethods>(null);

  const close = useCallback(() => swipeableRef.current?.close(), []);

  const renderRightActions = useCallback(
    () => (
      <View className="flex-row items-stretch ml-3 gap-3">
        <Pressable
          onPress={() => {
            close();
            onEdit(card);
          }}
          className="w-16 rounded-2xl items-center justify-center"
          style={{ backgroundColor: palette.secondaryButtonBackground }}
        >
          <Ionicons name="pencil" size={18} color={palette.secondaryButtonMutedIcon} />
          <Text className="text-muted text-xs mt-1">Edit</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            close();
            onDelete(card);
          }}
          disabled={deleting}
          className="w-16 rounded-2xl items-center justify-center bg-red-500"
        >
          {deleting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="trash" size={18} color="#FFFFFF" />
              <Text className="text-white text-xs mt-1">Delete</Text>
            </>
          )}
        </Pressable>
      </View>
    ),
    [card, palette, deleting, close, onEdit, onDelete],
  );

  // In selection mode, the row becomes a checkbox toggle — no swipe.
  if (selectionMode) {
    return (
      <Pressable
        onPress={() => onToggleSelect(card)}
        className={`rounded-2xl px-4 py-4 flex-row items-center gap-3 border ${
          selected ? "bg-primary/10 border-primary" : "bg-card border-border"
        }`}
        style={cardShadow}
      >
        <View
          className={`w-6 h-6 rounded-full items-center justify-center border ${
            selected ? "bg-primary border-primary" : "bg-transparent border-border"
          }`}
        >
          {selected ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
        </View>
        <CardContent card={card} />
      </Pressable>
    );
  }

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={renderRightActions}
    >
      <Pressable
        onLongPress={() => onEnterSelection(card)}
        delayLongPress={300}
        className="bg-card border border-border rounded-2xl px-4 py-4 flex-row"
        style={cardShadow}
      >
        <CardContent card={card} />
      </Pressable>
    </ReanimatedSwipeable>
  );
}
