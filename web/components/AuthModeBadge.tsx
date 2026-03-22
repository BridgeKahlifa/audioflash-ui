"use client";

import { usePathname } from "next/navigation";

type AuthModeBadgeProps = {
  authMode?: string;
};

export function AuthModeBadge({ authMode }: AuthModeBadgeProps) {
  const pathname = usePathname();
  const normalizedAuthMode = authMode?.trim();

  if (!normalizedAuthMode || normalizedAuthMode.toLowerCase() === "prod" || pathname === "/") {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex justify-center px-4">
      <div className="rounded-full border border-orange-200 bg-orange-50/95 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-orange-700 shadow-sm backdrop-blur">
        {normalizedAuthMode}
      </div>
    </div>
  );
}
