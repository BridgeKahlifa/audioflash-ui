import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

interface Topic {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const topics: Topic[] = [
  { id: "travel", title: "Travel", description: "Navigate a new country", icon: "airplane" },
  { id: "taxi", title: "Taxi", description: "Get around town", icon: "car" },
  { id: "ordering-food", title: "Ordering Food", description: "Restaurant & dining", icon: "restaurant" },
  { id: "dating", title: "Dating", description: "Casual conversation", icon: "heart" },
  { id: "business", title: "Business", description: "Professional communication", icon: "briefcase" },
  { id: "education", title: "Education", description: "Academic discussions", icon: "school" },
  { id: "shopping", title: "Shopping", description: "Market & retail", icon: "bag-handle" },
  { id: "home", title: "Home & Family", description: "Everyday household", icon: "home" },
];

export default function Categories() {
  const { language, languageLabel } = useLocalSearchParams<{
    language?: string;
    languageLabel?: string;
  }>();

  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const handleGenerateLesson = () => {
    if (!selectedTopic) return;
    const topic = topics.find((t) => t.id === selectedTopic);

    router.push({
      pathname: "/lesson-ready/[topic]",
      params: {
        topic: selectedTopic,
        topicTitle: topic?.title ?? selectedTopic,
        language: language ?? "mandarin",
        languageLabel: languageLabel ?? "Mandarin Chinese",
      },
    });
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
      <View className="flex-1 max-w-md w-full mx-auto">
        <View className="pt-8 pb-6 px-6">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center rounded-full bg-secondary mb-4"
          >
            <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
          </Pressable>

          <Text className="text-3xl font-semibold text-foreground tracking-tight">
            Choose Category
          </Text>
          <Text className="text-muted mt-1">
            Language: <Text className="text-foreground font-medium">{languageLabel ?? "Mandarin Chinese"}</Text>
          </Text>
        </View>

        <ScrollView
          className="flex-1 px-6"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 16 }}
        >
          <View className="flex-row flex-wrap gap-3">
            {topics.map((topic) => {
              const isSelected = selectedTopic === topic.id;
              return (
                <Pressable
                  key={topic.id}
                  onPress={() => setSelectedTopic(topic.id)}
                  className={`rounded-2xl p-4 border-2 ${
                    isSelected
                      ? "bg-accent border-primary"
                      : "bg-card border-transparent"
                  }`}
                  style={{
                    width: "47.5%",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1,
                  }}
                >
                  <View
                    className={`w-10 h-10 rounded-xl items-center justify-center mb-3 ${
                      isSelected ? "bg-primary" : "bg-secondary"
                    }`}
                  >
                    <Ionicons
                      name={topic.icon}
                      size={20}
                      color={isSelected ? "#FFFFFF" : "#1A1A1A"}
                    />
                  </View>
                  <Text className="text-foreground font-medium mb-0.5">
                    {topic.title}
                  </Text>
                  <Text className="text-xs text-muted leading-snug">
                    {topic.description}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <View className="p-6 pt-3">
          <Pressable
            onPress={handleGenerateLesson}
            disabled={!selectedTopic}
            className={`py-4 rounded-2xl items-center ${
              selectedTopic ? "bg-primary" : "bg-secondary"
            }`}
            style={
              selectedTopic
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
                selectedTopic ? "text-primary-foreground" : "text-muted"
              }`}
            >
              Generate Lesson
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
