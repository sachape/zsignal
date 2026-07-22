import { Clock3, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLATFORM_VALIDATION } from "@/lib/featureFlags";

type PlatformKey = keyof typeof PLATFORM_VALIDATION;

interface Props {
  platform: PlatformKey;
  variant?: "card" | "inline";
  className?: string;
  showLong?: boolean;
}

/**
 * Calm, brand-aligned "Bientôt" / "En validation" notice for Instagram,
 * YouTube and TikTok. Never shows raw OAuth errors to end-users.
 */
export default function PlatformValidationNotice({
  platform,
  variant = "card",
  className,
  showLong = true,
}: Props) {
  const meta = PLATFORM_VALIDATION[platform];
  const isSoon = platform === "tiktok";
  const Icon = isSoon ? Clock3 : Info;

  if (variant === "inline") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[12px] font-medium",
          "border-amber-400/30 bg-amber-400/5 text-amber-300",
          className,
        )}
      >
        <Icon className="h-3 w-3" />
        {meta.badge}
      </span>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-xs",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
        <div className="space-y-1">
          <p className="flex items-center gap-2 font-semibold text-amber-200">
            {meta.badge}
          </p>
          <p className="text-muted-foreground leading-relaxed">{meta.short}</p>
          {showLong && (
            <p className="text-muted-foreground/80 leading-relaxed">{meta.long}</p>
          )}
        </div>
      </div>
    </div>
  );
}
