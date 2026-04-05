import { useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { useAuth } from "./auth-context";
import { useAnalytics } from "./analytics";
import { useInvalidateAppData } from "./queries";
import {
  completeReviewLifecycle,
  createFlashcardAttempt,
  createReview,
  createSession,
  endLesson,
  updateFlashcardAttempt,
} from "./api";
import { saveCompletedSession } from "./storage";
import type { Flashcard, SessionCardResult } from "./types";

interface SessionManagerParams {
  cards: Flashcard[];
  currentIndex: number;
  resolvedActivityId: string | null;
  categoryId?: string;
  difficulty?: number | null;
  selectedConfidence: number | null;
  audioPlayCount: number;
  shownAtRef: React.MutableRefObject<number>;
  sessionStartedAt: React.MutableRefObject<number>;
  isResumeSession: boolean;
  lessonSessionId?: string;
  reviewId?: string;
  topic: string;
  topicTitle?: string;
  language?: string;
  languageLabel?: string;
}

interface SubmitOutcome {
  /** Index to advance to. Only meaningful when isComplete is false. */
  nextIndex: number;
  isComplete: boolean;
}

export interface SessionManagerResult {
  submitting: boolean;
  submittingResult: "knew" | "didnt-know" | null;
  attemptError: string;
  results: SessionCardResult[];
  /** Call when the user marks a card knew/didn't know. Returns null if a lock prevented submission. */
  handleResult: (knew: boolean) => Promise<SubmitOutcome | null>;
}

export function useSessionManager(params: SessionManagerParams): SessionManagerResult {
  const { profile, session } = useAuth();
  const invalidate = useInvalidateAppData();
  const posthog = useAnalytics();

  const [submitting, setSubmitting] = useState(false);
  const [submittingResult, setSubmittingResult] = useState<"knew" | "didnt-know" | null>(null);
  const [attemptError, setAttemptError] = useState("");
  const [results, setResults] = useState<SessionCardResult[]>([]);
  const submitLockRef = useRef(false);

  // Clear any previous error whenever the user moves to a new card so they
  // aren't looking at a stale error message from a different card's attempt.
  useEffect(() => {
    setAttemptError("");
  }, [params.currentIndex]);

  async function handleResult(knew: boolean): Promise<SubmitOutcome | null> {
    // Read all params at call time — they reflect the current render's values
    const {
      cards, currentIndex, resolvedActivityId, categoryId, difficulty, selectedConfidence, audioPlayCount,
      shownAtRef, sessionStartedAt, isResumeSession,
      lessonSessionId, reviewId, topic, topicTitle, language, languageLabel,
    } = params;

    const currentCard = cards[currentIndex];
    if (!currentCard || submitting || submitLockRef.current) return null;

    submitLockRef.current = true;
    setSubmitting(true);
    setSubmittingResult(knew ? "knew" : "didnt-know");
    setAttemptError("");

    const responseTimeMs = Math.max(0, Date.now() - shownAtRef.current);
    const shouldPersistAttempts = Boolean(resolvedActivityId && currentCard.dbId);
    const existingResult = results[currentIndex];
    let attemptId = existingResult?.attemptId;
    let nextIndexFromServer: number | null = null;

    // ── Record attempt ──────────────────────────────────────────────────────
    if (shouldPersistAttempts) {
      try {
        if (attemptId) {
          const updated = await updateFlashcardAttempt(session?.access_token, attemptId, {
            correct: knew,
            confidence_rating: selectedConfidence,
          });
          nextIndexFromServer = updated.current_index;
        } else {
          const attempt = await createFlashcardAttempt(session?.access_token, {
            activity_id: resolvedActivityId!,
            flashcard_id: currentCard.dbId!,
            correct: knew,
            response_time_ms: responseTimeMs,
            audio_play_count: audioPlayCount,
            hint_used: false,
            confidence_rating: selectedConfidence,
          });
          attemptId = attempt.attempt_id;
          nextIndexFromServer = attempt.current_index;
        }
      } catch (e) {
        console.error("createFlashcardAttempt/updateFlashcardAttempt failed", e);
        setAttemptError("We couldn't save that answer. Please check your connection and try again.");
        setSubmitting(false);
        setSubmittingResult(null);
        submitLockRef.current = false;
        return null;
      }
    }

    const nextResult: SessionCardResult = {
      cardId: currentCard.dbId ?? currentCard.id,
      sourceText: currentCard.sourceText,
      romanization: currentCard.romanization,
      translation: currentCard.translation,
      knew,
      confidenceRating: selectedConfidence,
      attemptId,
    };
    const newResults = [...results];
    newResults[currentIndex] = nextResult;
    setResults(newResults);

    posthog?.capture("card_result_submitted", {
      knew,
      confidence_rating: selectedConfidence,
      response_time_ms: responseTimeMs,
      audio_play_count: audioPlayCount,
      card_index: currentIndex,
      language: languageLabel,
    });

    const nextIndex = isResumeSession && nextIndexFromServer != null
      ? nextIndexFromServer
      : currentIndex + 1;

    // ── Not last card — advance ─────────────────────────────────────────────
    if (nextIndex < cards.length) {
      setSubmitting(false);
      setSubmittingResult(null);
      submitLockRef.current = false;
      return { nextIndex, isComplete: false };
    }

    // ── Last card — finish session ──────────────────────────────────────────
    const completedResults = newResults.filter(
      (r): r is SessionCardResult => Boolean(r),
    );
    const correct = completedResults.filter((r) => r.knew).length;
    let createdReviewId: string | undefined;
    let createdReviewName: string | undefined;

    if (shouldPersistAttempts) {
      const profileId = profile?.id ?? session?.user?.id;
      if (!profileId) {
        setAttemptError("We couldn't finish this session because your learner profile is missing.");
        setSubmitting(false);
        setSubmittingResult(null);
        submitLockRef.current = false;
        return null;
      }

      try {
        if (lessonSessionId) {
          await endLesson(session?.access_token, {
            profile_id: profileId,
            session_id: lessonSessionId,
          });
        } else if (!reviewId) {
          setAttemptError("We couldn't finish this lesson because the lesson session is missing.");
          setSubmitting(false);
          setSubmittingResult(null);
          submitLockRef.current = false;
          return null;
        }

        if (!reviewId && lessonSessionId) {
          const missedFlashcardIds = completedResults
            .filter((r) => !r.knew)
            .map((r) => cards.find((c) => c.dbId === r.cardId || c.id === r.cardId)?.dbId)
            .filter((id): id is string => Boolean(id));

          if (missedFlashcardIds.length > 0) {
            const created = await createReview(session?.access_token, {
              profile_id: profileId,
              parent_session_id: lessonSessionId,
              review_name: `${topicTitle ?? topic} Missed Cards`,
              flashcard_ids: missedFlashcardIds,
            });
            createdReviewId = created.id;
            createdReviewName = created.review_name;
          }
        }
      } catch (e) {
        console.error("endLesson/createReview failed", e);
        setAttemptError("We couldn't finish the lesson right now. Please try again.");
        setSubmitting(false);
        setSubmittingResult(null);
        submitLockRef.current = false;
        return null;
      }
    }

    if (reviewId) {
      try {
        await completeReviewLifecycle(session?.access_token, reviewId);
      } catch (e) {
        console.error("completeReviewLifecycle failed", e);
        setAttemptError("We couldn't finish the review right now. Please try again.");
        setSubmitting(false);
        setSubmittingResult(null);
        submitLockRef.current = false;
        return null;
      }
    }

    await saveCompletedSession({
      topic,
      topicTitle: topicTitle ?? topic,
      language: language ?? "",
      languageLabel: languageLabel ?? "",
      categoryId,
      difficulty: typeof difficulty === "number" ? difficulty : undefined,
      cards: completedResults,
      reviewId: createdReviewId,
      reviewName: createdReviewName,
    });

    // Fire-and-forget — don't block navigation
    if (shouldPersistAttempts && session?.access_token) {
      createSession(session.access_token, {
        topic_title: topicTitle ?? topic,
        language_label: languageLabel,
        cards_attempted: completedResults.length,
        cards_correct: correct,
        completed_at: new Date().toISOString(),
      }).catch(() => {});
    }

    posthog?.capture("session_completed", {
      language: languageLabel,
      card_count: completedResults.length,
      cards_correct: correct,
      accuracy: completedResults.length > 0
        ? Math.round((correct / completedResults.length) * 100)
        : 0,
      duration_ms: Date.now() - sessionStartedAt.current,
      is_review: Boolean(reviewId),
      topic: topicTitle ?? topic,
    });

    // Invalidate profile too — the server updates streak_count after a completed session.
    invalidate("srsQueue", "inProgressLesson", "sessions", "sessionStats", "savedReviews", "profile");
    router.replace({
      pathname: "/session-summary",
      params: {
        categoryId,
        difficulty: typeof difficulty === "number" ? String(difficulty) : undefined,
      },
    });

    // Return isComplete so the caller knows not to update card state
    setSubmitting(false);
    setSubmittingResult(null);
    submitLockRef.current = false;
    return { nextIndex, isComplete: true };
  }

  return { submitting, submittingResult, attemptError, results, handleResult };
}
