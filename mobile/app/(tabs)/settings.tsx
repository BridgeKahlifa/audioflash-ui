import { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import Constants from "expo-constants";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, usePreventRemove } from "@react-navigation/native";
import { useAuth } from "../../lib/auth-context";
import { ApiUpdateProfile } from "../../lib/api";
import { useAnalytics } from "../../lib/analytics";
import { useLanguages } from "../../lib/queries";
import { useAppTheme } from "../../lib/theme-context";
import { AuthModeSettingsCard } from "../../components/AuthModeBadge";
import { LanguagePickerModal } from "../../components/LanguagePickerModal";
import { getSettings, setSettings } from "../../lib/storage";
import { DEFAULT_FLASHCARD_DISPLAY_MODE, normalizeFlashcardDisplayMode } from "../../lib/flashcard-display-mode";
import type { FlashcardDisplayMode } from "../../lib/types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function SectionLabel({ children }: { children: string }) {
  const { fontFamily } = useAppTheme();
  return <Text className="text-xs text-muted font-medium uppercase tracking-wide mb-2 mt-5 px-1" style={{ fontFamily }}>{children}</Text>;
}

export default function SettingsScreen() {
  const { user, profile, profileLoading, updateProfileData, updateEmail, deleteAccount, signOut, isDevAuth } = useAuth();
  const { data: languages = [] } = useLanguages();
  const posthog = useAnalytics();
  const navigation = useNavigation();
  const { matrixMode, setMatrixMode, fontFamily } = useAppTheme();
  const [errorMessage, setErrorMessage] = useState("");

  const [localSettings, setLocalSettings] = useState<ApiUpdateProfile>({
    cards_per_session: profile?.cards_per_session ?? 20,
    audio_speed: profile?.audio_speed ?? 1.0,
    notifications_enabled: profile?.notifications_enabled ?? false,
  });
  const [name, setName] = useState(profile?.name ?? "");
  const [nameStatus, setNameStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [email, setEmail] = useState(user?.email ?? "");
  const [emailStatus, setEmailStatus] = useState<"idle" | "saving" | "sent" | "error">("idle");
  const [targetLanguageIds, setTargetLanguageIds] = useState<string[]>(
    profile?.target_language_ids?.slice(0, 1).map(String) ?? []
  );
  const [showTargetPicker, setShowTargetPicker] = useState(false);
  const [saved, setSaved] = useState(false);
  const [defaultDisplayMode, setDefaultDisplayMode] = useState<FlashcardDisplayMode>(
    DEFAULT_FLASHCARD_DISPLAY_MODE,
  );
  const appVersion = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? "unknown";
  const buildVersion = Constants.nativeBuildVersion;
  const versionLabel = buildVersion ? `Version ${appVersion} (${buildVersion})` : `Version ${appVersion}`;

  const normalizedProfileName = profile?.name ?? "";
  const normalizedProfileEmail = user?.email ?? "";
  const normalizedProfileCards = profile?.cards_per_session ?? 20;
  const normalizedProfileAudioSpeed = profile?.audio_speed ?? 1.0;
  const normalizedProfileNotifications = profile?.notifications_enabled ?? false;

  const hasUnsavedChanges =
    name !== normalizedProfileName ||
    email !== normalizedProfileEmail ||
    (localSettings.cards_per_session ?? 20) !== normalizedProfileCards ||
    (localSettings.audio_speed ?? 1.0) !== normalizedProfileAudioSpeed ||
    (localSettings.notifications_enabled ?? false) !== normalizedProfileNotifications;

  useEffect(() => {
    setLocalSettings({
      cards_per_session: profile?.cards_per_session ?? 20,
      audio_speed: profile?.audio_speed ?? 1.0,
      notifications_enabled: profile?.notifications_enabled ?? false,
    });
    setName(profile?.name ?? "");
    setTargetLanguageIds(profile?.target_language_ids?.slice(0, 1).map(String) ?? []);
  }, [profile]);

  useEffect(() => {
    const newEmail = user?.email ?? "";
    // Only update if the email actually changed to avoid unnecessary re-renders
    setEmail((prevEmail: string) => {
      if (prevEmail === newEmail) {
        return prevEmail;
      }
      return newEmail;
    });
    // Reset email status when the underlying user email changes
    setEmailStatus("idle");
  }, [user?.email]);

  useEffect(() => {
    if (profile?.default_display_mode) {
      setDefaultDisplayMode(normalizeFlashcardDisplayMode(profile.default_display_mode));
    }
  }, [profile?.default_display_mode]);

  async function saveDefaultDisplayMode(mode: FlashcardDisplayMode) {
    setDefaultDisplayMode(mode);
    const current = await getSettings();
    await setSettings({ ...current, defaultDisplayMode: mode });
    await updateProfileData({ default_display_mode: mode });
    posthog?.capture("settings_default_display_mode_changed", { mode });
  }

  async function saveSettings() {
    setErrorMessage("");
    const { error } = await updateProfileData(localSettings);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
      posthog?.capture("settings_practice_saved", {
        cards_per_session: localSettings.cards_per_session,
        audio_speed: localSettings.audio_speed,
        notifications_enabled: localSettings.notifications_enabled,
        matrix_mode: matrixMode,
      });
    } else {
      setErrorMessage("We couldn't save your settings right now. Please try again.");
    }
  }

  async function saveName() {
    setNameStatus("saving");
    setErrorMessage("");
    const { error } = await updateProfileData({ name });
    setNameStatus(error ? "error" : "saved");
    if (error) {
      setErrorMessage("We couldn't save your name right now. Please try again.");
    }
    setTimeout(() => setNameStatus("idle"), 2000);
  }

  async function saveEmail() {
    setEmailStatus("saving");
    setErrorMessage("");
    const { error } = await updateEmail(email);
    if (error) {
      setEmailStatus("error");
      setErrorMessage("We couldn't update your email right now. Please try again.");
      setTimeout(() => setEmailStatus("idle"), 2000);
    } else {
      setEmailStatus("sent");
    }
  }

  async function saveAllPendingChanges(): Promise<boolean> {
    if (name !== normalizedProfileName) {
      setNameStatus("saving");
      setErrorMessage("");
      const { error } = await updateProfileData({ name });
      if (error) {
        setNameStatus("error");
        setErrorMessage("We couldn't save your name right now. Please try again.");
        return false;
      }
      setNameStatus("saved");
      setTimeout(() => setNameStatus("idle"), 2000);
    }

    if (email !== normalizedProfileEmail) {
      setEmailStatus("saving");
      setErrorMessage("");
      const { error } = await updateEmail(email);
      if (error) {
        setEmailStatus("error");
        setErrorMessage("We couldn't update your email right now. Please try again.");
        return false;
      }
      setEmailStatus("sent");
    }

    if (
      (localSettings.cards_per_session ?? 20) !== normalizedProfileCards ||
      (localSettings.audio_speed ?? 1.0) !== normalizedProfileAudioSpeed ||
      (localSettings.notifications_enabled ?? false) !== normalizedProfileNotifications
    ) {
      setErrorMessage("");
      const { error } = await updateProfileData(localSettings);
      if (error) {
        setErrorMessage("We couldn't save your settings right now. Please try again.");
        return false;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
      posthog?.capture("settings_practice_saved", {
        cards_per_session: localSettings.cards_per_session,
        audio_speed: localSettings.audio_speed,
        notifications_enabled: localSettings.notifications_enabled,
        matrix_mode: matrixMode,
      });
    }

    return true;
  }

  async function selectTargetLanguage(id: string) {
    const previousTargetLanguageIds = targetLanguageIds;
    const updated = [id];
    setTargetLanguageIds(updated);
    setErrorMessage("");
    const { error } = await updateProfileData({ target_language_ids: updated });
    if (error) {
      setTargetLanguageIds(previousTargetLanguageIds);
      setErrorMessage("We couldn't save your language selection right now. Please try again.");
    } else {
      const lang = languages.find((l) => String(l.id) === id);
      posthog?.capture("settings_target_language_selected", { language: lang?.language ?? "unknown" });
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
            if (error) {
              Alert.alert("Error", error);
            } else {
              posthog?.capture("account_deleted");
            }
          },
        },
      ]
    );
  }

  const targetLanguageLabel = targetLanguageIds.length === 0
    ? "Select..."
    : targetLanguageIds
      .map((id) => languages.find((l) => String(l.id) === id)?.language)
      .filter(Boolean)
      .join("");

  usePreventRemove(hasUnsavedChanges, (event) => {
    if (typeof event.preventDefault !== "function") return;
    event.preventDefault();

    Alert.alert(
      "Save changes?",
      "You have unsaved profile changes. Do you want to save them before leaving?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => navigation.dispatch(event.data.action),
        },
        {
          text: "Save",
          onPress: async () => {
            const didSave = await saveAllPendingChanges();
            if (didSave) {
              navigation.dispatch(event.data.action);
            }
          },
        },
      ],
    );
  });

  useEffect(() => {
    const parent = navigation.getParent();
    if (!parent) return;

    const unsubscribe = parent.addListener("tabPress", (event) => {
      if (!hasUnsavedChanges) return;

      const targetRoute = parent
        .getState()
        .routes.find((route) => route.key === event.target);

      if (!targetRoute || targetRoute.name === "settings") return;

      event.preventDefault();

      Alert.alert(
        "Save changes?",
        "You have unsaved profile changes. Do you want to save them before leaving?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => parent.navigate(targetRoute.name),
          },
          {
            text: "Save",
            onPress: async () => {
              const didSave = await saveAllPendingChanges();
              if (didSave) {
                parent.navigate(targetRoute.name);
              }
            },
          },
        ],
      );
    });

    return unsubscribe;
  }, [hasUnsavedChanges, navigation, name, email, localSettings, profile, user]);

  if (profileLoading) {
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
      <View className="flex-1 max-w-md w-full mx-auto">
        <View className="px-6 pt-6 pb-4">
          <Text className="text-2xl font-semibold text-foreground" style={{ fontFamily }}>Settings</Text>
        </View>

        <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 32 }}>
          {errorMessage ? (
            <View className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-4">
              <Text className="text-red-600 text-sm" style={{ fontFamily }}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* ── Profile ── */}
          <SectionLabel>Profile</SectionLabel>
          <View className="bg-card border border-border rounded-2xl p-4 gap-3">
            <View>
              <Text className="text-xs text-muted mb-1" style={{ fontFamily }}>Name</Text>
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
              <Text className="text-xs text-muted mb-1" style={{ fontFamily }}>Email</Text>
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
                  editable={!isDevAuth}
                />
                <View className="absolute right-3 top-0 bottom-0 items-center justify-center">
                  {emailStatus === "saving" && <ActivityIndicator size="small" color="#FF6B4A" />}
                  {emailStatus === "sent" && <Ionicons name="checkmark-circle" size={18} color="#22C55E" />}
                  {emailStatus === "error" && <Ionicons name="alert-circle" size={18} color="#EF4444" />}
                </View>
              </View>
              {emailStatus === "sent" && (
                <Text className="text-xs text-muted mt-1.5" style={{ fontFamily }}>Check your inbox to confirm the new email.</Text>
              )}
              {isDevAuth && (
                <Text className="text-xs text-muted mt-1.5" style={{ fontFamily }}>
                  Dev auth mode is active, so account email changes are disabled.
                </Text>
              )}
            </View>
          </View>

          {/* ── Languages ── */}
          <SectionLabel>Languages</SectionLabel>
          <View className="bg-card border border-border rounded-2xl overflow-hidden">
            <Pressable
              onPress={() => setShowTargetPicker(true)}
              className="flex-row items-center justify-between p-4"
            >
              <View className="flex-1 mr-3">
                <Text className="text-xs text-muted mb-0.5" style={{ fontFamily }}>Learning</Text>
                <Text className="text-foreground font-medium" numberOfLines={2} style={{ fontFamily }}>{targetLanguageLabel}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </Pressable>
          </View>

          {/* ── Practice ── */}
          <SectionLabel>Practice</SectionLabel>
          <View className="bg-card border border-border rounded-2xl p-5 gap-5">
            <View>
              <Text className="text-foreground font-medium mb-3" style={{ fontFamily }}>Cards Per Session</Text>
              <View className="flex-row items-center justify-between">
                <Pressable
                  onPress={() => setLocalSettings((p) => ({ ...p, cards_per_session: clamp((p.cards_per_session ?? 20) - 5, 5, 50) }))}
                  className="w-10 h-10 rounded-full bg-secondary items-center justify-center"
                >
                  <Ionicons name="remove" size={20} color="#1A1A1A" />
                </Pressable>
                <Text className="text-2xl font-semibold text-foreground" style={{ fontFamily }}>{localSettings.cards_per_session}</Text>
                <Pressable
                  onPress={() => setLocalSettings((p) => ({ ...p, cards_per_session: clamp((p.cards_per_session ?? 20) + 5, 5, 50) }))}
                  className="w-10 h-10 rounded-full bg-secondary items-center justify-center"
                >
                  <Ionicons name="add" size={20} color="#1A1A1A" />
                </Pressable>
              </View>
            </View>

            <View className="border-t border-border pt-5">
              <Text className="text-foreground font-medium mb-3" style={{ fontFamily }}>Default Lesson Mode</Text>
              <View className="gap-2">
                <Pressable
                  onPress={() => void saveDefaultDisplayMode("audio-first")}
                  className={`flex-row items-center gap-3 rounded-2xl border px-4 py-3 ${
                    defaultDisplayMode === "audio-first" ? "bg-accent border-primary" : "bg-secondary border-transparent"
                  }`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: defaultDisplayMode === "audio-first" }}
                >
                  <View
                    className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                      defaultDisplayMode === "audio-first" ? "border-primary bg-primary" : "border-muted bg-background"
                    }`}
                  >
                    {defaultDisplayMode === "audio-first" ? (
                      <View className="w-2 h-2 rounded-full bg-white" />
                    ) : null}
                  </View>
                  <View className="flex-1">
                    <Text className="text-foreground font-medium text-sm" style={{ fontFamily }}>Audio only</Text>
                    <Text className="text-muted text-xs mt-0.5" style={{ fontFamily }}>
                      Hear the audio first, then reveal the written answer.
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => void saveDefaultDisplayMode("traditional")}
                  className={`flex-row items-center gap-3 rounded-2xl border px-4 py-3 ${
                    defaultDisplayMode === "traditional" ? "bg-accent border-primary" : "bg-secondary border-transparent"
                  }`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: defaultDisplayMode === "traditional" }}
                >
                  <View
                    className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                      defaultDisplayMode === "traditional" ? "border-primary bg-primary" : "border-muted bg-background"
                    }`}
                  >
                    {defaultDisplayMode === "traditional" ? (
                      <View className="w-2 h-2 rounded-full bg-white" />
                    ) : null}
                  </View>
                  <View className="flex-1">
                    <Text className="text-foreground font-medium text-sm" style={{ fontFamily }}>Traditional flashcards</Text>
                    <Text className="text-muted text-xs mt-0.5" style={{ fontFamily }}>
                      Read the card text and flip to reveal the answer.
                    </Text>
                  </View>
                </Pressable>
              </View>
            </View>
          </View>

          <SectionLabel>Appearance</SectionLabel>
          <View className="bg-card border border-border rounded-2xl overflow-hidden">
            <Pressable
              onPress={async () => {
                const nextValue = !matrixMode;
                await setMatrixMode(nextValue);
                posthog?.capture("settings_matrix_mode_toggled", { matrix_mode: nextValue });
              }}
              className="flex-row items-center justify-between p-4"
            >
              <View className="flex-1 mr-4">
                <Text className="text-foreground font-medium" style={{ fontFamily }}>Matrix Mode</Text>
                <Text className="text-xs text-muted mt-1" style={{ fontFamily }}>
                  Pure black surfaces with orange accents and animated rain on supported screens.
                </Text>
              </View>
              <View className={`h-8 w-14 rounded-full px-1 justify-center ${matrixMode ? "bg-primary" : "bg-secondary"}`}>
                <View className={`h-6 w-6 rounded-full ${matrixMode ? "bg-black self-end" : "bg-white self-start"}`} />
              </View>
            </Pressable>
          </View>

          {/*
          <SectionLabel>Reminders</SectionLabel>
          <View className="bg-card border border-border rounded-2xl p-5">
            <Text className="text-foreground font-medium mb-3">Practice Reminders</Text>
            <Pressable
              onPress={() => setLocalSettings((p) => ({ ...p, notifications_enabled: !p.notifications_enabled }))}
              className={`py-3 rounded-xl items-center ${localSettings.notifications_enabled ? "bg-primary" : "bg-secondary"}`}
            >
              <Text className={localSettings.notifications_enabled ? "text-primary-foreground font-semibold" : "text-foreground font-medium"}>
                {localSettings.notifications_enabled ? "Enabled" : "Disabled"}
              </Text>
            </Pressable>
          </View>
          */}

          <Pressable onPress={saveSettings} className="py-4 rounded-2xl items-center bg-primary mt-3">
            <Text className="text-primary-foreground font-semibold" style={{ fontFamily }}>Save Settings</Text>
          </Pressable>
          {saved && <Text className="text-center text-muted mt-2 text-sm" style={{ fontFamily }}>Saved</Text>}

          <SectionLabel>Environment</SectionLabel>
          <AuthModeSettingsCard />

          {/* ── Account ── */}
          <SectionLabel>Account</SectionLabel>
          <View className="bg-card border border-border rounded-2xl overflow-hidden">
            <View className="p-4 border-b border-border">
              <Text className="text-xs text-muted mb-0.5" style={{ fontFamily }}>Signed in as</Text>
              <Text className="text-foreground font-medium" style={{ fontFamily }}>{user?.email ?? "Dev user"}</Text>
            </View>
            {isDevAuth ? (
              <View className="p-4">
                <Text className="text-xs text-muted" style={{ fontFamily }}>
                  Dev auth mode is active. Sign out and account deletion are disabled.
                </Text>
              </View>
            ) : (
              <>
                <Pressable
                  onPress={() => { posthog?.capture("auth_signed_out"); signOut(); }}
                  className="flex-row items-center gap-2 p-4 border-b border-border"
                >
                  <Ionicons name="log-out-outline" size={18} color="#6B7280" />
                  <Text className="text-foreground font-medium" style={{ fontFamily }}>Sign Out</Text>
                </Pressable>
                <Pressable
                  onPress={async () => {
                    const url = "mailto:support@audioflash.ai";
                    const canOpen = await Linking.canOpenURL(url);
                    if (canOpen) {
                      Linking.openURL(url);
                    } else {
                      Alert.alert("Contact Support", "Email us at support@audioflash.ai");
                    }
                  }}
                  className="flex-row items-center gap-2 p-4 border-b border-border"
                >
                  <Ionicons name="mail-outline" size={18} color="#6B7280" />
                  <Text className="text-foreground font-medium" style={{ fontFamily }}>Contact Support</Text>
                </Pressable>
                <Pressable onPress={confirmDelete} className="flex-row items-center gap-2 p-4">
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  <Text className="text-red-500 font-medium" style={{ fontFamily }}>Delete Account</Text>
                </Pressable>
              </>
            )}
          </View>
          <Text className="text-center text-xs text-muted mt-5" style={{ fontFamily }}>{versionLabel}</Text>

        </ScrollView>
      </View>

      <LanguagePickerModal
        visible={showTargetPicker}
        languages={languages}
        selectedIds={targetLanguageIds}
        onToggle={selectTargetLanguage}
        onClose={() => setShowTargetPicker(false)}
      />
    </SafeAreaView>
  );
}
