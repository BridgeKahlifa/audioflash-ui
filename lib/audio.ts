import * as Speech from "expo-speech";
import { getSettings } from "./storage";

export async function speakChinese(text: string): Promise<void> {
  const settings = await getSettings();
  Speech.stop();
  Speech.speak(text, {
    language: "zh-CN",
    rate: settings.audioRate,
    pitch: 1.0,
  });
}

export function stopSpeaking(): void {
  Speech.stop();
}
