import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DEFAULT_TRADITIONAL_FLASHCARD_FRONT,
  normalizeTraditionalFlashcardFront,
  type TraditionalFlashcardFront,
} from "./traditional-flashcard-front";

const LESSON_TRADITIONAL_FRONT_KEY = "audioflash:lesson-traditional-front:";

export async function getLessonTraditionalFlashcardFront(
  lessonSessionId: string,
): Promise<TraditionalFlashcardFront> {
  try {
    const raw = await AsyncStorage.getItem(LESSON_TRADITIONAL_FRONT_KEY + lessonSessionId);
    return normalizeTraditionalFlashcardFront(raw);
  } catch {
    return DEFAULT_TRADITIONAL_FLASHCARD_FRONT;
  }
}

export async function setLessonTraditionalFlashcardFront(
  lessonSessionId: string,
  front: TraditionalFlashcardFront,
): Promise<void> {
  try {
    await AsyncStorage.setItem(LESSON_TRADITIONAL_FRONT_KEY + lessonSessionId, front);
  } catch {
    // Non-critical
  }
}
