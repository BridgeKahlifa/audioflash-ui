import { useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Dimensions,
  Image,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAnalytics } from "../lib/analytics";
import {
  MockGenerateScreen,
  MockCategoriesScreen,
  MockDecksScreen,
  MockProgressScreen,
} from "../components/onboarding/MockScreens";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const LOGO_IMAGE = require("../assets/AudioFlashLogo.png");
const PREVIEW_HEIGHT = 295;

interface SlideConfig {
  preview: React.ReactNode;
  title: string;
  description: string;
}

const SLIDES: SlideConfig[] = [
  {
    preview: <MockGenerateScreen />,
    title: "Generate Any Lesson",
    description: "Pick a language and topic — AI builds your flashcards in seconds.",
  },
  {
    preview: <MockCategoriesScreen />,
    title: "Browse Curated Topics",
    description: "Jump straight into ready-made lessons across dozens of categories.",
  },
  {
    preview: <MockDecksScreen />,
    title: "Build Your Own Decks",
    description: "Organize your flashcards into custom decks and practice them anytime.",
  },
  {
    preview: <MockProgressScreen />,
    title: "Build a Daily Streak",
    description: "Track cards practiced, accuracy, and how many days you've kept it up.",
  },
];

const TOTAL_SLIDES = 1 + SLIDES.length;

function SpotlightSlide({ slide }: { slide: SlideConfig }) {
  return (
    <View style={{ paddingHorizontal: 20 }}>
      <View
        style={{
          height: PREVIEW_HEIGHT, borderRadius: 22, overflow: "hidden",
          shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1, shadowRadius: 16, elevation: 4,
        }}
      >
        {slide.preview}
        <View
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.38)" }}
          pointerEvents="none"
        />
      </View>
      <View style={{ marginTop: 18, paddingHorizontal: 4 }}>
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#2F1E19", marginBottom: 5, letterSpacing: -0.3 }}>
          {slide.title}
        </Text>
        <Text style={{ fontSize: 14, color: "#8B6E66", lineHeight: 21 }}>
          {slide.description}
        </Text>
      </View>
    </View>
  );
}

export default function TutorialScreen() {
  const posthog = useAnalytics();
  const scrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const isLast = currentIndex === TOTAL_SLIDES - 1;

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH));
  }

  function handleDone() {
    posthog?.capture("tutorial_rewatched");
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  }

  function handleNext() {
    if (isLast) {
      handleDone();
      return;
    }
    const next = currentIndex + 1;
    scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
    setCurrentIndex(next);
  }

  return (
    <SafeAreaView edges={["top", "left", "right", "bottom"]} className="flex-1 bg-background">
      <View className="h-11 flex-row justify-between items-center px-6">
        <Pressable onPress={handleDone} hitSlop={12}>
          <Text className="text-muted text-sm font-medium">Close</Text>
        </Pressable>
        {!isLast && (
          <Pressable onPress={handleDone} hitSlop={12}>
            <Text className="text-muted text-sm font-medium">Skip</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {/* Slide 0: Welcome */}
        <View style={{ width: SCREEN_WIDTH }} className="flex-1 px-8 justify-center items-center">
          <Image source={LOGO_IMAGE} style={{ width: 100, height: 100, marginBottom: 36 }} resizeMode="contain" />
          <Text className="text-3xl font-bold text-foreground tracking-tight text-center mb-4">
            {"Welcome to\nAudioFlash"}
          </Text>
          <Text className="text-muted text-center text-base leading-relaxed">
            Learn any language through audio-first flashcards, personalized to you with AI.
          </Text>
        </View>

        {/* Slides 1–4: Spotlight feature slides */}
        {SLIDES.map((slide, i) => (
          <View key={i} style={{ width: SCREEN_WIDTH }} className="flex-1 justify-center">
            <SpotlightSlide slide={slide} />
          </View>
        ))}
      </ScrollView>

      {/* Dots + CTA */}
      <View className="px-6 pb-8 gap-5">
        <View className="flex-row justify-center gap-2">
          {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
            <View
              key={i}
              className={`h-2 rounded-full ${i === currentIndex ? "bg-primary" : "bg-border"}`}
              style={{ width: i === currentIndex ? 24 : 8 }}
            />
          ))}
        </View>

        <Pressable
          onPress={handleNext}
          className="py-4 rounded-2xl items-center bg-primary"
          style={{ shadowColor: "#E86A4A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
        >
          <Text className="text-primary-foreground font-semibold text-base">
            {isLast ? "Done" : "Next"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
