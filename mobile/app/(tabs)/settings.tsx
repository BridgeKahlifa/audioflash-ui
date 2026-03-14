import { useEffect, useRef, useState } from "react";
import {
  Animated,
  ScrollView,
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../lib/auth-context";
import { ApiUpdateProfile, ApiLanguage, fetchLanguages } from "../../lib/api";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function SectionLabel({ children }: { children: string }) {
  return <Text className="text-xs text-muted font-medium uppercase tracking-wide mb-2 mt-5 px-1">{children}</Text>;
}

function LanguagePickerModal({
  visible,
  languages,
  selectedIds,
  multiSelect = false,
  onToggle,
  onClose,
}: {
  visible: boolean;
  languages: ApiLanguage[];
  selectedIds: string[];
  multiSelect?: boolean;
  onToggle: (id: string) => void;
  onClose: () => void;
}) {
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
  }, [visible]);

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

export default function SettingsScreen() {
  const { user, profile, profileLoading, updateProfileData, updateEmail, deleteAccount, signOut } = useAuth();

  const [localSettings, setLocalSettings] = useState<ApiUpdateProfile>({
    cards_per_session: profile?.cards_per_session ?? 20,
    audio_speed: profile?.audio_speed ?? 1.0,
    notifications_enabled: profile?.notifications_enabled ?? false,
  });
  const [name, setName] = useState(profile?.name ?? "");
  const [nameStatus, setNameStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [email, setEmail] = useState(user?.email ?? "");
  const [emailStatus, setEmailStatus] = useState<"idle" | "saving" | "sent" | "error">("idle");
  const [languages, setLanguages] = useState<ApiLanguage[]>([]);
  const [nativeLanguageId, setNativeLanguageId] = useState<string | null>(
    profile?.native_language_id ? String(profile.native_language_id) : null
  );
  const [targetLanguageIds, setTargetLanguageIds] = useState<string[]>(
    profile?.target_language_ids?.map(String) ?? []
  );
  const [showNativePicker, setShowNativePicker] = useState(false);
  const [showTargetPicker, setShowTargetPicker] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchLanguages().then(setLanguages).catch(() => { });
  }, []);

  useEffect(() => {
    if (!profile) return;
    setLocalSettings({
      cards_per_session: profile.cards_per_session,
      audio_speed: profile.audio_speed,
      notifications_enabled: profile.notifications_enabled,
    });
    setName(profile.name ?? "");
    setNativeLanguageId(profile.native_language_id ? String(profile.native_language_id) : null);
    setTargetLanguageIds(profile.target_language_ids?.map(String) ?? []);
  }, [profile]);

  useEffect(() => {
    const newEmail = user?.email ?? "";
    // Only update if the email actually changed to avoid unnecessary re-renders
    setEmail((prevEmail) => {
      if (prevEmail === newEmail) {
        return prevEmail;
      }
      return newEmail;
    });
    // Reset email status when the underlying user email changes
    setEmailStatus("idle");
  }, [user?.email]);

  if (profileLoading) {
    return (
      <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#FF6B4A" />
        </View>
      </SafeAreaView>
    );
  }

  async function saveSettings() {
    const { error } = await updateProfileData(localSettings);
    if (!error) { setSaved(true); setTimeout(() => setSaved(false), 1600); }
  }

  async function saveName() {
    setNameStatus("saving");
    const { error } = await updateProfileData({ name });
    setNameStatus(error ? "error" : "saved");
    setTimeout(() => setNameStatus("idle"), 2000);
  }

  async function saveEmail() {
    setEmailStatus("saving");
    const { error } = await updateEmail(email);
    if (error) {
      setEmailStatus("error");
      setTimeout(() => setEmailStatus("idle"), 2000);
    } else {
      setEmailStatus("sent");
    }
  }

  async function saveNativeLanguage(id: string) {
    const previousId = nativeLanguageId;
    setNativeLanguageId(id);
    const { error } = await updateProfileData({ native_language_id: id });
    if (error) {
      setNativeLanguageId(previousId);
      Alert.alert("Error", error);
    }
  }

  async function toggleTargetLanguage(id: string) {
    const previousTargetLanguageIds = targetLanguageIds;
    const updated = targetLanguageIds.includes(id)
      ? targetLanguageIds.filter((l) => l !== id)
      : [...targetLanguageIds, id];
    setTargetLanguageIds(updated);
    const { error } = await updateProfileData({ target_language_ids: updated });
    if (error) {
      setTargetLanguageIds(previousTargetLanguageIds);
      Alert.alert("Error", error);
    }
  }

  function confirmDelete() {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all your data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await deleteAccount();
            if (error) Alert.alert("Error", error);
          },
        },
      ]
    );
  }

  const nativeLanguageName = nativeLanguageId
    ? (languages.find((l) => String(l.id) === nativeLanguageId)?.language ?? "Select...")
    : "Select...";

  const targetLanguagesLabel = targetLanguageIds.length === 0
    ? "Select..."
    : targetLanguageIds
      .map((id) => languages.find((l) => String(l.id) === id)?.language)
      .filter(Boolean)
      .join(", ");

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
      <View className="flex-1 max-w-md w-full mx-auto">
        <View className="px-6 pt-6 pb-4">
          <Text className="text-2xl font-semibold text-foreground">Settings</Text>
        </View>

        <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 32 }}>

          {/* ── Profile ── */}
          <SectionLabel>Profile</SectionLabel>
          <View className="bg-card border border-border rounded-2xl p-4 gap-3">
            <View>
              <Text className="text-xs text-muted mb-1">Name</Text>
              <View className="relative">
                <TextInput
                  value={name}
                  onChangeText={(v) => { setName(v); setNameStatus("idle"); }}
                  onSubmitEditing={saveName}
                  placeholder="Your name"
                  placeholderTextColor="#9CA3AF"
                  returnKeyType="done"
                  className="bg-secondary rounded-xl px-3 py-2.5 text-foreground pr-9"
                />
                <View className="absolute right-3 top-0 bottom-0 items-center justify-center">
                  {nameStatus === "saving" && <ActivityIndicator size="small" color="#FF6B4A" />}
                  {nameStatus === "saved" && <Ionicons name="checkmark-circle" size={18} color="#22C55E" />}
                  {nameStatus === "error" && <Ionicons name="alert-circle" size={18} color="#EF4444" />}
                </View>
              </View>
            </View>

            <View className="border-t border-border pt-3">
              <Text className="text-xs text-muted mb-1">Email</Text>
              <View className="relative">
                <TextInput
                  value={email}
                  onChangeText={(v) => { setEmail(v); setEmailStatus("idle"); }}
                  onSubmitEditing={saveEmail}
                  placeholder="Email address"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="done"
                  className="bg-secondary rounded-xl px-3 py-2.5 text-foreground pr-9"
                />
                <View className="absolute right-3 top-0 bottom-0 items-center justify-center">
                  {emailStatus === "saving" && <ActivityIndicator size="small" color="#FF6B4A" />}
                  {emailStatus === "sent" && <Ionicons name="checkmark-circle" size={18} color="#22C55E" />}
                  {emailStatus === "error" && <Ionicons name="alert-circle" size={18} color="#EF4444" />}
                </View>
              </View>
              {emailStatus === "sent" && (
                <Text className="text-xs text-muted mt-1.5">Check your inbox to confirm the new email.</Text>
              )}
            </View>
          </View>

          {/* ── Languages ── */}
          <SectionLabel>Languages</SectionLabel>
          <View className="bg-card border border-border rounded-2xl overflow-hidden">
            <Pressable
              onPress={() => setShowNativePicker(true)}
              className="flex-row items-center justify-between p-4 border-b border-border"
            >
              <View className="flex-1 mr-3">
                <Text className="text-xs text-muted mb-0.5">Native Language</Text>
                <Text className="text-foreground font-medium">{nativeLanguageName}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </Pressable>
            <Pressable
              onPress={() => setShowTargetPicker(true)}
              className="flex-row items-center justify-between p-4"
            >
              <View className="flex-1 mr-3">
                <Text className="text-xs text-muted mb-0.5">Learning</Text>
                <Text className="text-foreground font-medium" numberOfLines={2}>{targetLanguagesLabel}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </Pressable>
          </View>

          {/* ── Practice ── */}
          <SectionLabel>Practice</SectionLabel>
          <View className="bg-card border border-border rounded-2xl p-5 gap-4">
            <View>
              <Text className="text-foreground font-medium mb-3">Cards Per Session</Text>
              <View className="flex-row items-center justify-between">
                <Pressable
                  onPress={() => setLocalSettings((p) => ({ ...p, cards_per_session: clamp((p.cards_per_session ?? 20) - 5, 5, 50) }))}
                  className="w-10 h-10 rounded-full bg-secondary items-center justify-center"
                >
                  <Ionicons name="remove" size={20} color="#1A1A1A" />
                </Pressable>
                <Text className="text-2xl font-semibold text-foreground">{localSettings.cards_per_session}</Text>
                <Pressable
                  onPress={() => setLocalSettings((p) => ({ ...p, cards_per_session: clamp((p.cards_per_session ?? 20) + 5, 5, 50) }))}
                  className="w-10 h-10 rounded-full bg-secondary items-center justify-center"
                >
                  <Ionicons name="add" size={20} color="#1A1A1A" />
                </Pressable>
              </View>
            </View>

            <View className="border-t border-border pt-4">
              <Text className="text-foreground font-medium mb-3">Audio Speed</Text>
              <View className="flex-row items-center justify-between">
                <Pressable
                  onPress={() => setLocalSettings((p) => ({ ...p, audio_speed: clamp(Number(((p.audio_speed ?? 1.0) - 0.1).toFixed(1)), 0.5, 1.5) }))}
                  className="w-10 h-10 rounded-full bg-secondary items-center justify-center"
                >
                  <Ionicons name="remove" size={20} color="#1A1A1A" />
                </Pressable>
                <Text className="text-2xl font-semibold text-foreground">{(localSettings.audio_speed ?? 1.0).toFixed(1)}x</Text>
                <Pressable
                  onPress={() => setLocalSettings((p) => ({ ...p, audio_speed: clamp(Number(((p.audio_speed ?? 1.0) + 0.1).toFixed(1)), 0.5, 1.5) }))}
                  className="w-10 h-10 rounded-full bg-secondary items-center justify-center"
                >
                  <Ionicons name="add" size={20} color="#1A1A1A" />
                </Pressable>
              </View>
            </View>

            <View className="border-t border-border pt-4">
              <Text className="text-foreground font-medium mb-3">Reminders</Text>
              <Pressable
                onPress={() => setLocalSettings((p) => ({ ...p, notifications_enabled: !p.notifications_enabled }))}
                className={`py-3 rounded-xl items-center ${localSettings.notifications_enabled ? "bg-primary" : "bg-secondary"}`}
              >
                <Text className={localSettings.notifications_enabled ? "text-primary-foreground font-semibold" : "text-foreground font-medium"}>
                  {localSettings.notifications_enabled ? "Enabled" : "Disabled"}
                </Text>
              </Pressable>
            </View>
          </View>

          <Pressable onPress={saveSettings} className="py-4 rounded-2xl items-center bg-primary mt-3">
            <Text className="text-primary-foreground font-semibold">Save Settings</Text>
          </Pressable>
          {saved && <Text className="text-center text-muted mt-2 text-sm">Saved</Text>}

          {/* ── Account ── */}
          <SectionLabel>Account</SectionLabel>
          <View className="bg-card border border-border rounded-2xl overflow-hidden">
            <View className="p-4 border-b border-border">
              <Text className="text-xs text-muted mb-0.5">Signed in as</Text>
              <Text className="text-foreground font-medium">{user?.email}</Text>
            </View>
            <Pressable
              onPress={signOut}
              className="flex-row items-center gap-2 p-4 border-b border-border"
            >
              <Ionicons name="log-out-outline" size={18} color="#6B7280" />
              <Text className="text-foreground font-medium">Sign Out</Text>
            </Pressable>
            <Pressable onPress={confirmDelete} className="flex-row items-center gap-2 p-4">
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
              <Text className="text-red-500 font-medium">Delete Account</Text>
            </Pressable>
          </View>

        </ScrollView>
      </View>

      <LanguagePickerModal
        visible={showNativePicker}
        languages={languages}
        selectedIds={nativeLanguageId ? [nativeLanguageId] : []}
        onToggle={saveNativeLanguage}
        onClose={() => setShowNativePicker(false)}
      />
      <LanguagePickerModal
        visible={showTargetPicker}
        languages={languages}
        selectedIds={targetLanguageIds}
        multiSelect
        onToggle={toggleTargetLanguage}
        onClose={() => setShowTargetPicker(false)}
      />
    </SafeAreaView>
  );
}
