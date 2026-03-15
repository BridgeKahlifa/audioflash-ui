import { Flashcard } from "./types";

const API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
const MODEL = process.env.EXPO_PUBLIC_AI_MODEL ?? "anthropic/claude-haiku-4-5";

export async function generateFlashcards(
  topic: string,
  topicTitle: string,
  cardCount = 5,
): Promise<Flashcard[]> {
  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://audioflash.app",
          "X-Title": "AudioFlash",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: "user",
              content: `Generate ${cardCount} Chinese (Mandarin) conversational flashcards for the topic "${topicTitle}".

Return ONLY a valid JSON array with no markdown, code blocks, or explanation. Each object must have exactly these three fields:
- "chinese": the Chinese phrase in characters
- "pinyin": the pinyin romanization with tone marks
- "english": the English translation

Generate practical, real-world phrases a learner would actually use in this context.

Example format:
[{"chinese":"你好","pinyin":"nǐ hǎo","english":"Hello"},{"chinese":"谢谢","pinyin":"xièxiè","english":"Thank you"}]`,
            },
          ],
          temperature: 0.7,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const content: string = data.choices[0]?.message?.content ?? "";

    // Strip any accidental markdown code blocks
    const cleaned = content
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const parsed = JSON.parse(cleaned) as {
      chinese: string;
      pinyin: string;
      english: string;
    }[];

    return parsed
      .slice(0, cardCount)
      .map((card, i) => ({ ...card, id: i + 1 }));
  } catch {
    // In case of any error, return an empty array
    return [];
  }
}
