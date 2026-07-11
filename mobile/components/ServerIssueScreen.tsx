import { ActivityIndicator, Pressable, Text, View } from "react-native";

interface ServerIssueScreenProps {
  title?: string;
  message: string;
  details?: string | null;
  retryLabel?: string;
  retrying?: boolean;
  onRetry?: () => void;
}

export function ServerIssueScreen({
  title = "Server Issue",
  message,
  details,
  retryLabel = "Try Again",
  retrying = false,
  onRetry,
}: ServerIssueScreenProps) {
  return (
    <View style={{ flex: 1, backgroundColor: "#fff7ed", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <View style={{ width: "100%", maxWidth: 380, backgroundColor: "#ffffff", borderRadius: 24, padding: 24 }}>
        <Text style={{ fontSize: 24, fontWeight: "700", color: "#111827", marginBottom: 10 }}>
          {title}
        </Text>
        <Text style={{ fontSize: 15, lineHeight: 22, color: "#4b5563", marginBottom: 12 }}>
          {message}
        </Text>
        {details ? (
          <Text style={{ fontSize: 13, lineHeight: 20, color: "#9a3412", marginBottom: onRetry ? 18 : 0 }}>
            {details}
          </Text>
        ) : null}
        {onRetry ? (
          <Pressable
            onPress={onRetry}
            disabled={retrying}
            style={{
              minHeight: 48,
              borderRadius: 16,
              backgroundColor: retrying ? "#fdba74" : "#FF6B4A",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
            }}
          >
            {retrying ? <ActivityIndicator color="#ffffff" /> : null}
            <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "700" }}>
              {retrying ? "Retrying..." : retryLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
