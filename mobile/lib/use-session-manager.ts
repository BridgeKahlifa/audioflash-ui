import { useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { useAuth } from "./auth-context";
import { captureHandledException, useAnalytics } from "./analytics";
import { useInvalidateAppData } from "./queries";
import {
  completeSession,
  completeReviewLifecycle,
  createFlashcardAttempt,
  createReview,
  createSession,
  endLesson,
  updateFlashcardAttempt,
} from "./api";
import { saveCompletedSession } from "./storage";
import type { Flashcard, FlashcardDisplayMode, SessionCardResult } from "./types";

interface SessionManagerParams {
  cards: Flashcard[];
  currentIndex: number;
  resolvedActivityId: string | null;
  categoryId?: string;
  deckId?: string;
  difficulty?: number | null;
  displayMode: FlashcardDisplayMode;
  selectedConfidence: number | null;
  audioPlayCount: number;
  shownAtRef: React.MutableRefObject<number>;
  sessionStartedAt: React.MutableRefObject<number>;
  isResumeSession: boolean;
  resumeCardsSeen?: number;
  resumeCardsCorrect?: number;
  lessonSessionId?: string;
  deckSessionId?: string;
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
      cards, currentIndex, resolvedActivityId, categoryId, deckId, difficulty, displayMode, selectedConfidence, audioPlayCount,
      shownAtRef, sessionStartedAt, isResumeSession,
      resumeCardsSeen = 0, resumeCardsCorrect = 0,
      lessonSessionId, deckSessionId, reviewId, topic, topicTitle, language, languageLabel,
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
        captureHandledException(posthog, e, {
          error_context: "session_attempt_save",
          card_index: currentIndex,
          display_mode: displayMode,
          is_resume_session: isResumeSession,
          is_review: Boolean(reviewId),
          has_deck_id: Boolean(deckId),
          has_lesson_session_id: Boolean(lessonSessionId),
        });
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
      language: languageLabel ?? null,
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
    const localCorrect = completedResults.filter((r) => r.knew).length;
    let aggregateCorrect = localCorrect + (isResumeSession ? resumeCardsCorrect : 0);
    let aggregateTotal = isResumeSession
      ? Math.max(cards.length, resumeCardsSeen + completedResults.length)
      : completedResults.length;
    let createdReviewId: string | undefined;
    let createdReviewName: string | undefined;
    let endedLessonSummary:
      | {
          cardsCorrect: number;
          cardsSeen: number;
        }
      | undefined;

    if (shouldPersistAttempts) {
      const profileId = profile?.id ?? session?.user?.id;
      if (!profileId) {
        captureHandledException(posthog, new Error("Missing profile id while finishing session"), {
          error_context: "session_finish_missing_profile",
          display_mode: displayMode,
          is_resume_session: isResumeSession,
          is_review: Boolean(reviewId),
          has_deck_id: Boolean(deckId),
          has_lesson_session_id: Boolean(lessonSessionId),
        });
        setAttemptError("We couldn't finish this session because your learner profile is missing.");
        setSubmitting(false);
        setSubmittingResult(null);
        submitLockRef.current = false;
        return null;
      }

      try {
        if (lessonSessionId) {
          const endedLesson = await endLesson(session?.access_token, {
            profile_id: profileId,
            session_id: lessonSessionId,
          });
          endedLessonSummary = {
            cardsCorrect: endedLesson.cards_correct,
            cardsSeen: endedLesson.cards_seen,
          };
        } else if (deckId && deckSessionId) {
          const endedDeckPractice = await completeSession(session?.access_token, {
            profile_id: profileId,
            session_id: deckSessionId,
          });
          endedLessonSummary = {
            cardsCorrect: endedDeckPractice.cards_correct,
            cardsSeen: endedDeckPractice.cards_seen,
          };
        } else if (!reviewId) {
          captureHandledException(posthog, new Error("Missing session identifier while finishing lesson"), {
            error_context: "session_finish_missing_identifier",
            display_mode: displayMode,
            is_resume_session: isResumeSession,
            has_deck_id: Boolean(deckId),
            has_lesson_session_id: Boolean(lessonSessionId),
          });
          setAttemptError("We couldn't finish this lesson because the session is missing.");
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
        captureHandledException(posthog, e, {
          error_context: "session_finish_remote",
          display_mode: displayMode,
          is_resume_session: isResumeSession,
          is_review: Boolean(reviewId),
          has_deck_id: Boolean(deckId),
          has_lesson_session_id: Boolean(lessonSessionId),
          missed_card_count: completedResults.filter((r) => !r.knew).length,
        });
        setAttemptError("We couldn't finish the lesson right now. Please try again.");
        setSubmitting(false);
        setSubmittingResult(null);
        submitLockRef.current = false;
        return null;
      }
    }

    if (endedLessonSummary) {
      aggregateCorrect = endedLessonSummary.cardsCorrect;
      aggregateTotal = endedLessonSummary.cardsSeen;
    }

    if (reviewId) {
      try {
        await completeReviewLifecycle(session?.access_token, reviewId);
      } catch (e) {
        console.error("completeReviewLifecycle failed", e);
        captureHandledException(posthog, e, {
          error_context: "review_complete_lifecycle",
          display_mode: displayMode,
          review_id: reviewId,
          card_count: completedResults.length,
        });
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
      deckId,
      difficulty: typeof difficulty === "number" ? difficulty : undefined,
      displayMode,
      cards: completedResults,
      total: aggregateTotal,
      correct: aggregateCorrect,
      reviewId: createdReviewId,
      reviewName: createdReviewName,
    }).catch((error) => {
      captureHandledException(posthog, error, {
        error_context: "session_summary_save_local",
        display_mode: displayMode,
        is_review: Boolean(reviewId),
        has_deck_id: Boolean(deckId),
        total_cards: aggregateTotal,
        correct_cards: aggregateCorrect,
      });
      throw error;
    });

    // Fire-and-forget — don't block navigation
    if (shouldPersistAttempts && session?.access_token) {
      let sessionType: "lesson" | "deck" | "review" | null = null;
      if (reviewId) {
        sessionType = "review";
      } else if (deckId && deckSessionId) {
        sessionType = "deck";
      } else if (lessonSessionId) {
        sessionType = "lesson";
      }

      createSession(session.access_token, {
        topic_title: topicTitle ?? topic,
        language_label: languageLabel,
        cards_attempted: aggregateTotal,
        cards_correct: aggregateCorrect,
        completed_at: new Date().toISOString(),
        ...(sessionType ? { type: sessionType } : {}),
      }).catch((error) => {
        captureHandledException(posthog, error, {
          error_context: "session_record_create",
          display_mode: displayMode,
          session_type: sessionType ?? "unknown",
          total_cards: aggregateTotal,
          correct_cards: aggregateCorrect,
        });
      });
    }

    posthog?.capture("session_completed", {
      language: languageLabel ?? null,
      card_count: aggregateTotal,
      cards_correct: aggregateCorrect,
      accuracy: aggregateTotal > 0
        ? Math.round((aggregateCorrect / aggregateTotal) * 100)
        : 0,
      duration_ms: Date.now() - sessionStartedAt.current,
      is_review: Boolean(reviewId),
      display_mode: displayMode,
      topic: topicTitle ?? topic,
    });

    // Invalidate profile too — the server updates streak_count after a completed session.
    invalidate("srsQueue", "inProgressLesson", "sessions", "sessionStats", "savedReviews", "profile");
    router.replace({
      pathname: "/session-summary",
      params: {
        categoryId,
        deckId,
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
