import { useState, useEffect } from "react";
import { X, Lock } from "lucide-react";

const TOTAL_SPOTS = 150;
// ↓ Mettre à jour manuellement jusqu'à ce qu'on ait le vrai chiffre Supabase
const TAKEN_SPOTS = 127;

const STORAGE_KEY = "founder-banner-dismissed";

const FounderBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem(STORAGE_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  const remaining = TOTAL_SPOTS - TAKEN_SPOTS;
  const pct = Math.round((TAKEN_SPOTS / TOTAL_SPOTS) * 100);

  return (
    <div className="relative flex items-center justify-center gap-3 border-b border-white/10 bg-white/5 px-4 py-2 text-center">
      <Lock className="h-3 w-3 shrink-0 text-white/50" />

      <p className="text-xs font-medium text-white/70">
        <span className="font-semibold text-white">{TAKEN_SPOTS}/{TOTAL_SPOTS}</span>
        {" "}places fondateurs prises ·{" "}
        <span>prix locké à vie, il reste <span className="font-semibold text-white">{remaining} places</span></span>
      </p>

      {/* Mini progress bar */}
      <div className="hidden w-20 shrink-0 overflow-hidden rounded-full bg-white/15 sm:block" style={{ height: "4px" }}>
        <div
          className="h-full rounded-full bg-white/60 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <a
        href="#pricing"
        onClick={() => {
          document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
        }}
        className="shrink-0 rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-white transition-colors hover:bg-white/20"
      >
        Réserver →
      </a>

      <button
        onClick={dismiss}
        aria-label="Fermer"
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-white/40 transition-colors hover:text-white"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default FounderBanner;
