import * as Speech from "expo-speech";

export function speakChinese(text: string): void {
  Speech.stop();
  Speech.speak(text, {
    language: "zh-CN",
    rate: 0.8,
    pitch: 1.0,
  });
}

export function stopSpeaking(): void {
  Speech.stop();
}
