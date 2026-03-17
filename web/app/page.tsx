"use client";

import Image from "next/image";
import { FormEvent, ReactNode, useState } from "react";

const navLinks = [
  { href: "#how-it-works", label: "How It Works" },
  { href: "#features", label: "Features" },
  { href: "#faq", label: "FAQ" },
];

const heroBullets = [
  "Hear real phrases and recall the meaning quickly.",
  "Strengthen long-term memory using scientifically proven spaced repetition.",
  "Quick lessons that train your ear for real conversations.",
];

const steps = [
  {
    number: "01",
    title: "Pick a lesson",
    description:
      "Pick from one of our curated lessons spanning several catagories or generate your own using AI.",
  },
  {
    number: "02",
    title: "Press play and practice anywhere",
    description:
      "Hear short, useful phrases. Practice active recall daily.",
  },
  {
    number: "03",
    title: "Review and build confidence",
    description:
      "Review answers and repeat the process to build your listening skills.",
  },
];

const features = [
  {
    icon: "01",
    title: "Train Fast Conversation Recall",
    description:
      "Hear a phrase, recall the meaning, and respond from memory. This builds the quick thinking needed when native speakers talk at full speed.",
  },
  {
    icon: "02",
    title: "Spaced Repetition That Adapts",
    description:
      "Review phrases right before you forget them. This timing strengthens long-term memory so recognition becomes faster over time.",
  },
  {
    icon: "03",
    title: "Set Goals And Track Your Progress",
    description:
      "Set daily or weekly goals and track your progress. See how your listening skills improve over time.",
  },
  {
    icon: "04",
    title: "Generate custom flashcards with AI",
    description:
      "Tailor your learning to your specific needs. Generate custom audio flashcards for any topic like travel, business, dating, interviews, and niche topics most language apps never cover.",
  },
];

const realLifeMoments = [
  "Commute-friendly practice for walks, trains, and drives",
  "Short sessions that fit between meetings, errands, and chores",
  "An audio-first workflow that works better than screen-heavy review when your day is packed",
];

const faqs = [
  {
    question: "What are audio flashcards for language learning?",
    answer:
      "Audio flashcards train you through sound first. You hear a phrase, recall the meaning or response, and repeat it so listening and speaking get trained together.",
  },
  {
    question: "How does spaced repetition help language learning?",
    answer:
      "Spaced repetition schedules reviews close to the point where you are likely to forget. That timing helps important words and phrases come back faster with less re-learning.",
  },
  {
    question: "Is AudioFlash good for beginners?",
    answer:
      "Yes. Beginners can start with short, high-frequency phrases and build listening confidence before moving into faster material.",
  },
  {
    question: "Can I use AudioFlash with another language app?",
    answer:
      "Yes. AudioFlash complements reading, grammar, and game-style apps by focusing on listening comprehension and speaking recall.",
  },
  {
    question: "How quickly will I notice progress?",
    answer:
      "Most learners notice listening recognition improving first. With short, consistent practice, recall speed and speaking confidence usually follow.",
  },
  {
    question: "Do I need long study sessions for AudioFlash to work?",
    answer:
      "No. AudioFlash is built for short, repeatable sessions, which makes five to ten minutes a day much easier to sustain.",
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


function PhoneCallout({ children }: { children: ReactNode }) {
  return (
    // Option 3: cursor hint + micro-scale on hover
    <div className="relative cursor-pointer transition-transform duration-300 hover:scale-[1.015]">
      {/* Pulsing ring behind the phone */}
      <div
        className="absolute inset-0 rounded-[44px] pointer-events-none"
        style={{
          boxShadow: "0 0 0 0 rgba(255,107,74,0.4)",
          animation: "phoneRing 2.2s ease-out infinite",
        }}
      />

      {children}
      <style>{`
        @keyframes phoneRing {
          0%   { box-shadow: 0 0 0 0px rgba(255,107,74,0.35); }
          70%  { box-shadow: 0 0 0 18px rgba(255,107,74,0); }
          100% { box-shadow: 0 0 0 0px rgba(255,107,74,0); }
        }
      `}</style>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item} className="flex items-start gap-3">
          <div className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />
          <p className="text-sm text-muted leading-relaxed">{item}</p>
        </div>
      ))}
    </div>
  );
}

function FlowDiagram({ items }: { items: string[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr] items-center">
      {listeningSkillSteps.map((step, index) => (
        <div key={step.title} className="contents">
          <div
            className="rounded-3xl border border-border bg-white p-6"
            style={{ boxShadow: "0 12px 30px rgba(15, 23, 42, 0.06)" }}
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-sm font-semibold text-primary">
              {step.icon}
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">{step.title}</h3>
            <p className="text-sm leading-relaxed text-muted">{step.description}</p>
          </div>
          {index < listeningSkillSteps.length - 1 ? (
            <div className="hidden md:flex items-center justify-center text-primary" aria-hidden="true">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/15 bg-white shadow-sm">
                <span className="text-lg font-semibold">→</span>
              </div>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="text-center mb-12">
      <h2 className="text-3xl font-bold text-foreground tracking-tight mb-3">
        {title}
      </h2>
      <p className="text-muted max-w-2xl mx-auto">{description}</p>
    </div>
  );
}

function LearningProgressChart() {
  return (
    <div
      className="rounded-3xl border border-border bg-white p-6"
      style={{ boxShadow: "0 12px 30px rgba(15, 23, 42, 0.06)" }}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Cards learned over time</p>
          <p className="mt-1 text-xs text-muted">Steady review compounds into faster recognition.</p>
        </div>
      </div>

      <div className="relative h-60 rounded-2xl bg-background pl-16 pr-6 pb-16 pt-4">
        <div className="absolute inset-y-4 left-10 w-px bg-border" />
        <div className="absolute left-10 right-6 bottom-18 h-px bg-border" />

        {[0, 1, 2, 3].map((tick) => (
          <div
            key={tick}
            className="absolute left-10 right-6 h-px border-t border-dashed border-border/80"
            style={{ bottom: `${18 + tick * 14}%` }}
          />
        ))}

        <svg
          viewBox="0 0 320 180"
          className="absolute left-10 right-6 top-4 bottom-18 h-[calc(100%-5.5rem)] w-[calc(100%-4rem)] overflow-visible"
          preserveAspectRatio="none"
          aria-label="Cards learned chart"
        >
          <defs>
            <linearGradient id="learningArea" x1="0%" x2="0%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,107,74,0.24)" />
              <stop offset="100%" stopColor="rgba(255,107,74,0.02)" />
            </linearGradient>
          </defs>
          <path
            d="M 18 150 C 44 146, 58 140, 82 132 C 108 122, 128 112, 152 95 C 180 76, 198 68, 220 54 C 242 40, 264 30, 302 18"
            fill="none"
            stroke="#FF6B4A"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d="M 18 150 C 44 146, 58 140, 82 132 C 108 122, 128 112, 152 95 C 180 76, 198 68, 220 54 C 242 40, 264 30, 302 18 L 302 170 L 18 170 Z"
            fill="url(#learningArea)"
          />
          {[
            { x: 18, y: 150 },
            { x: 82, y: 132 },
            { x: 152, y: 95 },
            { x: 220, y: 54 },
            { x: 302, y: 18 },
          ].map((point) => (
            <circle
              key={`${point.x}-${point.y}`}
              cx={point.x}
              cy={point.y}
              r="5"
              fill="#FFFFFF"
              stroke="#FF6B4A"
              strokeWidth="3"
            />
          ))}
        </svg>

        <div className="absolute left-[-24px] top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-medium uppercase tracking-[0.22em] text-muted">
          Cards learned
        </div>

        <div className="absolute bottom-8 left-14 right-10 flex justify-between text-xs text-muted">
          <span>Week 1</span>
          <span>Week 2</span>
          <span>Week 3</span>
          <span>Week 4</span>
        </div>
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] font-medium uppercase tracking-[0.22em] text-muted">
          Time
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
            <div className="flex flex-col flex-1">
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
        <div>
          <p className={`font-semibold text-sm ${variant === "cta" ? "text-white" : "text-foreground"}`}>
            You are on the list.
          </p>
          <p className={`text-xs mt-0.5 ${variant === "cta" ? "text-white/70" : "text-muted"}`}>
            We will email you when AudioFlash opens up early access.
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
          {status === "loading" ? "..." : "Get Free Early Access"}
        </button>
      </div>
      {status === "error" && (
        <p className="text-red-500 text-xs mt-2 pl-1">{errorMessage}</p>
      )}
    </form>
  );
}

function FAQItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  return (
    <details className="group rounded-2xl border border-border bg-white p-5">
      <summary className="cursor-pointer list-none font-semibold text-foreground pr-8 relative">
        {question}
        <span className="absolute right-0 top-0 text-muted transition-transform group-open:rotate-45">
          +
        </span>
      </summary>
      <p className="mt-3 text-sm leading-relaxed text-muted">{answer}</p>
    </details>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <a href="#" className="flex items-center gap-2 shrink-0">
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
          </a>
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </div>
          <a
            href="#waitlist"
            className="rounded-xl px-4 py-2 bg-primary text-white text-sm font-semibold transition-opacity hover:opacity-90"
          >
            Get Early Access
          </a>
        </div>
      </nav>

      <section className="max-w-6xl mx-auto px-6 pt-12 pb-16">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-accent rounded-full px-3 py-1.5 mb-6">
              <span className="text-xs font-medium text-primary">
                Listen first..then speak with Audio-first language practice
              </span>
            </div>

            <h1 className="text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-tight mb-6">
              Audio Flashcards That Make Language Stick
            </h1>

            <p className="text-lg text-muted leading-relaxed mb-6 max-w-xl mx-auto lg:mx-0">
              You studied vocabulary but still can't understand native speakers at full speed.
               Train your ear to understand real spoken language not just memorize vocabulary.
            </p>

            <div className="mb-8 max-w-xl mx-auto lg:mx-0">
              <BulletList items={heroBullets} />
            </div>

            <div className="flex justify-center lg:justify-start">
              <EmailForm variant="hero" />
            </div>
          </div>

          <div className="flex-shrink-0">
            <PhoneCallout>
              <FlashcardMockup />
            </PhoneCallout>
          </div>
        </div>
      </section>

      <section className="bg-white border-y border-border py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-sm font-semibold text-primary mb-4">
            Problem statement
          </p>

          <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight leading-tight mb-6">
            You Studied the Words… But Still Can’t Understand Real Speech
          </h2>

          <p className="text-lg text-muted leading-relaxed">
            You know the words. But when someone speaks quickly, your brain needs a second.
            Most apps are built for tapping and reading. That can help you recognize vocabulary
            on a screen, but real conversations move through sound.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-20">
        <SectionHeading
          title="Why audio flashcards train real listening skill"
          description="Hear the phrase. Understand the meaning. Respond without translating."
        />
        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-10 items-center">
          <div>
            <p className="text-lg text-muted leading-relaxed mb-5">
              Audio flashcards work because they combine active recall and spaced repetition two of the most effective learning techniques in cognitive science. Hearing a phrase and pulling the meaning from memory strengthens the brain’s sound-to-meaning connections, while spaced reviews reinforce them over time. 
              That’s why recognition becomes faster and real conversations feel easier to follow.
            </p>
          </div>
          <LearningProgressChart />
        </div>
      </section>

      <section id="how-it-works" className="bg-white border-y border-border py-20">
        <div className="max-w-6xl mx-auto px-6">
          <SectionHeading
            title="How it works"
            description="Choose a language, press play, and build listening and speaking recall through short repeated practice."
          />

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
        </div>
      </section>

      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <SectionHeading
          title="Built for Real Listening Fluency"
          description="AudioFlash combines audio flashcards, spaced repetition, and AI-generated content to build real listening and speaking recall."
        />
        <div className="grid gap-6 md:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-white rounded-3xl p-8 border border-border transition-transform duration-300 hover:-translate-y-1"
              style={{ boxShadow: "0 12px 30px rgba(15,23,42,0.06)" }}
            >
              <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center text-base font-semibold text-primary mb-6">
                {feature.icon}
              </div>
              <h3 className="font-semibold text-foreground text-2xl tracking-tight mb-3 max-w-sm">
                {feature.title}
              </h3>
              <p className="text-muted text-base leading-relaxed max-w-xl">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border-y border-border py-16">
        <div className="max-w-6xl mx-auto px-6">
          <SectionHeading
            title="Built for real life"
            description="AudioFlash is designed for the moments when you can realistically practice, not just when you can sit and stare at a screen."
          />
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            <div className="bg-background rounded-3xl p-6 border border-border">
              <BulletList items={realLifeMoments} />
            </div>
            <div className="bg-accent rounded-3xl p-6 border border-primary/10">
              <h3 className="font-semibold text-foreground text-lg mb-4">
                Why that matters
              </h3>
              <p className="text-muted leading-relaxed">
                The easiest language routine to keep is the one that fits into
                your day. AudioFlash is built for quick, repeatable practice so
                you can keep building listening fluency and speaking recall
                without needing perfect study conditions.
              </p>
            </div>
          </div>
        </div>
      </section>



      <section id="faq" className="max-w-6xl mx-auto px-6 py-20">
        <SectionHeading
          title="FAQ"
          description=""
        />
        <div className="grid gap-4 max-w-4xl mx-auto">
          {faqs.map((faq) => (
            <FAQItem key={faq.question} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </section>

      <section
        id="waitlist"
        className="py-24"
        style={{
          background: "linear-gradient(135deg, #FF6B4A 0%, #FF8F73 100%)",
        }}
      >
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white tracking-tight mb-4">
            Stop freezing when native speakers talk to you in their language.
          </h2>
          <p className="text-white/80 mb-8 text-lg">
            Get early access to audio flashcards built for listening
            comprehension, speaking recall, and short daily practice.
          </p>

          <div className="flex justify-center">
            <EmailForm variant="cta" />
          </div>

          <p className="text-white/60 text-xs mt-4">
            Join free. We will email you when early access opens.
          </p>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Image
              src="/AudioFlashLogo.png"
              alt="AudioFlash logo"
              width={24}
              height={24}
              className="w-6 h-6 object-contain"
            />
            <span className="font-semibold text-foreground text-sm">
              AudioFlash
            </span>
          </div>
          <p className="text-muted text-xs">
            Audio flashcards for language learning, built for listening and speaking recall.
          </p>
        </div>
      </footer>
    </div>
  );
}
