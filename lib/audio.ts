import * as Speech from "expo-speech";

export function speakChinese(text: string, rate = 1.0): void {
  Speech.stop();
  Speech.speak(text, {
    language: "zh-CN",
    rate,
    pitch: 1.0,
  });
}

export function stopSpeaking(): void {
  Speech.stop();
}
