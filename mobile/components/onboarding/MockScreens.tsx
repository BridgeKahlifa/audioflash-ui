import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Brand colors (hardcoded so these previews have zero context dependencies)
const BG = "#FFF7F2";
const CARD = "#FFFDFC";
const BORDER = "#F2CBBE";
const PRIMARY = "#E86A4A";
const SECONDARY = "#FBE7DE";
const MUTED = "#8B6E66";
const FG = "#2F1E19";

// ─── Generate Flashcards ─────────────────────────────────────────────────────

export function MockGenerateScreen() {
  return (
    <View style={{ backgroundColor: BG }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 10 }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: SECONDARY, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="chevron-back" size={18} color={FG} />
        </View>
        <View>
          <Text style={{ fontSize: 17, fontWeight: "600", color: FG }}>Generate Flashcards</Text>
          <Text style={{ fontSize: 11, color: MUTED }}>AI builds flashcards from any topic</Text>
        </View>
      </View>

      {/* Language */}
      <View style={{ paddingHorizontal: 16 }}>
        <Text style={{ fontSize: 12, fontWeight: "600", color: FG, marginBottom: 6 }}>Language</Text>
        <View style={{ backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <View>
            <Text style={{ fontSize: 14, fontWeight: "500", color: FG }}>Spanish</Text>
            <Text style={{ fontSize: 10, color: MUTED, marginTop: 1 }}>Choose the language for these flashcards.</Text>
          </View>
          <Ionicons name="chevron-down" size={15} color="#9CA3AF" />
        </View>
      </View>

      {/* Topic */}
      <View style={{ paddingHorizontal: 16 }}>
        <Text style={{ fontSize: 12, fontWeight: "600", color: FG, marginBottom: 6 }}>Topic</Text>
        <View style={{ backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 16, marginBottom: 14 }}>
          <Text style={{ fontSize: 14, color: FG }}>Ordering coffee</Text>
        </View>
      </View>

      {/* Difficulty */}
      <View style={{ paddingHorizontal: 16 }}>
        <Text style={{ fontSize: 12, fontWeight: "600", color: FG, marginBottom: 6 }}>Difficulty</Text>
        <View style={{ flexDirection: "row", gap: 6, marginBottom: 14 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <View
              key={n}
              style={{
                flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, alignItems: "center",
                backgroundColor: n === 1 ? PRIMARY : CARD,
                borderColor: n === 1 ? PRIMARY : BORDER,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "700", color: n === 1 ? "#fff" : MUTED }}>{n}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Card count */}
      <View style={{ paddingHorizontal: 16 }}>
        <Text style={{ fontSize: 12, fontWeight: "600", color: FG, marginBottom: 6 }}>Number of Cards</Text>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {[5, 10, 15, 20, 25, 30].map((n) => (
            <View
              key={n}
              style={{
                flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, alignItems: "center",
                backgroundColor: n === 10 ? PRIMARY : CARD,
                borderColor: n === 10 ? PRIMARY : BORDER,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "700", color: n === 10 ? "#fff" : MUTED }}>{n}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Browse Categories ────────────────────────────────────────────────────────

const MOCK_CATEGORIES = [
  { icon: "airplane" as const, title: "Travel" },
  { icon: "restaurant" as const, title: "Food & Drink" },
  { icon: "briefcase" as const, title: "Business" },
  { icon: "school" as const, title: "Education" },
  { icon: "bag-handle" as const, title: "Shopping" },
  { icon: "heart" as const, title: "Health" },
];

export function MockCategoriesScreen() {
  return (
    <View style={{ backgroundColor: BG }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
        <Text style={{ fontSize: 22, fontWeight: "600", color: FG }}>Browse</Text>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 3 }}>
          <Text style={{ fontSize: 12, color: MUTED }}>Language: </Text>
          <Text style={{ fontSize: 12, fontWeight: "500", color: FG }}>Spanish</Text>
          <Ionicons name="chevron-down" size={11} color={MUTED} style={{ marginLeft: 2 }} />
        </View>
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}>
          <Ionicons name="search" size={13} color="#A0A0A0" />
          <Text style={{ fontSize: 13, color: "#C4AFA8" }}>Search categories…</Text>
        </View>
      </View>

      {/* Grid */}
      <View style={{ paddingHorizontal: 16, flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {MOCK_CATEGORIES.map(({ icon, title }) => (
          <View
            key={title}
            style={{
              width: "47.5%", backgroundColor: CARD, borderRadius: 16, padding: 12,
              borderWidth: 1, borderColor: BORDER,
              shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
            }}
          >
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: SECONDARY, alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
              <Ionicons name={icon} size={17} color={FG} />
            </View>
            <Text style={{ fontSize: 13, fontWeight: "500", color: FG }}>{title}</Text>
            <Ionicons name="chevron-forward" size={12} color={MUTED} style={{ position: "absolute", top: 14, right: 10 }} />
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── My Decks ────────────────────────────────────────────────────────────────

const MOCK_DECKS = [
  { icon: "🇪🇸", name: "Spanish Basics", desc: "Core vocabulary", cards: 48 },
  { icon: "🍕", name: "Food & Drink", desc: "Restaurants & ordering", cards: 32 },
  { icon: "✈️", name: "Travel Phrases", desc: "Airports & hotels", cards: 24 },
];

export function MockDecksScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 10 }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: SECONDARY, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="chevron-back" size={18} color={FG} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: "600", color: FG }}>My Decks</Text>
          <Text style={{ fontSize: 11, color: MUTED }}>Your custom flashcard decks</Text>
        </View>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="add" size={20} color="#fff" />
        </View>
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}>
          <Ionicons name="search" size={13} color="#A0A0A0" />
          <Text style={{ fontSize: 13, color: "#C4AFA8" }}>Search decks…</Text>
        </View>
      </View>

      {/* Deck rows */}
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        {MOCK_DECKS.map((deck) => (
          <View
            key={deck.name}
            style={{
              backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 16,
              padding: 13, flexDirection: "row", alignItems: "center",
              shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
            }}
          >
            <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: "#FFF3F0", alignItems: "center", justifyContent: "center", marginRight: 12, flexShrink: 0 }}>
              <Text style={{ fontSize: 22 }}>{deck.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: FG }}>{deck.name}</Text>
              <Text style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>{deck.desc}</Text>
              <Text style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>{deck.cards} cards</Text>
            </View>
            <Ionicons name="chevron-forward" size={15} color="#A0A0A0" />
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Progress ────────────────────────────────────────────────────────────────

const MOCK_WEEK = [
  { day: "Mon", cards: 0 },
  { day: "Tue", cards: 12 },
  { day: "Wed", cards: 8 },
  { day: "Thu", cards: 20 },
  { day: "Fri", cards: 15 },
  { day: "Sat", cards: 0 },
  { day: "Sun", cards: 6 },
];

export function MockProgressScreen() {
  const max = Math.max(...MOCK_WEEK.map((d) => d.cards), 1);
  return (
    <View style={{ backgroundColor: BG }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 }}>
        <Text style={{ fontSize: 20, fontWeight: "600", color: FG }}>Your Progress</Text>
      </View>

      {/* Streak banner */}
      <View style={{ marginHorizontal: 16, borderRadius: 22, padding: 18, backgroundColor: PRIMARY, marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="flame" size={24} color="#fff" />
          </View>
          <View>
            <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.8)" }}>Daily Streak</Text>
            <Text style={{ fontSize: 26, fontWeight: "700", color: "#fff" }}>14 days</Text>
          </View>
        </View>
        <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.9)" }}>Keep your streak alive!</Text>
      </View>

      {/* Stat cards */}
      <View style={{ paddingHorizontal: 16, flexDirection: "row", gap: 10, marginBottom: 12 }}>
        {[
          { icon: "radio-button-on" as const, label: "Cards", value: "240" },
          { icon: "trending-up" as const, label: "Accuracy", value: "82%" },
          { icon: "trophy" as const, label: "Sessions", value: "18" },
        ].map(({ icon, label, value }) => (
          <View key={label} style={{ flex: 1, backgroundColor: CARD, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: BORDER }}>
            <View style={{ width: 30, height: 30, backgroundColor: "#FFF3F0", borderRadius: 9, alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
              <Ionicons name={icon} size={15} color={PRIMARY} />
            </View>
            <Text style={{ fontSize: 17, fontWeight: "600", color: FG, marginBottom: 1 }}>{value}</Text>
            <Text style={{ fontSize: 10, color: MUTED }}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Mini bar chart */}
      <View style={{ marginHorizontal: 16, backgroundColor: CARD, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: BORDER }}>
        <Text style={{ fontSize: 13, fontWeight: "500", color: FG, marginBottom: 10 }}>This Week</Text>
        <View style={{ flexDirection: "row", alignItems: "flex-end", height: 60 }}>
          {MOCK_WEEK.map((item, i) => (
            <View key={i} style={{ flex: 1, alignItems: "center", gap: 4 }}>
              <View
                style={{
                  width: 18,
                  height: item.cards > 0 ? Math.max((item.cards / max) * 44, 4) : 4,
                  backgroundColor: item.cards > 0 ? PRIMARY : "#F2CBBE",
                  borderRadius: 4,
                }}
              />
              <Text style={{ fontSize: 8, color: MUTED }}>{item.day}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
