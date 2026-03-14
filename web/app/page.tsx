"use client";

import Image from "next/image";
import { useState, FormEvent } from "react";

const features = [
  {
    icon: "🎧",
    title: "Listening-First Flashcards",
    description:
      "Train your ear with useful phrases and natural pacing so spoken language feels less overwhelming.",
  },
  {
    icon: "🔁",
    title: "Spaced Repetition Timing",
    description:
      "Review cards at the right moment so words and phrases move from short-term memory to recall you can use.",
  },
  {
    icon: "🧠",
    title: "Active Recall Practice",
    description:
      "Hear a prompt, answer from memory, then check yourself. This trains the skill you need in real conversations.",
  },
  {
    icon: "🔥",
    title: "5-Minute Daily Sessions",
    description:
      "Short sessions make consistency realistic, which is what drives progress in language learning.",
  },
];

const steps = [
  {
    number: "01",
    title: "Choose language and level",
    description:
      "Start in Spanish, French, Japanese, or Mandarin and pick a level that matches where you are now.",
  },
  {
    number: "02",
    title: "Listen, then recall",
    description:
      "Play short audio prompts and pull the meaning from memory before you reveal the answer.",
  },
  {
    number: "03",
    title: "Review what matters most",
    description:
      "AudioFlash repeats weak cards on a smart schedule so your listening and recall keep improving.",
  },
];

const languages = [
  { flag: "🇨🇳", label: "Mandarin", available: true },
  { flag: "🇪🇸", label: "Spanish", available: true },
  { flag: "🇯🇵", label: "Japanese", available: true },
  { flag: "🇫🇷", label: "French", available: true },
];

const faqs = [
  {
    question: "Who is AudioFlash for?",
    answer:
      "AudioFlash is for beginner to intermediate learners who can study vocabulary but still struggle to follow spoken language.",
  },
  {
    question: "Which languages are in early access?",
    answer:
      "Spanish, French, Japanese, and Mandarin are first. Join the waitlist and pick your target language so we can prioritize invites.",
  },
  {
    question: "Is this a full course?",
    answer:
      "No. AudioFlash is a focused practice tool for listening and recall speed. It works well on its own or alongside your main course app.",
  },
  {
    question: "When will invites start?",
    answer:
      "We are rolling out early access in batches. Waitlist members get first notice and launch pricing details by email.",
  },
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
                Early access waitlist open for 4 launch languages
              </span>
            </div>

            <h1 className="text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-tight mb-6">
              Turn vocabulary
              <br />
              into real
              <br />
              <span className="text-primary">listening comprehension</span>
              <br />
              faster.
            </h1>

            <p className="text-lg text-muted leading-relaxed mb-8 max-w-md mx-auto lg:mx-0">
              Audio flashcards plus spaced repetition for Spanish, French,
              Japanese, and Mandarin. Build faster recall and better listening in
              five focused minutes a day.
            </p>

            <EmailForm variant="hero" />

            <div className="mt-4 flex flex-col items-center lg:items-start gap-2">
              <p className="text-xs text-muted pl-1">
                Get early access, launch pricing updates, and your first study deck.
              </p>
              <a href="#how-it-works" className="text-sm font-medium text-primary hover:underline">
                See how it works
              </a>
            </div>
          </div>

          {/* Right: phone mockup */}
          <div className="flex-shrink-0">
            <FlashcardMockup />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white border-y border-border py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground tracking-tight mb-3">
              Built for learners who want to understand spoken language
            </h2>
            <p className="text-muted max-w-md mx-auto">
              AudioFlash trains the gap between recognizing words and recalling
              them when you hear real speech.
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
      <section id="how-it-works" className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground tracking-tight mb-3">
            How AudioFlash works
          </h2>
          <p className="text-muted max-w-sm mx-auto">
            Simple loop: listen, recall, review.
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
            Early access is focused on Mandarin, Spanish, Japanese, and French.
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
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-foreground tracking-tight text-center mb-3">
            Waitlist FAQ
          </h2>
          <p className="text-muted text-center mb-10">
            Quick answers before you join.
          </p>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="bg-white border border-border rounded-2xl px-5 py-4"
              >
                <summary className="cursor-pointer list-none font-semibold text-foreground">
                  {faq.question}
                </summary>
                <p className="text-muted text-sm leading-relaxed mt-3">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
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
            Join early access before public launch
          </h2>
          <p className="text-white/80 mb-8 text-lg">
            We are inviting waitlist members first across iOS and Android.
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
