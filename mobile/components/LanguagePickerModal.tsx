import { useEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ApiLanguage } from "../lib/api";

type LanguagePickerModalProps = {
  visible: boolean;
  languages: ApiLanguage[];
  selectedIds: string[];
  multiSelect?: boolean;
  onToggle: (id: string) => void;
  onClose: () => void;
};

export function LanguagePickerModal({
  visible,
  languages,
  selectedIds,
  multiSelect = false,
  onToggle,
  onClose,
}: LanguagePickerModalProps) {
  const translateY = useRef(new Animated.Value(400)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 280, mass: 0.8 }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 400, duration: 160, useNativeDriver: true }),
      ]).start(() => setModalVisible(false));
    }
  }, [opacity, translateY, visible]);

  return (
    <Modal visible={modalVisible} animationType="none" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, overflow: "hidden" }}>
        <Animated.View style={{ flex: 1, opacity }}>
          <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} onPress={onClose} />
        </Animated.View>
        <Animated.View style={{ transform: [{ translateY }], maxHeight: 420 }} className="bg-background rounded-t-3xl p-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-semibold text-foreground">Select Language</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {languages.map((lang) => {
              const isSelected = selectedIds.includes(String(lang.id));
              return (
                <Pressable
                  key={String(lang.id)}
                  onPress={() => {
                    onToggle(String(lang.id));
                    if (!multiSelect) onClose();
                  }}
                  className={`flex-row items-center justify-between py-3 px-4 rounded-xl mb-2 ${isSelected ? "bg-accent border border-primary" : "bg-secondary"}`}
                >
                  <Text className="text-foreground font-medium">{lang.language}</Text>
                  {isSelected && <Ionicons name="checkmark" size={18} color="#FF6B4A" />}
                </Pressable>
              );
            })}
          </ScrollView>
          {multiSelect && (
            <Pressable onPress={onClose} className="py-3 rounded-xl items-center bg-primary mt-3">
              <Text className="text-primary-foreground font-semibold">Done</Text>
            </Pressable>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}
