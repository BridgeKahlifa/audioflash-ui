"use client";

import { useEffect, useRef, useState } from "react";
import { FlagIcon } from "../FlagIcon";
import { playAudioFile } from "../../lib/audio";
import { LESSONS, LessonKey, LessonCard, CardResult, getWeeklyData } from "../../lib/lessons";
import { PhoneCallout } from "./PhoneCallout";
import { StatusBar } from "./StatusBar";
import { WebBarChart } from "./WebBarChart";

export function FlashcardMockup() {
  type Screen = "language" | "practice" | "summary";
  const [screen, setScreen] = useState<Screen>("language");
  const [selectedLang, setSelectedLang] = useState<LessonKey | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedConfidence, setSelectedConfidence] = useState<number | null>(null);
  const [results, setResults] = useState<CardResult[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

  // Pulse state machine: phone → start button → audio button → reveal button (once only)
  const [phonePulsing, setPhonePulsing] = useState(true);
  const [startPulsing, setStartPulsing] = useState(false);
  const [audioPulsing, setAudioPulsing] = useState(false);
  const [revealPulsing, setRevealPulsing] = useState(false);
  const revealEverUsed = useRef(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      setScale(Math.min(1, w / 300));
    });
    ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, []);

  const lesson = selectedLang ? LESSONS[selectedLang] : null;
  const currentCard: LessonCard | undefined = lesson?.cards[currentIndex];
  const totalCards = lesson?.cards.length ?? 0;
  const progress = totalCards > 0 ? (currentIndex + 1) / totalCards : 0;

  function handlePlayAudio() {
    if (!selectedLang) return;
    setAudioPulsing(false);
    if (!revealEverUsed.current) setRevealPulsing(true);
    setIsPlaying(true);
    playAudioFile(`/audio/${selectedLang}-${currentIndex}.mp3`, playbackSpeed, () => setIsPlaying(false));
  }

  function handleStartLesson() {
    if (!selectedLang) return;
    setStartPulsing(false);
    setAudioPulsing(true);
    setCurrentIndex(0);
    setShowAnswer(false);
    setSelectedConfidence(null);
    setResults([]);
    setScreen("practice");
  }

  function handleResult(knew: boolean) {
    if (!currentCard || !lesson) return;
    const newResults: CardResult[] = [...results, { ...currentCard, knew }];
    setResults(newResults);
    if (currentIndex < totalCards - 1) {
      setCurrentIndex((i) => i + 1);
      setShowAnswer(false);
      setSelectedConfidence(null);
    } else {
      setScreen("summary");
    }
  }

  function handleRestart() {
    setSelectedLang(null);
    setCurrentIndex(0);
    setShowAnswer(false);
    setSelectedConfidence(null);
    setResults([]);
    setScreen("language");
    setStartPulsing(false);
    setAudioPulsing(false);
    setRevealPulsing(false);
    revealEverUsed.current = false;
  }

  const correctCount = results.filter((r) => r.knew).length;
  const accuracy = results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0;
  const missed = results.filter((r) => !r.knew);

  return (
    <PhoneCallout pulsing={phonePulsing}>
      {/* Layout wrapper: measures available width and reserves scaled height */}
      <div ref={wrapperRef} className="relative mx-auto w-full" style={{ height: 600 * scale }}>
        {/* Scale container: phone + badge shrink together */}
        <div className="relative" style={{ width: 300, transformOrigin: "top left", transform: `scale(${scale})` }}>
        <div
          className="relative bg-background rounded-[40px] overflow-hidden"
          style={{ width: 300, height: 600, boxShadow: "0 40px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.08)" }}
        >
          <div className="flex flex-col h-full">
            <StatusBar />

            {/* ── LANGUAGE SELECTION ── */}
            {screen === "language" && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="px-5 pt-3 pb-3">
                  <p className="text-xl font-bold text-foreground tracking-tight">Try a Free Lesson</p>
                  <p className="text-xs text-muted mt-0.5">Pick a language and go through 5 real cards</p>
                </div>

                <div className="flex-1 px-4 flex flex-col gap-2 overflow-hidden">
                  {(Object.keys(LESSONS) as LessonKey[]).map((key) => {
                    const lang = LESSONS[key];
                    const isSelected = selectedLang === key;
                    return (
                      <button
                        key={key}
                        onClick={() => { setSelectedLang(key); setPhonePulsing(false); setStartPulsing(true); }}
                        className="w-full text-left flex items-center gap-3 rounded-2xl px-4 py-3 border-2 transition-all"
                        style={{
                          background: isSelected ? "#FFF0ED" : "#FFFFFF",
                          borderColor: isSelected ? "#FF6B4A" : "transparent",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                        }}
                      >
                        <FlagIcon
                          code={lang.flagCode}
                          label={lang.label}
                          className="h-6 w-8 rounded-sm shadow-sm"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{lang.label}</p>
                          <p className="text-xs text-muted">{lang.cards.length} cards</p>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                            <span style={{ color: "#fff", fontSize: 11 }}>✓</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="px-4 pt-3 pb-6">
                  <button
                    onClick={handleStartLesson}
                    disabled={selectedLang === null}
                    className="w-full py-3.5 rounded-2xl text-sm font-semibold transition-all"
                    style={{
                      background: selectedLang !== null ? "#FF6B4A" : "#F5F5F5",
                      color: selectedLang !== null ? "#fff" : "#737373",
                      animation: startPulsing ? "btnPulse 1.6s ease-out infinite" : "none",
                    }}
                  >
                    Start Lesson
                  </button>
                </div>
              </div>
            )}

            {/* ── PRACTICE ── */}
            {screen === "practice" && lesson && currentCard && (
              <div className="flex flex-col flex-1">
                <div className="px-4 pt-2 pb-1">
                  <div className="flex justify-between items-center mb-1.5">
                    <button onClick={handleRestart} className="text-xs text-muted font-medium">← Back</button>
                    <span className="text-xs text-primary font-semibold">{Math.round(progress * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress * 100}%` }} />
                  </div>
                  <p className="text-xs text-muted mt-1 text-center">
                    {currentIndex + 1} / {totalCards} · {lesson.label}
                  </p>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center px-4 gap-3">
                  <button
                    onClick={handlePlayAudio}
                    aria-label="Play audio"
                    className="rounded-full flex items-center justify-center transition-transform active:scale-95"
                    style={{
                      width: 72,
                      height: 72,
                      background: isPlaying ? "#e85c3e" : "#FF6B4A",
                      animation: audioPulsing && !isPlaying ? "audioPulse 1.6s ease-out infinite" : "none",
                      boxShadow: isPlaying ? "0 0 0 8px rgba(255,107,74,0.18), 0 8px 24px rgba(255,107,74,0.4)" : undefined,
                      transition: "background 0.15s",
                    }}
                  >
                    <span style={{ fontSize: 28 }}>🔊</span>
                  </button>

                  <div className="w-full px-2 flex flex-col items-center gap-1">
                    <div className="flex justify-between w-full">
                      <span className="text-muted" style={{ fontSize: 9 }}>Slow</span>
                      <span className="font-semibold text-primary" style={{ fontSize: 9 }}>{playbackSpeed.toFixed(1)}×</span>
                      <span className="text-muted" style={{ fontSize: 9 }}>Normal</span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={1.0}
                      step={0.1}
                      value={playbackSpeed}
                      onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                      className="w-full"
                      style={{ accentColor: "#FF6B4A", height: 3, cursor: "pointer" }}
                    />
                  </div>

                  {showAnswer ? (
                    <div className="bg-accent rounded-2xl px-4 py-3 w-full text-center">
                      <p
                        className="text-foreground font-bold text-center leading-tight mb-1"
                        style={{ fontSize: lesson.langCode === "zh-CN" || lesson.langCode === "ja-JP" ? 24 : 16 }}
                      >
                        {currentCard.phrase}
                      </p>
                      {currentCard.romanization && (
                        <p className="text-muted text-xs mb-1">{currentCard.romanization}</p>
                      )}
                      <p className="text-primary text-sm font-medium">{currentCard.meaning}</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setShowAnswer(true); setRevealPulsing(false); revealEverUsed.current = true; }}
                      className="bg-secondary rounded-2xl px-4 py-3 w-full text-center transition-colors hover:bg-accent"
                      style={{ animation: revealPulsing ? "btnPulse 1.6s ease-out infinite" : "none" }}
                    >
                      <p className="text-muted text-sm font-medium">Reveal Answer</p>
                    </button>
                  )}
                </div>

                <div className="px-4 pb-5 flex flex-col gap-2">
                  {showAnswer && (
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <p className="text-xs text-muted mr-1">Confidence:</p>
                      {[1, 2, 3, 4, 5].map((v) => {
                        const sel = selectedConfidence === v;
                        return (
                          <button
                            key={v}
                            onClick={() => setSelectedConfidence(v)}
                            className="rounded-full flex items-center justify-center border text-xs font-semibold transition-all"
                            style={{
                              width: 30,
                              height: 30,
                              background: sel ? "#FF6B4A" : "#F5F5F5",
                              borderColor: sel ? "#FF6B4A" : "#E5E5E5",
                              color: sel ? "#fff" : "#737373",
                            }}
                          >
                            {v}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {!showAnswer ? (
                    <p className="text-center text-xs text-muted">Tap the speaker to hear the phrase</p>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResult(false)}
                        className="flex-1 py-3 rounded-2xl bg-secondary text-muted text-sm font-semibold transition-colors hover:bg-red-50 hover:text-red-500"
                      >
                        Didn&apos;t Know
                      </button>
                      <button
                        onClick={() => handleResult(true)}
                        className="flex-1 py-3 rounded-2xl text-white text-sm font-semibold"
                        style={{ background: "#FF6B4A", boxShadow: "0 4px 12px rgba(255,107,74,0.3)" }}
                      >
                        I Knew It
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── PROGRESS / SUMMARY ── */}
            {screen === "summary" && lesson && (
              <div className="flex flex-col flex-1 overflow-y-auto">
                <div className="px-4 pt-3 pb-2 flex items-center justify-between flex-shrink-0">
                  <div>
                    <p className="text-base font-bold text-foreground leading-tight">Your Progress</p>
                    <p className="flex items-center gap-1.5 text-xs text-muted">
                      <FlagIcon
                        code={lesson.flagCode}
                        label={lesson.label}
                        className="h-3.5 w-[18px] rounded-[2px] shadow-sm"
                      />
                      <span>{lesson.label} · just completed</span>
                    </p>
                  </div>
                  <span style={{ fontSize: 20 }}>🎉</span>
                </div>

                <div className="mx-4 rounded-2xl p-3 mb-2.5 flex-shrink-0" style={{ background: "#FF6B4A" }}>
                  <div className="flex items-center gap-2.5">
                    <div className="rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ width: 38, height: 38, background: "rgba(255,255,255,0.2)" }}>
                      <span style={{ fontSize: 18 }}>🔥</span>
                    </div>
                    <div>
                      <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 10 }}>Daily Streak</p>
                      <p style={{ color: "#fff", fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>3 days</p>
                    </div>
                  </div>
                  <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 10, marginTop: 5 }}>
                    Keep your streak alive — practice again tomorrow!
                  </p>
                </div>

                <div className="mx-4 flex gap-2 mb-2.5 flex-shrink-0">
                  {[
                    { icon: "📚", value: results.length, label: "Cards" },
                    { icon: "📈", value: `${accuracy}%`, label: "Accuracy" },
                    { icon: "🏆", value: 1, label: "Sessions" },
                  ].map(({ icon, value, label }) => (
                    <div key={label} className="flex-1 bg-white border border-border rounded-2xl p-2.5"
                      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                      <div className="rounded-lg flex items-center justify-center mb-1.5"
                        style={{ width: 28, height: 28, background: "#FFF0ED" }}>
                        <span style={{ fontSize: 13 }}>{icon}</span>
                      </div>
                      <p className="text-foreground font-bold" style={{ fontSize: 16 }}>{value}</p>
                      <p className="text-muted" style={{ fontSize: 10 }}>{label}</p>
                    </div>
                  ))}
                </div>

                <div className="mx-4 bg-white border border-border rounded-2xl p-3 mb-2.5 flex-shrink-0"
                  style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                  <p className="text-foreground font-semibold mb-2.5" style={{ fontSize: 11 }}>This Week</p>
                  <WebBarChart data={getWeeklyData(results.length)} />
                  <p className="text-center text-muted mt-1.5" style={{ fontSize: 9 }}>Cards practiced per day</p>
                </div>

                {missed.length > 0 && (
                  <div className="mx-4 bg-white border border-border rounded-2xl p-3 mb-2.5 flex-shrink-0"
                    style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                    <p className="text-foreground font-semibold mb-1.5" style={{ fontSize: 11 }}>Review These</p>
                    <div className="flex flex-col gap-1">
                      {missed.map((card, i) => (
                        <div key={i} className="bg-secondary rounded-xl px-2.5 py-1.5">
                          <p className="text-foreground font-medium" style={{ fontSize: 11 }}>{card.phrase}</p>
                          {card.romanization && (
                            <p className="text-muted" style={{ fontSize: 9 }}>{card.romanization}</p>
                          )}
                          <p className="text-muted" style={{ fontSize: 10 }}>{card.meaning}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mx-4 flex flex-col gap-2 pb-5 flex-shrink-0">
                  <a href="#waitlist"
                    className="w-full py-3 rounded-2xl text-white text-sm font-semibold text-center block"
                    style={{ background: "#FF6B4A", boxShadow: "0 4px 12px rgba(255,107,74,0.3)" }}>
                    Get the Full App
                  </a>
                  <button onClick={handleRestart}
                    className="w-full py-2.5 rounded-2xl bg-secondary text-muted text-sm font-medium">
                    Try Another Language
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* "Try it out" callout */}
        <div
          className="absolute pointer-events-none select-none"
          style={{ top: -14, right: -20, transform: "rotate(20deg)", transformOrigin: "center center" }}
        >
          <span
            className="inline-block text-white text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{ background: "#FF6B4A", boxShadow: "0 2px 8px rgba(255,107,74,0.40)", letterSpacing: "0.04em" }}
          >
            Try it out
          </span>
        </div>
        </div>
      </div>
    </PhoneCallout>
  );
}
