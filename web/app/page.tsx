import Image from "next/image";
import { BulletList } from "../components/BulletList";
import { EmailForm } from "../components/EmailForm";
import { FAQItem } from "../components/FAQItem";
import { SectionHeading } from "../components/SectionHeading";
import { FlashcardMockup } from "../components/phone/FlashcardMockup";
import {
  navLinks,
  heroBullets,
  steps,
  features,
  faqs,
} from "../lib/content";

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

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
          <a href="#" className="flex shrink-0 items-center gap-2">
            <Image
              src="/AudioFlashLogo.png"
              alt="AudioFlash logo"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
              priority
            />
            <span className="text-lg font-semibold tracking-tight text-foreground">AudioFlash</span>
          </a>
          <div className="hidden items-center gap-6 md:flex">
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
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 whitespace-nowrap"
          >
            <span className="sm:hidden">Join Free</span>
            <span className="hidden sm:inline">Get Free Early Access</span>
          </a>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-12">
        <div className="flex flex-col items-center gap-16 lg:flex-row">
          <div className="flex-1 text-center lg:text-left">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1.5">
              <span className="text-xs font-medium text-primary">
                Listen first, then speak with audio-first language practice
              </span>
            </div>

            <h1 className="mb-6 text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl lg:text-6xl">
              Audio Flashcards That Make Language Stick
            </h1>

            <p className="mx-auto mb-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg lg:mx-0">
              You may know the vocabulary, but fast native speech still feels impossible to
              follow. Train your ear to understand real spoken language, not just memorize words.
            </p>

            <div className="mx-auto mb-8 max-w-xl text-left lg:mx-0">
              <BulletList items={heroBullets} />
            </div>

            <div className="flex justify-center lg:justify-start">
              <EmailForm variant="hero" />
            </div>
          </div>

          <div className="w-full max-w-[300px] mx-auto lg:flex-shrink-0 lg:w-auto lg:max-w-none">
            <FlashcardMockup />
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-white py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">


          <h2 className="mb-6 text-3xl font-bold leading-tight tracking-tight text-foreground md:text-4xl">
            You Studied the Words... But Still Can't Understand Real Speech
          </h2>

          <p className="text-lg leading-relaxed text-muted">
            You know the words. But when someone speaks quickly, your brain needs a second. Most
            apps are built for tapping and reading. That can help you recognize vocabulary on a
            screen, but real conversations move through sound.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <SectionHeading
          title="Why Audio Flashcards Train Real Listening Skill"
          description="Hear the phrase. Understand the meaning without translating in your head."
        />
        <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="mb-5 text-lg leading-relaxed text-muted">
              Two of the most effective learning techniques in cognitive science are active recall
              and spaced repetition. AudioFlash combines both of them by not showing the answer
              until you&apos;ve tried to recall it first and then spacing the reviews to reinforce
              long-term retention.
            </p>
          </div>
          <LearningProgressChart />
        </div>
      </section>

      <section id="how-it-works" className="border-y border-border bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <SectionHeading
            title="How it works"
            description="Choose a language, press play, and build listening recall through short repeated practice."
          />

          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="relative">
                <div className="mb-4 text-5xl font-bold leading-none text-border">{step.number}</div>
                <h3 className="mb-2 font-semibold text-foreground">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <SectionHeading
          title="Features That Build Real Fluency"
          description="AudioFlash combines audio flashcards, spaced repetition, and AI-generated content to build real listening and speaking recall."
        />
        <div className="grid gap-6 md:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-3xl border border-border bg-white p-8 transition-transform duration-300 hover:-translate-y-1"
              style={{ boxShadow: "0 12px 30px rgba(15,23,42,0.06)" }}
            >
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-base font-semibold text-primary">
                {feature.icon}
              </div>
              <h3 className="mb-3 max-w-sm text-2xl font-semibold tracking-tight text-foreground">
                {feature.title}
              </h3>
              <p className="max-w-xl text-base leading-relaxed text-muted">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="faq" className="border-y border-border bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <SectionHeading title="FAQ" description="" />
          <div className="mx-auto grid max-w-4xl gap-4">
            {faqs.map((faq) => (
              <FAQItem key={faq.question} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </div>
      </section>

      <section
        id="waitlist"
        className="py-24"
        style={{ background: "linear-gradient(135deg, #FF6B4A 0%, #FF8F73 100%)" }}
      >
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="mb-4 text-4xl font-bold tracking-tight text-white">
            Stop freezing when native speakers talk to you in their language.
          </h2>
          <p className="mb-8 text-lg text-white/80">
            Get free early access to audio flashcards built for listening comprehension, speaking
            recall, and short daily practice.
          </p>

          <div className="flex justify-center">
            <EmailForm variant="cta" />
          </div>

          <p className="mt-4 text-xs text-white/60">
            Join free. We will email you when early access opens.
          </p>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <Image
              src="/AudioFlashLogo.png"
              alt="AudioFlash logo"
              width={24}
              height={24}
              className="h-6 w-6 object-contain"
            />
            <span className="text-sm font-semibold text-foreground">AudioFlash</span>
          </div>
          <p className="text-xs text-muted">
            Audio flashcards for language learning, built for listening and speaking recall.
          </p>
        </div>
      </footer>
    </div>
  );
}
