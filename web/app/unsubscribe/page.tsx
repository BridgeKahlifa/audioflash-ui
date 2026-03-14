"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

function UnsubscribeContent() {
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const token = params.get("token") ?? "";

  const [status, setStatus] = useState<"checking" | "idle" | "loading" | "done" | "error">("checking");

  useEffect(() => {
    if (!email || !token) { setStatus("idle"); return; }
    fetch(`/api/unsubscribe?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => setStatus(data.alreadyUnsubscribed ? "done" : "idle"))
      .catch(() => setStatus("idle"));
  }, [email, token]);

  const handleUnsubscribe = async () => {
    setStatus("loading");
    const res = await fetch("/api/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, token }),
    });
    setStatus(res.ok ? "done" : "error");
  };

  if (!email || !token) {
    return <Message emoji="🚫" heading="Invalid link" body="This unsubscribe link is missing required information." />;
  }

  if (status === "checking") {
    return <Message emoji="⏳" heading="Loading…" body="" />;
  }

  if (status === "done") {
    return <Message emoji="✅" heading="You're unsubscribed" body={`${email} has been removed from the AudioFlash waitlist.`} />;
  }

  if (status === "error") {
    return <Message emoji="⚠️" heading="Something went wrong" body="We couldn't process your request. Please try again or reply to any email we've sent you." />;
  }

  return (
    <div style={{ maxWidth: 480, textAlign: "center" }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>🔕</div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1A1A1A", marginBottom: 12 }}>
        Unsubscribe
      </h1>
      <p style={{ fontSize: 16, color: "#737373", lineHeight: 1.6, marginBottom: 32 }}>
        Remove <strong style={{ color: "#1A1A1A" }}>{email}</strong> from the AudioFlash waitlist?
        You won't receive any further emails from us.
      </p>
      <button
        onClick={handleUnsubscribe}
        disabled={status === "loading"}
        style={{
          background: "#FF6B4A",
          color: "#fff",
          border: "none",
          borderRadius: 16,
          padding: "14px 32px",
          fontSize: 15,
          fontWeight: 600,
          cursor: "pointer",
          opacity: status === "loading" ? 0.6 : 1,
        }}
      >
        {status === "loading" ? "Processing…" : "Yes, unsubscribe me"}
      </button>
    </div>
  );
}

function Message({ emoji, heading, body }: { emoji: string; heading: string; body: string }) {
  return (
    <div style={{ maxWidth: 480, textAlign: "center" }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>{emoji}</div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1A1A1A", marginBottom: 12 }}>{heading}</h1>
      <p style={{ fontSize: 16, color: "#737373", lineHeight: 1.6 }}>{body}</p>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#FAFAFA",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
      fontFamily: "Inter, system-ui, sans-serif",
    }}>
      <Suspense>
        <UnsubscribeContent />
      </Suspense>
    </div>
  );
}
