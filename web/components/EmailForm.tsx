"use client";

import { FormEvent, useState } from "react";
import { usePostHog } from "posthog-js/react";

export function EmailForm({ variant = "hero" }: { variant?: "hero" | "cta" }) {
  const posthog = usePostHog();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || status === "loading") return;

    setStatus("loading");
    setErrorMessage("");
    posthog?.capture("waitlist_form_submitted", { variant });

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setStatus("success");
        setEmail("");
        posthog?.capture("waitlist_signup_success", { variant });
      } else {
        const data = await res.json();
        setErrorMessage(data.error || "Something went wrong. Try again.");
        setStatus("error");
        posthog?.capture("waitlist_signup_error", { variant, error: data.error });
      }
    } catch {
      setErrorMessage("Something went wrong. Try again.");
      setStatus("error");
      posthog?.capture("waitlist_signup_error", { variant, error: "network_error" });
    }
  };

  if (status === "success") {
    return (
      <div className={`flex items-center gap-3 rounded-2xl px-5 py-4 ${variant === "hero" ? "matrix-panel border border-border bg-accent" : "border border-white/15 bg-white/10"}`}>
        <div>
          <p className={`text-sm font-semibold ${variant === "cta" ? "text-white" : "text-foreground"}`}>
            You are on the list.
          </p>
          <p className={`mt-0.5 text-xs ${variant === "cta" ? "text-white/70" : "text-muted"}`}>
            We will email you when AudioFlash opens up early access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md">
      <div className="flex flex-wrap gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className={`min-w-0 flex-1 basis-48 rounded-2xl px-4 py-3.5 text-sm outline-none transition-all ${
            variant === "hero"
              ? "matrix-panel border border-border bg-card text-foreground placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/10"
              : "bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:border-white/50"
          }`}
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="matrix-glow w-full whitespace-nowrap rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto"
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
