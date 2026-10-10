import type { Metadata } from "next";
import Link from "next/link";

const CONTACT_EMAIL = "support@audioflash.ai";
const TESTER_GROUP_URL = "https://groups.google.com/u/2/g/audio-flash-tester-beta1";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.audioflash.app&hl=en-US&ah=fh-cn3uo-1TV0vwF2iJ_N6q2psY";

export const metadata: Metadata = {
  title: "Download AudioFlash for Android | AudioFlash",
  description:
    "Join the AudioFlash Android beta and download the app from the Google Play Store.",
};

export default function AndroidPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16 sm:py-24">
      <Link href="/" className="text-sm font-medium text-primary hover:underline">
        &larr; Back to AudioFlash
      </Link>

      <header className="mt-8 mb-10">
        <p className="mb-3 text-sm font-medium uppercase tracking-widest text-primary">Android</p>
        <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground">
          Download AudioFlash for Android
        </h1>
        <p className="mt-4 leading-relaxed text-muted">
          AudioFlash is currently available through our Google Play beta. Follow these two steps to
          get access.
        </p>
      </header>

      <section>
        <h2 className="mb-5 text-2xl font-bold tracking-tight text-foreground">How to install</h2>
        <ol className="space-y-8">
          <li className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
              1
            </span>
            <div>
              <h3 className="font-semibold text-foreground">Join the tester group</h3>
              <p className="mt-1 leading-relaxed text-muted">
                The Google account you use to join the group must use the same email address as the
                account signed in to the Google Play Store on your Android device.
              </p>
              <a
                href={TESTER_GROUP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="matrix-glow mt-4 inline-block rounded-2xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Join the tester group
              </a>
            </div>
          </li>

          <li className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
              2
            </span>
            <div>
              <h3 className="font-semibold text-foreground">Download AudioFlash</h3>
              <p className="mt-1 leading-relaxed text-muted">
                After you have joined the tester group, download AudioFlash from the Google Play
                Store.
              </p>
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="matrix-glow mt-4 inline-block rounded-2xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Download from Google Play
              </a>
            </div>
          </li>
        </ol>
      </section>

      <section className="mt-14 border-t border-border pt-10">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Not hearing audio?</h2>
        <p className="mt-3 leading-relaxed text-muted">
          Make sure text-to-speech (TTS) is installed for the language you want to learn. On a
          Samsung Galaxy S21, you can test Samsung&rsquo;s built-in speech system:
        </p>
        <ol className="mt-5 space-y-3 leading-relaxed text-muted">
          <li className="flex gap-3">
            <span className="font-semibold text-primary">1.</span>
            <span>Open Settings.</span>
          </li>
          <li className="flex gap-3">
            <span className="font-semibold text-primary">2.</span>
            <span>
              Go to <span className="font-medium text-foreground">General management</span> &rarr;{
              " "
              }
              <span className="font-medium text-foreground">Text-to-speech</span>.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-semibold text-primary">3.</span>
            <span>Tap the Play button.</span>
          </li>
        </ol>
        <div className="mt-6 rounded-2xl border border-border p-5 text-sm leading-relaxed text-muted">
          <p>
            <span className="font-semibold text-foreground">No sound:</span> Your device&rsquo;s TTS
            configuration is the problem. Check that a voice is installed for your target language.
          </p>
          <p className="mt-3">
            <span className="font-semibold text-foreground">The sample speaks:</span> System TTS is
            working. Try AudioFlash again; if it remains silent, contact us below.
          </p>
        </div>
      </section>

      <p className="mt-12 text-sm text-muted">
        Need help? Email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-primary hover:underline">
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </main>
  );
}
