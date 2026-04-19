import type { Metadata } from "next";
import { AuthModeBadge } from "../components/AuthModeBadge";
import { MatrixRain } from "../components/MatrixRain";
import { ThemeProvider } from "../components/ThemeProvider";
import { PostHogProvider } from "./providers";
import "./globals.css";

const themeInitScript = `
  (() => {
    const root = document.documentElement;
    root.classList.remove("dark");
    root.style.colorScheme = "light";
    window.localStorage.setItem("theme", "light");
  })();
`;

export const metadata: Metadata = {
  title: "Audio Flashcards for Language Learning | AudioFlash",
  description:
    "Learn a language with audio flashcards built on spaced repetition. Train listening and speaking recall in minutes a day with AudioFlash.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: ["/favicon.ico"],
  },
  openGraph: {
    title: "Audio Flashcards for Language Learning | AudioFlash",
    description:
      "Audio flashcards built for listening comprehension, speaking recall, and short daily language practice.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Audio Flashcards for Language Learning | AudioFlash",
    description:
      "Audio flashcards built for listening comprehension, speaking recall, and short daily language practice.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dbEnv = process.env.DB_ENV;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground font-sans antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <PostHogProvider>
          <ThemeProvider>
            <MatrixRain />
            <div className="matrix-shell relative z-10 min-h-screen">
              <AuthModeBadge authMode={dbEnv} />
              {children}
            </div>
          </ThemeProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
