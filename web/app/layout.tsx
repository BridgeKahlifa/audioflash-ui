import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Audio Flashcards for Language Learning | AudioFlash",
  description:
    "Learn a language with AI-powered audio flashcards and spaced repetition. Practice listening and speaking in Spanish, French, Japanese, or Mandarin — just minutes a day.",
  openGraph: {
    title: "Audio Flashcards for Language Learning | AudioFlash",
    description:
      "Learn a language with AI-powered audio flashcards and spaced repetition. Practice listening and speaking in Spanish, French, Japanese, or Mandarin — just minutes a day.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-foreground font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
