import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { normalizeChannelInput } from "@/services/channelInputNormalizer";
import { cn } from "@/lib/utils";

/**
 * Free-diagnostic hook: enter a Twitch pseudo/URL → teaser StreamScore, no
 * account required. The homepage's primary conversion lever (value before
 * signup). `tone="dark"` for use on the ink CTA bands.
 */
const DiagnosticForm = ({
  tone = "light",
  className,
}: {
  tone?: "light" | "dark";
  className?: string;
}) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const dark = tone === "dark";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const login = normalizeChannelInput(username);
    if (!login) {
      setError("Entre un pseudo Twitch valide ou une URL twitch.tv/…");
      return;
    }
    setError(null);
    navigate(`/analyze?channel=${encodeURIComponent(login)}&mode=teaser`);
  };

  return (
    <form onSubmit={submit} className={cn("mx-auto max-w-lg", className)}>
      <div
        className={cn(
          "flex flex-col gap-2 rounded-2xl border p-2 transition-colors sm:flex-row sm:items-center sm:rounded-full",
          dark
            ? "border-white/15 bg-white/[0.06] focus-within:border-white/35"
            : "border-el-hairline-strong bg-el-card shadow-[0_12px_40px_-16px_rgba(0,0,0,0.18)] focus-within:border-el-ink/40",
        )}
      >
        <input
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            if (error) setError(null);
          }}
          placeholder="Ton pseudo Twitch (ex. ninja)"
          aria-label="Pseudo ou URL de ta chaîne Twitch"
          className={cn(
            "h-11 flex-1 bg-transparent px-4 font-el-sans text-[16px] outline-none",
            dark ? "text-el-on-dark placeholder:text-el-on-dark-soft" : "text-el-ink placeholder:text-el-muted-soft",
          )}
        />
        <button
          type="submit"
          className={cn(
            "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full px-6 font-el-sans text-[15px] font-medium transition-opacity hover:opacity-90",
            dark ? "bg-el-on-dark text-el-ink" : "bg-el-ink text-el-on-dark",
          )}
        >
          Analyser ma chaîne <ArrowRight className="h-4 w-4" />
        </button>
      </div>
      {error && (
        <p className={cn("mt-2 font-el-sans text-[13px]", dark ? "text-el-rose" : "text-[#dc2626]")}>{error}</p>
      )}
    </form>
  );
};

export default DiagnosticForm;
