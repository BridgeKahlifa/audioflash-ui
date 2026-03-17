import { ReactNode } from "react";

export function PhoneCallout({ children, pulsing }: { children: ReactNode; pulsing: boolean }) {
  return (
    <div className="relative transition-transform duration-300 hover:scale-[1.015]">
      {pulsing && (
        <div
          className="absolute inset-0 rounded-[44px] pointer-events-none"
          style={{ animation: "phoneRing 2.2s ease-out infinite" }}
        />
      )}
      {children}
      <style>{`
        @keyframes phoneRing {
          0%   { box-shadow: 0 0 0 0px rgba(255,107,74,0.35); }
          70%  { box-shadow: 0 0 0 18px rgba(255,107,74,0); }
          100% { box-shadow: 0 0 0 0px rgba(255,107,74,0); }
        }
        @keyframes btnPulse {
          0%   { box-shadow: 0 0 0 0px rgba(255,107,74,0.5), 0 4px 12px rgba(255,107,74,0.3); }
          70%  { box-shadow: 0 0 0 10px rgba(255,107,74,0),  0 4px 12px rgba(255,107,74,0.3); }
          100% { box-shadow: 0 0 0 0px rgba(255,107,74,0),   0 4px 12px rgba(255,107,74,0.3); }
        }
        @keyframes audioPulse {
          0%   { box-shadow: 0 0 0 0px rgba(255,107,74,0.45), 0 8px 24px rgba(255,107,74,0.35); }
          70%  { box-shadow: 0 0 0 14px rgba(255,107,74,0),   0 8px 24px rgba(255,107,74,0.35); }
          100% { box-shadow: 0 0 0 0px rgba(255,107,74,0),    0 8px 24px rgba(255,107,74,0.35); }
        }
      `}</style>
    </div>
  );
}
