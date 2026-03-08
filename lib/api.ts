import type { components } from "./generated/api-types";

export type ApiLanguage = components["schemas"]["LanguageResponse"];
export type ApiCategory = components["schemas"]["CategoryResponse"];
export type ApiLessonCard = components["schemas"]["FlashcardResponse"];

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8090/api";

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new Error(`API ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function fetchLanguages(): Promise<ApiLanguage[]> {
  const res = await fetch(`${API_BASE_URL}/languages`);
  return parseJson<ApiLanguage[]>(res);
}

export async function fetchCategories(): Promise<ApiCategory[]> {
  const res = await fetch(`${API_BASE_URL}/lessons/categories`);
  return parseJson<ApiCategory[]>(res);
}

export async function fetchLessonCards(params: {
  languageId: ApiLanguage["id"];
  categoryId: ApiCategory["id"];
  limit?: number;
}): Promise<ApiLessonCard[]> {
  const requestedLimit = params.limit ?? 20;
  const res = await fetch(`${API_BASE_URL}/lessons/flashcards`);
  const cards = await parseJson<ApiLessonCard[]>(res);
  const filtered = cards.filter(
    (card) =>
      String(card.language_id) === String(params.languageId) &&
      String(card.category_id) === String(params.categoryId)
  );
  const selected = filtered.slice(0, requestedLimit);

  if (__DEV__) {
    console.log(
      `[api] lessons/flashcards language=${params.languageId} category=${params.categoryId} requested=${requestedLimit} received=${cards.length} filtered=${filtered.length} selected=${selected.length}`
    );
  }

  return selected;
}
