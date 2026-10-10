import type { Metadata } from "next";
import Link from "next/link";

const CONTACT_EMAIL = "support@audioflash.ai";
const APK_URL = process.env.NEXT_PUBLIC_ANDROID_APK_URL;

export const metadata: Metadata = {
  title: "Download AudioFlash for Android | AudioFlash",
  description:
    "Download and install AudioFlash on your Android phone to practice languages with audio flashcards.",
};

const installSteps = [
  "Tap the download button on your Android phone.",
  "Open the downloaded file. If Android asks, allow installs from this source.",
  "Open AudioFlash and sign in with your email. We'll send you a 6-digit code.",
];

export default function AndroidPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16 sm:py-24">
      <Link href="/" className="text-sm font-medium text-primary hover:underline">
        ← Back to AudioFlash
      </Link>

      <header className="mt-8 mb-10">
        <p className="text-sm font-medium uppercase tracking-widest text-primary mb-3">Android</p>
        <h1 className="text-4xl font-bold tracking-tight text-foreground text-balance">
          Download AudioFlash for Android
        </h1>
        <p className="mt-4 text-muted leading-relaxed">
          AudioFlash for Android installs directly from a file instead of the Play Store. It takes
          about two minutes.
        </p>
      </header>

      {APK_URL ? (
        <a
          href={APK_URL}
          className="matrix-glow inline-block rounded-2xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Download for Android
        </a>
      ) : (
        <p className="text-muted leading-relaxed">
          Email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-primary hover:underline">
            {CONTACT_EMAIL}
          </a>{" "}
          and we&rsquo;ll send you the Android download.
        </p>
      )}

      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground tracking-tight mb-4">How to install</h2>
        <ol className="space-y-3 text-muted leading-relaxed">
          {installSteps.map((step, i) => (
            <li key={step} className="flex gap-3">
              <span className="font-semibold text-primary">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <p className="mt-12 text-sm text-muted">
        Trouble installing? Email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-primary hover:underline">
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </main>
  );
}
