import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Audio Flashcards for Language Learning | AudioFlash",
  description:
    "Learn a language with audio flashcards built on spaced repetition. Train listening and speaking recall in minutes a day with AudioFlash.",
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
