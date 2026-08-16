import type { Metadata } from "next";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Review these before publishing — swap in your real legal entity, contact
// address, and jurisdiction. Everything else on the page reads from here.
// ---------------------------------------------------------------------------
const COMPANY = "AudioFlash";
const CONTACT_EMAIL = "support@audioflash.ai";
const EFFECTIVE_DATE = "August 16, 2026";

export const metadata: Metadata = {
  title: "Privacy Policy | AudioFlash",
  description:
    "How AudioFlash collects, uses, and protects your information when you use our audio flashcard language-learning app and website.",
};

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-2xl font-bold text-foreground tracking-tight mb-4">{title}</h2>
      <div className="space-y-4 text-muted leading-relaxed">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16 sm:py-24">
      <Link href="/" className="text-sm font-medium text-primary hover:underline">
        ← Back to AudioFlash
      </Link>

      <header className="mt-8 mb-12">
        <p className="text-sm font-medium uppercase tracking-widest text-primary mb-3">Privacy</p>
        <h1 className="text-4xl font-bold tracking-tight text-foreground text-balance">Privacy Policy</h1>
        <p className="mt-4 text-muted">Effective {EFFECTIVE_DATE}</p>
      </header>

      <div className="space-y-12">
        <Section id="intro" title="Overview">
          <p>
            {COMPANY} (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) makes an audio-first
            language-learning app that generates flashcards, reads them aloud, and tracks your progress
            over time. This policy explains what information we collect through our mobile apps and
            website, how we use it, and the choices you have. By using {COMPANY}, you agree to this policy.
          </p>
        </Section>

        <Section id="collect" title="Information we collect">
          <p><strong className="text-foreground">Account information.</strong> When you sign up we collect your email address. If you sign in with Google or a passkey, we receive the basic account identifiers needed to authenticate you. We do not receive your Google password.</p>
          <p><strong className="text-foreground">Learning data.</strong> The decks, topics, and languages you create, your practice sessions, scores, streaks, and progress statistics. This is stored so your progress syncs across sessions and devices.</p>
          <p><strong className="text-foreground">Content you enter.</strong> The topics and prompts you type to generate lessons. As described below, these are sent to a third-party AI provider to produce your flashcards.</p>
          <p><strong className="text-foreground">Usage and device data.</strong> We use product analytics to understand how the app is used — screens viewed, features used, general device and app-version information, and crash/diagnostic data. Our analytics includes <strong className="text-foreground">session replay</strong>, which records anonymized in-app interactions (taps and navigation) to help us find and fix problems. We do not use session replay to capture the contents of password fields.</p>
          <p><strong className="text-foreground">Waitlist and marketing.</strong> If you join our waitlist or beta on the website, we collect the email address you provide so we can contact you about {COMPANY}.</p>
        </Section>

        <Section id="use" title="How we use your information">
          <ul className="list-disc pl-5 space-y-2">
            <li>To provide the core service — generating lessons, playing audio, and saving your progress.</li>
            <li>To authenticate you and keep your account secure.</li>
            <li>To improve the product through analytics and diagnostics.</li>
            <li>To communicate with you about the app, beta program, and updates you&rsquo;ve signed up for.</li>
            <li>To comply with legal obligations and enforce our terms.</li>
          </ul>
        </Section>

        <Section id="ai" title="AI-generated content">
          <p>
            When you generate a lesson, the topic and language you choose are sent to our AI gateway
            provider (OpenRouter) and the underlying model it routes to, in order to create your
            flashcards. Do not enter sensitive personal information into lesson prompts. AI-generated
            content can be inaccurate; it is provided for learning practice, not as professional
            translation or advice.
          </p>
          <p>
            Audio playback (text-to-speech) is generated <strong className="text-foreground">on your device</strong>{" "}
            and is not sent to our servers.
          </p>
        </Section>

        <Section id="processors" title="Service providers we share data with">
          <p>We don&rsquo;t sell your personal information. We share it only with providers that help us run the service:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-secondary text-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Provider</th>
                  <th className="px-4 py-3 font-semibold">Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr><td className="px-4 py-3 font-medium text-foreground">Supabase</td><td className="px-4 py-3">Authentication and database (accounts, learning data)</td></tr>
                <tr><td className="px-4 py-3 font-medium text-foreground">PostHog</td><td className="px-4 py-3">Product analytics and session replay</td></tr>
                <tr><td className="px-4 py-3 font-medium text-foreground">OpenRouter</td><td className="px-4 py-3">AI gateway for generating flashcard content</td></tr>
                <tr><td className="px-4 py-3 font-medium text-foreground">Resend</td><td className="px-4 py-3">Sending transactional and beta emails</td></tr>
                <tr><td className="px-4 py-3 font-medium text-foreground">Google</td><td className="px-4 py-3">Optional &ldquo;Sign in with Google&rdquo; authentication</td></tr>
                <tr><td className="px-4 py-3 font-medium text-foreground">Apple / Google Play</td><td className="px-4 py-3">App distribution and, where applicable, in-app purchases</td></tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="retention" title="Data retention">
          <p>
            We keep your account and learning data for as long as your account is active. If you delete
            your account, we delete or anonymize the associated personal data within a reasonable period,
            except where we must retain it to meet legal obligations.
          </p>
        </Section>

        <Section id="rights" title="Your choices and rights">
          <p>Depending on where you live, you may have the right to access, correct, export, or delete your personal information, and to object to or restrict certain processing.</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong className="text-foreground">Account data:</strong> request access or deletion by emailing us at the address below.</li>
            <li><strong className="text-foreground">Marketing emails:</strong> unsubscribe using the link in any email we send.</li>
            <li><strong className="text-foreground">Analytics:</strong> where required, we honor applicable opt-out signals and consent choices.</li>
          </ul>
          <p>To exercise any right, contact us at <a className="text-primary hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
        </Section>

        <Section id="children" title="Children&rsquo;s privacy">
          <p>
            {COMPANY} is not directed to children under 13 (or the minimum age required in your country),
            and we do not knowingly collect personal information from them. If you believe a child has
            provided us information, contact us and we will delete it.
          </p>
        </Section>

        <Section id="security" title="Security">
          <p>
            We use industry-standard measures — including encryption in transit and access controls — to
            protect your information. No method of transmission or storage is completely secure, so we
            cannot guarantee absolute security.
          </p>
        </Section>

        <Section id="international" title="International users">
          <p>
            We operate in the United States and may process your information in the U.S. and other
            countries. Where required, we rely on appropriate safeguards for cross-border transfers.
          </p>
        </Section>

        <Section id="changes" title="Changes to this policy">
          <p>
            We may update this policy from time to time. When we do, we&rsquo;ll revise the effective date
            above and, for material changes, provide additional notice.
          </p>
        </Section>

        <Section id="contact" title="Contact us">
          <p>
            Questions about this policy or your data? Email us at{" "}
            <a className="text-primary hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>
        </Section>
      </div>

      <footer className="mt-16 pt-8 border-t border-border text-sm text-muted">
        <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
        <span className="mx-2">·</span>
        <Link href="/" className="text-primary hover:underline">Home</Link>
      </footer>
    </main>
  );
}
