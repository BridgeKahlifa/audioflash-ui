import { View } from "react-native";

export function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <View className="flex-row gap-2 justify-center">
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          className={`h-2 rounded-full ${i < current ? "bg-primary w-6" : "bg-border w-2"}`}
        />
      ))}
    </View>
  );
}
