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
  languageId: string;
  categoryId: string;
}): Promise<ApiLessonCard[]> {
  if (!params.languageId || !params.categoryId) {
    throw new Error("Both languageId and categoryId are required");
  }

  const query = new URLSearchParams({
    category_id: params.categoryId,
    language_id: params.languageId,
  });

  const res = await fetch(`${API_BASE_URL}/lessons/flashcards?${query.toString()}`);
  return parseJson<ApiLessonCard[]>(res);
}
