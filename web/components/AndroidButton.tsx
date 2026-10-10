import Link from "next/link";

export function AndroidButton({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/android"
      aria-label="Download AudioFlash on Android"
      className={`inline-flex items-center gap-2.5 rounded-2xl bg-black px-5 py-2.5 text-white transition-opacity hover:opacity-85 ${className}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24a11.463 11.463 0 00-8.94 0L5.65 5.67c-.19-.29-.58-.38-.87-.2-.28.18-.37.54-.22.83L6.4 9.48A10.78 10.78 0 001 18h22a10.78 10.78 0 00-5.4-8.52zM7 15.25a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5zm10 0a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5z" />
      </svg>
      <span className="flex flex-col text-left leading-tight">
        <span className="text-[10px] font-medium text-white/80">Download on</span>
        <span className="text-base font-semibold">Android</span>
      </span>
    </Link>
  );
}
