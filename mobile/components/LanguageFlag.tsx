import CountryFlag from "react-native-country-flag";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const LANGUAGE_TO_COUNTRY: Record<string, string> = {
  mandarin: "CN",
  chinese: "CN",
  japanese: "JP",
  spanish: "ES",
  french: "FR",
  korean: "KR",
  german: "DE",
  italian: "IT",
  portuguese: "PT",
  arabic: "SA",
  russian: "RU",
  hindi: "IN",
  dutch: "NL",
  swedish: "SE",
  norwegian: "NO",
  danish: "DK",
  finnish: "FI",
  polish: "PL",
  turkish: "TR",
  greek: "GR",
  hebrew: "IL",
  thai: "TH",
  vietnamese: "VN",
  indonesian: "ID",
  malay: "MY",
  ukrainian: "UA",
  czech: "CZ",
  romanian: "RO",
  hungarian: "HU",
};

const SIZES = {
  sm: { flag: 12, radius: 2 },
  lg: { flag: 18, radius: 4 },
};

export function LanguageFlag({ name, size = "sm" }: { name: string; size?: "sm" | "lg" }) {
  const lower = (name ?? "").toLowerCase();
  const { flag, radius } = SIZES[size];

  const countryCode = Object.entries(LANGUAGE_TO_COUNTRY).find(([key]) =>
    lower.includes(key)
  )?.[1];

  if (!countryCode) {
    return (
      <View style={{ width: flag, height: flag * 0.67, borderRadius: radius, backgroundColor: "#E5E7EB", alignItems: "center", justifyContent: "center" }}>
        <Ionicons name="globe-outline" size={flag * 0.55} color="#6B7280" />
      </View>
    );
  }

  return (
    <CountryFlag
      isoCode={countryCode}
      size={flag}
      style={{ borderRadius: radius }}
    />
  );
}
