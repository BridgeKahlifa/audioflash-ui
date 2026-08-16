import type { Metadata } from "next";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Review these before publishing — swap in your real legal entity, contact
// address, and governing-law jurisdiction. Everything else reads from here.
// ---------------------------------------------------------------------------
const COMPANY = "AudioFlash";
const CONTACT_EMAIL = "support@audioflash.ai";
const EFFECTIVE_DATE = "August 16, 2026";
const GOVERNING_LAW = "the State of Delaware, United States";

export const metadata: Metadata = {
  title: "Terms of Service | AudioFlash",
  description:
    "The terms that govern your use of the AudioFlash audio flashcard language-learning app and website.",
};

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-2xl font-bold text-foreground tracking-tight mb-4">{title}</h2>
      <div className="space-y-4 text-muted leading-relaxed">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16 sm:py-24">
      <Link href="/" className="text-sm font-medium text-primary hover:underline">
        ← Back to AudioFlash
      </Link>

      <header className="mt-8 mb-12">
        <p className="text-sm font-medium uppercase tracking-widest text-primary mb-3">Legal</p>
        <h1 className="text-4xl font-bold tracking-tight text-foreground text-balance">Terms of Service</h1>
        <p className="mt-4 text-muted">Effective {EFFECTIVE_DATE}</p>
      </header>

      <div className="space-y-12">
        <Section id="acceptance" title="1. Acceptance of these terms">
          <p>
            These Terms of Service (&ldquo;Terms&rdquo;) are a legal agreement between you and {COMPANY}{" "}
            (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) governing your use of our mobile
            apps, website, and related services (the &ldquo;Service&rdquo;). By creating an account or
            using the Service, you agree to these Terms and to our{" "}
            <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>. If you
            don&rsquo;t agree, don&rsquo;t use the Service.
          </p>
        </Section>

        <Section id="eligibility" title="2. Eligibility">
          <p>
            You must be at least 13 years old (or the minimum age of digital consent in your country) to
            use the Service. If you use it on behalf of an organization, you represent that you&rsquo;re
            authorized to accept these Terms for them.
          </p>
        </Section>

        <Section id="service" title="3. The Service">
          <p>
            {COMPANY} generates language-learning flashcards using AI, plays them aloud, and helps you
            practice with spaced repetition while tracking your progress. We may add, change, or remove
            features at any time.
          </p>
        </Section>

        <Section id="accounts" title="4. Your account">
          <p>
            You&rsquo;re responsible for activity that happens under your account and for keeping your
            login secure. Provide accurate information when you sign up, and let us know promptly if you
            suspect unauthorized use.
          </p>
        </Section>

        <Section id="acceptable-use" title="5. Acceptable use">
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Use the Service for any unlawful, harmful, or abusive purpose.</li>
            <li>Attempt to disrupt, reverse-engineer, or gain unauthorized access to the Service or its systems.</li>
            <li>Use automated means to scrape or overload the Service, or resell it without our permission.</li>
            <li>Submit content that infringes others&rsquo; rights or violates applicable law.</li>
          </ul>
        </Section>

        <Section id="ai-content" title="6. AI-generated content">
          <p>
            Flashcards and translations are produced by AI and <strong className="text-foreground">may be
            inaccurate or incomplete</strong>. They are provided for language-learning practice only and
            are not professional translation, linguistic, or other advice. You&rsquo;re responsible for how
            you use generated content, and you should verify anything important.
          </p>
        </Section>

        <Section id="your-content" title="7. Your content">
          <p>
            You retain ownership of the topics and prompts you enter. You grant us a limited license to
            process that content as needed to operate the Service — including sending it to our AI provider
            to generate your lessons, as described in our{" "}
            <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
          </p>
        </Section>

        <Section id="ip" title="8. Our intellectual property">
          <p>
            The Service, including its software, design, branding, and content we create, is owned by
            {" "}{COMPANY} and protected by intellectual-property laws. We grant you a personal,
            non-exclusive, non-transferable, revocable license to use the Service for your own learning.
          </p>
        </Section>

        <Section id="payments" title="9. Paid features">
          <p>
            Some features may require payment. Where the Service offers subscriptions or in-app purchases,
            they are billed through the Apple App Store or Google Play under their terms, and are subject to
            those stores&rsquo; pricing, renewal, and refund policies. Unless required by law or store
            policy, payments are non-refundable. You can manage or cancel subscriptions in your app store
            account settings.
          </p>
        </Section>

        <Section id="third-party" title="10. Third-party services">
          <p>
            The Service relies on third parties (such as authentication, analytics, AI, and app-store
            providers). We&rsquo;re not responsible for their services, and your use of them may be subject
            to their own terms.
          </p>
        </Section>

        <Section id="disclaimer" title="11. Disclaimers">
          <p>
            The Service is provided <strong className="text-foreground">&ldquo;as is&rdquo; and &ldquo;as
            available&rdquo;</strong> without warranties of any kind, whether express or implied, including
            merchantability, fitness for a particular purpose, and non-infringement. We don&rsquo;t warrant
            that the Service will be uninterrupted, error-free, or that generated content will be accurate.
          </p>
        </Section>

        <Section id="liability" title="12. Limitation of liability">
          <p>
            To the maximum extent permitted by law, {COMPANY} will not be liable for any indirect,
            incidental, special, consequential, or punitive damages, or for lost profits or data, arising
            from your use of the Service. Our total liability for any claim relating to the Service will not
            exceed the greater of the amount you paid us in the twelve months before the claim or USD $50.
          </p>
        </Section>

        <Section id="termination" title="13. Termination">
          <p>
            You may stop using the Service and delete your account at any time. We may suspend or terminate
            your access if you violate these Terms or if we discontinue the Service. Sections that by their
            nature should survive termination will survive.
          </p>
        </Section>

        <Section id="governing-law" title="14. Governing law">
          <p>
            These Terms are governed by the laws of {GOVERNING_LAW}, without regard to conflict-of-law
            rules. Disputes will be resolved in the courts located there, unless applicable law provides
            otherwise.
          </p>
        </Section>

        <Section id="changes" title="15. Changes to these terms">
          <p>
            We may update these Terms from time to time. When we make material changes, we&rsquo;ll update
            the effective date above and provide reasonable notice. Continuing to use the Service after
            changes take effect means you accept the updated Terms.
          </p>
        </Section>

        <Section id="contact" title="16. Contact us">
          <p>
            Questions about these Terms? Email us at{" "}
            <a className="text-primary hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>
        </Section>
      </div>

      <footer className="mt-16 pt-8 border-t border-border text-sm text-muted">
        <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
        <span className="mx-2">·</span>
        <Link href="/" className="text-primary hover:underline">Home</Link>
      </footer>
    </main>
  );
}
