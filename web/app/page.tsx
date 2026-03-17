import Image from "next/image";
import { BulletList } from "../components/BulletList";
import { SectionHeading } from "../components/SectionHeading";
import { FAQItem } from "../components/FAQItem";
import { EmailForm } from "../components/EmailForm";
import { FlashcardMockup } from "../components/phone/FlashcardMockup";
import { navLinks, heroBullets, painPoints, steps, features, realLifeMoments, faqs } from "../lib/content";

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
                Audio-first language practice for busy adults
              </span>
            </div>

            <h1 className="text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-tight mb-6">
              Audio Flashcards That Make Language Stick
            </h1>

            <p className="text-lg text-muted leading-relaxed mb-6 max-w-xl mx-auto lg:mx-0">
              Learn with audio flashcards built for listening
              comprehension and speaking recall. AudioFlash uses spaced
              repetition to help useful phrases stick in minutes a day.
            </p>

            <div className="mb-8 max-w-xl mx-auto lg:mx-0">
              <BulletList items={heroBullets} />
            </div>

            <div className="flex justify-center lg:justify-start">
              <EmailForm variant="hero" />
            </div>
          </div>

          <div className="flex-shrink-0">
            <FlashcardMockup />
          </div>
        </div>
      </section>

      <section className="bg-white border-y border-border py-20">
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-[0.8fr_1.2fr] gap-12 items-center">
          <div>
            <p className="text-sm font-semibold text-primary mb-3">
              Problem to solve
            </p>
            <h2 className="text-3xl font-bold text-foreground tracking-tight mb-4">
              Studying is not the same as hearing and answering real speech
            </h2>
            <p className="text-muted leading-relaxed">
              Many language apps make you better at recognizing words on a
              screen. AudioFlash is built for the moment someone speaks to you
              at full speed and you need to understand, recall, and respond.
            </p>
          </div>
          <div className="bg-background rounded-3xl p-6 border border-border">
            <BulletList items={painPoints} />
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-20">
        <SectionHeading
          title="Why audio flashcards work for language learning"
          description="Audio-first practice trains the skill you use in real life: hearing meaning through sound and answering without pausing to translate."
        />
        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-10 items-center">
          <div>
            <p className="text-lg text-muted leading-relaxed mb-5">
              Most apps are built for tapping and reading. That can help you
              recognize vocabulary on a screen, but real conversations move
              through sound. Audio flashcards train you to hear a phrase, pull
              the meaning quickly, and answer without panic.
            </p>
            <p className="text-lg text-muted leading-relaxed">
              AudioFlash pairs that audio-first workflow with spaced
              repetition, so you review important words and phrases close to the
              moment they would otherwise fade. That helps listening
              comprehension, recall speed, and speaking confidence improve
              together.
            </p>
          </div>
          <div className="bg-white rounded-3xl p-6 border border-border">
            <p className="text-sm font-semibold text-foreground mb-4">
              Listen - Recall - Repeat - Review
            </p>
            <div className="space-y-3">
              {[
                "Hear a useful phrase in context",
                "Pull the meaning or response from memory",
                "Repeat it until it feels more natural",
                "Review it again at the right interval",
              ].map((item) => (
                <div key={item} className="rounded-2xl bg-background px-4 py-3 text-sm text-muted">
                  {item}
                </div>
              ))}
            </div>
          </div>
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
          title="What you get in AudioFlash"
          description=""
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-white rounded-2xl p-5 border border-border"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
            >
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-sm font-semibold text-primary mb-4">
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
