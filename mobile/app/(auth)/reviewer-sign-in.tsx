import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "../../lib/auth-context";

export default function ReviewerSignIn() {
  const { signInWithPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setError(null);
    setLoading(true);
    const result = await signInWithPassword(email, password);
    setLoading(false);
    if (result.error) setError(result.error);
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 max-w-md w-full mx-auto px-6 pt-20">
          <Pressable onPress={() => router.back()} className="mb-8">
            <Text className="text-primary font-medium">Back</Text>
          </Pressable>

          <Text className="text-3xl font-semibold text-foreground mb-2">App reviewer sign-in</Text>
          <Text className="text-muted mb-8">
            Use the permanent review credentials supplied with the store submission.
          </Text>

          <TextInput
            className="bg-card border border-border rounded-2xl px-4 py-4 text-foreground mb-3"
            placeholder="Review account email"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="username"
            value={email}
            onChangeText={(value) => { setEmail(value); setError(null); }}
          />
          <TextInput
            className="bg-card border border-border rounded-2xl px-4 py-4 text-foreground mb-3"
            placeholder="Password"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            textContentType="password"
            value={password}
            onChangeText={(value) => { setPassword(value); setError(null); }}
            onSubmitEditing={handleSignIn}
            returnKeyType="go"
          />

          {error && <Text className="text-red-500 text-sm mb-3 text-center">{error}</Text>}

          <Pressable
            onPress={handleSignIn}
            disabled={loading}
            className="py-4 rounded-2xl items-center bg-primary"
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text className="text-primary-foreground font-semibold text-base">Sign in</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
