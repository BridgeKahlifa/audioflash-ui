"use client";

import Image from "next/image";
import { useState, FormEvent } from "react";

const features = [
  {
    icon: "✨",
    title: "Topics you actually care about",
    description:
      "Any topic, any level. AI builds 20 flashcards around what's useful to you — not a generic textbook.",
  },
  {
    icon: "🔊",
    title: "Audio-First Learning",
    description:
      "Train your ear for real rhythm and accent — not robotic text-to-speech — so fast native speech stops sounding like noise.",
  },
  {
    icon: "🔁",
    title: "Spaced Repetition",
    description:
      "Review right before you forget — so your vocab compounds instead of resetting every week.",
  },
  {
    icon: "🔥",
    title: "Fits into 5 minutes",
    description:
      "Short sessions that fit any schedule. Enough to build a real habit without the guilt when you miss a day.",
  },
];

const steps = [
  {
    number: "01",
    title: "Pick your language & topic",
    description:
      "Choose from Mandarin, Spanish, Japanese, and more. Then select a real-world topic: Travel, Food, Dating, Business.",
  },
  {
    number: "02",
    title: "Press play — AI builds your lesson instantly",
    description:
      "In seconds, AudioFlash generates 20 flashcards with native-sounding audio tailored to your topic.",
  },
  {
    number: "03",
    title: "Hear, recall, repeat",
    description:
      "Tap to hear audio, reveal the answer, mark what you know. Your review schedule adjusts as you improve.",
  },
];

const languages = [
  { flag: "🇨🇳", label: "Mandarin", available: true },
  { flag: "🇪🇸", label: "Spanish", available: true },
  { flag: "🇯🇵", label: "Japanese", available: true },
  { flag: "🇫🇷", label: "French", available: true },
  { flag: "🇰🇷", label: "Korean", available: false },
];

const mockLanguages = [
  { flag: "🇪🇸", label: "Spanish", native: "¿Dónde está el baño?", romanization: "dohn-deh ehs-tah el bahn-yo", translation: "Where is the bathroom?" },
  { flag: "🇫🇷", label: "French", native: "Où sont les toilettes ?", romanization: "oo sohn lay twah-let", translation: "Where is the bathroom?" },
  { flag: "🇯🇵", label: "Japanese", native: "トイレはどこですか？", romanization: "Toire wa doko desu ka?", translation: "Where is the bathroom?" },
  { flag: "🇨🇳", label: "Mandarin", native: "厕所在哪里？", romanization: "cèsuǒ zài nǎlǐ", translation: "Where is the bathroom?" },
];

function StatusBar() {
  return (
    <div className="flex justify-between items-center px-6 pt-4 pb-2">
      <span className="text-xs font-semibold text-foreground">9:41</span>
      <div className="bg-foreground rounded-full absolute left-1/2 -translate-x-1/2 top-3" style={{ width: 80, height: 20 }} />
      <div className="flex gap-1 items-center">
        <div className="w-4 h-2.5 border border-foreground rounded-sm relative">
          <div className="absolute inset-0.5 right-1 bg-foreground rounded-sm" />
        </div>
      </div>
    </div>
  );
}

function FlashcardMockup() {
  const [screen, setScreen] = useState<"language" | "flashcard">("language");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const selected = selectedIndex !== null ? mockLanguages[selectedIndex] : null;

  const handleContinue = () => {
    setRevealed(false);
    setScreen("flashcard");
  };

  const handleBack = () => {
    setScreen("language");
    setSelectedIndex(null);
  };

  return (
    <div className="relative mx-auto" style={{ width: 300 }}>
      <div
        className="relative bg-background rounded-[40px] overflow-hidden"
        style={{ width: 300, height: 580, boxShadow: "0 40px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.08)" }}
      >
        <div className="flex flex-col h-full">
          <StatusBar />

          {screen === "language" ? (
            /* ── Language selection screen ── */
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="px-5 pt-3 pb-4">
                <p className="text-xl font-bold text-foreground tracking-tight">Choose Language</p>
                <p className="text-xs text-muted mt-0.5">Pick what you want to practice first</p>
              </div>

              <div className="flex-1 px-4 flex flex-col gap-2 overflow-hidden">
                {mockLanguages.map((lang, i) => {
                  const isSelected = selectedIndex === i;
                  return (
                    <button
                      key={lang.label}
                      onClick={() => setSelectedIndex(i)}
                      className="w-full text-left flex items-center gap-3 rounded-2xl px-4 py-3 border-2 transition-all"
                      style={{
                        background: isSelected ? "#FFF0ED" : "#FFFFFF",
                        borderColor: isSelected ? "#FF6B4A" : "transparent",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                      }}
                    >
                      <span style={{ fontSize: 24 }}>{lang.flag}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{lang.label}</p>
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
                  onClick={handleContinue}
                  disabled={selectedIndex === null}
                  className="w-full py-3.5 rounded-2xl text-sm font-semibold transition-all"
                  style={{
                    background: selectedIndex !== null ? "#FF6B4A" : "#F5F5F5",
                    color: selectedIndex !== null ? "#fff" : "#737373",
                    boxShadow: selectedIndex !== null ? "0 4px 12px rgba(255,107,74,0.3)" : "none",
                  }}
                >
                  Continue
                </button>
              </div>
            </div>
          ) : (
            /* ── Flashcard practice screen ── */
            <div className="flex flex-col flex-1">
              {/* Progress */}
              <div className="px-5 pt-2">
                <div className="flex justify-between items-center mb-2">
                  <button onClick={handleBack} className="text-xs text-muted font-medium">← Back</button>
                  <span className="text-xs text-primary font-semibold">20%</span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: "20%" }} />
                </div>
                <p className="text-xs text-muted mt-1">Card 4 / 20 · {selected?.label}</p>
              </div>

              {/* Card */}
              <div className="px-4 pt-3">
                <div className="bg-card rounded-3xl p-5 flex flex-col items-center" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
                  <p className="text-foreground font-semibold text-center leading-tight mb-2" style={{ fontSize: selected?.label === "Mandarin" || selected?.label === "Japanese" ? 28 : 18 }}>
                    {selected?.native}
                  </p>
                  <p className="text-muted text-xs mb-4 text-center">{selected?.romanization}</p>

                  <button
                    className="w-14 h-14 rounded-full bg-primary flex items-center justify-center mb-4"
                    style={{ boxShadow: "0 8px 24px rgba(255,107,74,0.35)" }}
                    aria-label="Play audio"
                  >
                    <span style={{ fontSize: 22 }}>🔊</span>
                  </button>

                  {revealed ? (
                    <div className="bg-accent rounded-2xl px-4 py-3 w-full text-center">
                      <p className="text-foreground font-medium text-sm">{selected?.translation}</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRevealed(true)}
                      className="bg-secondary rounded-2xl px-4 py-3 w-full text-center transition-colors hover:bg-accent"
                    >
                      <p className="text-muted text-sm font-medium">Reveal Answer</p>
                    </button>
                  )}
                </div>
              </div>

              {/* Buttons */}
              <div className="px-4 pt-3 pb-6 flex gap-3 mt-auto">
                <button
                  onClick={() => setRevealed(false)}
                  className="flex-1 py-3 rounded-2xl bg-secondary text-muted text-sm font-semibold transition-colors hover:bg-red-50 hover:text-red-500"
                >
                  Didn&apos;t Know
                </button>
                <button
                  onClick={() => setRevealed(false)}
                  className="flex-1 py-3 rounded-2xl bg-primary text-white text-sm font-semibold"
                  style={{ boxShadow: "0 4px 12px rgba(255,107,74,0.3)" }}
                >
                  I Knew It
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Glow */}
      <div
        className="absolute -z-10 rounded-full blur-3xl opacity-30"
        style={{ background: "#FF6B4A", width: 200, height: 200, top: "30%", left: "50%", transform: "translateX(-50%)" }}
      />
    </div>
  );
}

function EmailForm({ variant = "hero" }: { variant?: "hero" | "cta" }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || status === "loading") return;

    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setStatus("success");
        setEmail("");
      } else {
        const data = await res.json();
        setErrorMessage(data.error || "Something went wrong. Try again.");
        setStatus("error");
      }
    } catch {
      setErrorMessage("Something went wrong. Try again.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div
        className={`flex items-center gap-3 rounded-2xl px-5 py-4 ${variant === "hero" ? "bg-accent" : "bg-white/10"
          }`}
      >
        <span className="text-xl">🎉</span>
        <div>
          <p className={`font-semibold text-sm ${variant === "cta" ? "text-white" : "text-foreground"}`}>
            You&apos;re on the list!
          </p>
          <p className={`text-xs mt-0.5 ${variant === "cta" ? "text-white/70" : "text-muted"}`}>
            We&apos;ll email you when AudioFlash launches.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md">
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className={`flex-1 rounded-2xl px-4 py-3.5 text-sm outline-none transition-all ${variant === "hero"
            ? "bg-white border border-border text-foreground placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/10"
            : "bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:border-white/50"
            }`}
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-2xl px-5 py-3.5 bg-primary text-white text-sm font-semibold whitespace-nowrap transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ boxShadow: "0 4px 14px rgba(255,107,74,0.35)" }}
        >
          {status === "loading" ? "..." : "Join Waitlist"}
        </button>
      </div>
      {status === "error" && (
        <p className="text-red-500 text-xs mt-2 pl-1">{errorMessage}</p>
      )}
    </form>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/AudioFlashLogo.png"
              alt="AudioFlash logo"
              width={32}
              height={32}
              className="w-8 h-8 object-contain"
              priority
            />
            <span className="font-semibold text-foreground text-lg tracking-tight">
              AudioFlash
            </span>
          </div>
          <a
            href="#waitlist"
            className="rounded-xl px-4 py-2 bg-primary text-white text-sm font-semibold transition-opacity hover:opacity-90"
          >
            Get Early Access
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-14 pb-16">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          {/* Left: copy */}
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-accent rounded-full px-3 py-1.5 mb-6">
              <span className="text-xs">🚀</span>
              <span className="text-xs font-medium text-primary">
                Now in early access — 4 languages available
              </span>
            </div>

            <h1 className="text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-tight mb-6">
              Hear it.
              <br />
              Say it.
              <br />
              <span className="text-primary">Remember it.</span>
            </h1>

            <p className="text-lg text-muted leading-relaxed mb-5 max-w-md mx-auto lg:mx-0">
              Most apps train you to read a language. AudioFlash trains you to
              hear and speak it — with AI-generated audio flashcards built on
              spaced repetition.
            </p>

            <ul className="mb-8 space-y-2 max-w-md mx-auto lg:mx-0 text-left">
              <li className="flex items-start gap-2 text-sm text-muted">
                <span className="text-primary mt-0.5">✓</span>
                <span><span className="font-medium text-foreground">Hands-free</span> — practice while commuting, cooking, or walking</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-muted">
                <span className="text-primary mt-0.5">✓</span>
                <span><span className="font-medium text-foreground">Spaced repetition</span> — review right before you forget</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-muted">
                <span className="text-primary mt-0.5">✓</span>
                <span><span className="font-medium text-foreground">5 minutes a day</span> — short sessions that actually build a habit</span>
              </li>
            </ul>

            <EmailForm variant="hero" />

            <p className="text-xs text-muted mt-3 pl-1">
              Free to join. No credit card needed.
            </p>
          </div>

          {/* Right: phone mockup */}
          <div className="flex-shrink-0">
            <FlashcardMockup />
          </div>
        </div>
      </section>

      {/* Problem → Solution */}
      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h2 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight mb-4">
          Studied for months. Still freeze when someone speaks to you?
        </h2>
        <p className="text-muted leading-relaxed text-lg max-w-2xl mx-auto">
          That&apos;s because most apps train your eyes, not your ears. You can recognize words on a screen — but the moment real speech hits, at full speed, with an accent, your brain stalls.
        </p>
        <p className="text-muted leading-relaxed text-lg max-w-2xl mx-auto mt-4">
          AudioFlash is built to close that gap. Short audio flashcards + spaced repetition = faster listening recall, less translation lag, more real conversations.
        </p>
      </section>

      {/* Features */}
      <section className="bg-white border-y border-border py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground tracking-tight mb-3">
              Built for how you actually learn
            </h2>
            <p className="text-muted max-w-md mx-auto">
              Not another vocabulary list. AudioFlash focuses on listening,
              speaking, and real-world usage.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-background rounded-2xl p-5"
                style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
              >
                <div
                  className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-xl mb-4"
                >
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-foreground text-sm mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground tracking-tight mb-3">
            From zero to lesson in seconds
          </h2>
          <p className="text-muted max-w-sm mx-auto">
            No curriculum to set up. No textbook to buy. Just pick and go.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((step) => (
            <div key={step.number} className="relative">
              <div className="text-5xl font-bold text-border mb-4 leading-none">
                {step.number}
              </div>
              <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
              <p className="text-muted text-sm leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Languages */}
      <section className="bg-white border-y border-border py-16">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-foreground tracking-tight mb-2">
            Languages
          </h2>
          <p className="text-muted text-sm mb-8">
            Practice in Mandarin, Spanish, Japanese, or French — Korean coming soon.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            {languages.map((lang) => (
              <div
                key={lang.label}
                className={`flex items-center gap-2.5 rounded-2xl px-4 py-2.5 border ${lang.available
                  ? "bg-accent border-primary/30"
                  : "bg-background border-border opacity-50"
                  }`}
              >
                <span className="text-xl">{lang.flag}</span>
                <span
                  className={`text-sm font-medium ${lang.available ? "text-foreground" : "text-muted"
                    }`}
                >
                  {lang.label}
                </span>
                {!lang.available && (
                  <span className="text-xs text-muted bg-secondary rounded-full px-2 py-0.5">
                    Soon
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-2xl mx-auto px-6 py-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-foreground tracking-tight mb-3">
            Frequently asked questions
          </h2>
        </div>

        <div className="space-y-6">
          {[
            {
              q: "Is AudioFlash good for absolute beginners?",
              a: "Yes. You pick your topic and the app generates flashcards at your level — no prior knowledge required. The audio helps you hear correct pronunciation from day one.",
            },
            {
              q: "How is this different from Duolingo or Anki?",
              a: "Duolingo focuses on reading and gamification. Anki requires you to build your own decks. AudioFlash is audio-first and generates ready-to-go lessons around any topic you choose — so you're training your ear, not just your eyes, without the setup work.",
            },
            {
              q: "How much time do I need each day?",
              a: "Sessions are designed to fit in 5 minutes. You can do more, but even a short daily session builds real retention through spaced repetition.",
            },
            {
              q: "Which languages are available right now?",
              a: "Mandarin, Spanish, Japanese, and French are available now. Korean is coming soon.",
            },
            {
              q: "Do I need to practice every day?",
              a: "Consistency helps, but AudioFlash is designed for real life. Spaced repetition means your cards resurface at the right time — so missing a day won't erase your progress.",
            },
            {
              q: "When does the app launch?",
              a: "We're in early access now. Join the waitlist and you'll be among the first to get access on iOS and Android.",
            },
          ].map(({ q, a }) => (
            <div key={q} className="border-b border-border pb-6">
              <h3 className="font-semibold text-foreground mb-2">{q}</h3>
              <p className="text-muted text-sm leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA / Waitlist */}
      <section
        id="waitlist"
        className="py-24"
        style={{
          background: "linear-gradient(135deg, #FF6B4A 0%, #FF8F73 100%)",
        }}
      >
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white tracking-tight mb-4">
            Ready to start speaking?
          </h2>
          <p className="text-white/80 mb-8 text-lg">
            Join the waitlist and get early access when AudioFlash launches on
            iOS and Android.
          </p>

          <div className="flex justify-center">
            <EmailForm variant="cta" />
          </div>

          <p className="text-white/50 text-xs mt-4">
            We respect your inbox. No spam, ever.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xs">
              A
            </div>
            <span className="font-semibold text-foreground text-sm">
              AudioFlash
            </span>
          </div>
          <p className="text-muted text-xs">
            © {new Date().getFullYear()} AudioFlash. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
