import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import EmojiPicker, { type EmojiType } from "rn-emoji-keyboard";
import { colors } from "@audioflash/shared";

type DeckEmojiInputProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
};

export function DeckEmojiInput({ value, onChange, disabled = false }: DeckEmojiInputProps) {
  const [open, setOpen] = useState(false);

  return (
    <View className="mb-5">
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        className="bg-card border border-border rounded-2xl px-4 py-4 flex-row items-center gap-3"
      >
        <View className="w-14 h-14 rounded-2xl border border-border bg-secondary items-center justify-center">
          <Text style={{ fontSize: 28 }}>{value || "😀"}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-sm font-medium text-foreground">
            {value ? "Deck icon" : "Choose an emoji"}
          </Text>
          <Text className="text-xs text-muted mt-1">
            Tap to pick an emoji for this deck.
          </Text>
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
      </Pressable>

      <EmojiPicker
        open={open}
        onClose={() => setOpen(false)}
        onEmojiSelected={(emoji: EmojiType) => {
          onChange(emoji.emoji);
          setOpen(false);
        }}
        enableSearchBar
        enableCategoryChangeAnimation={false}
        categoryPosition="bottom"
        theme={{
          backdrop: "#00000055",
          knob: colors.border,
          container: colors.card,
          header: colors.foreground,
          category: {
            icon: colors.muted,
            iconActive: colors.primary,
            container: colors.secondary,
            containerActive: colors.accent,
          },
          search: {
            text: colors.foreground,
            placeholder: colors.muted,
            icon: colors.muted,
            background: colors.secondary,
          },
        }}
      />
    </View>
  );
}
