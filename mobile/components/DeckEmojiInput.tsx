import { useRef } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

function firstGrapheme(value: string): string {
  if (!value) return "";

  if (typeof Intl !== "undefined" && typeof Intl.Segmenter !== "undefined") {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    const [firstSegment] = segmenter.segment(value.trim());
    return firstSegment?.segment ?? "";
  }

  return Array.from(value.trim())[0] ?? "";
}

type DeckEmojiInputProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
};

export function DeckEmojiInput({ value, onChange, disabled = false }: DeckEmojiInputProps) {
  const inputRef = useRef<TextInput>(null);

  return (
    <View className="mb-5">
      <Pressable
        onPress={() => inputRef.current?.focus()}
        disabled={disabled}
        className="bg-card border border-border rounded-2xl px-4 py-4 flex-row items-center justify-between"
      >
        <View className="flex-row items-center gap-3">
          <View className="w-14 h-14 rounded-2xl border border-border bg-secondary items-center justify-center">
            <Text style={{ fontSize: 28 }}>{value || "😀"}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium text-foreground">
              {value ? "Deck icon" : "Choose an emoji"}
            </Text>
            <Text className="text-xs text-muted mt-1">
              Tap to type a single emoji with your keyboard.
            </Text>
          </View>
        </View>

        {value ? (
          <Pressable
            onPress={() => onChange(null)}
            disabled={disabled}
            hitSlop={8}
            className="w-9 h-9 rounded-full bg-secondary items-center justify-center"
          >
            <Text className="text-base text-muted">×</Text>
          </Pressable>
        ) : null}

        <TextInput
          ref={inputRef}
          value={value ?? ""}
          onChangeText={(nextValue) => {
            const emoji = firstGrapheme(nextValue);
            onChange(emoji || null);
          }}
          placeholder="😀"
          autoCapitalize="none"
          autoCorrect={false}
          caretHidden
          contextMenuHidden
          maxLength={8}
          editable={!disabled}
          className="absolute opacity-0 w-px h-px"
        />
      </Pressable>
    </View>
  );
}
