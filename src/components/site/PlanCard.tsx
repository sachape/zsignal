import { Check } from "lucide-react";

/** ElevenLabs-style pricing tier card (light tier, or featured dark tier). */
const PlanCard = ({
  name,
  price,
  future,
  period = "/mois",
  features,
  featured,
  badge,
  ctaLabel = "Commencer",
  onCta,
}: {
  name: string;
  price: string;
  future?: string;
  period?: string;
  features: string[];
  featured?: boolean;
  badge?: string;
  ctaLabel?: string;
  onCta: () => void;
}) => (
  <div
    className={
      featured
        ? "relative flex flex-col rounded-2xl bg-el-dark p-8 text-el-on-dark shadow-[0_24px_60px_-24px_rgba(0,0,0,0.45)]"
        : "relative flex flex-col rounded-2xl border border-el-hairline bg-el-card p-8 text-el-ink"
    }
  >
    {badge && (
      <span
        className={
          featured
            ? "absolute -top-3 left-8 rounded-full bg-el-on-dark px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-el-ink"
            : "absolute -top-3 left-8 rounded-full bg-el-ink px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-el-on-dark"
        }
      >
        {badge}
      </span>
    )}
    <p className="font-el-sans text-[15px] font-medium">{name}</p>
    <div className="mt-3 flex items-end gap-2">
      <span className="font-el-display text-[40px] font-light leading-none tracking-[-0.02em]">{price}</span>
      {price !== "0 €" && (
        <span className={featured ? "mb-1.5 text-[14px] text-el-on-dark-soft" : "mb-1.5 text-[14px] text-el-muted"}>{period}</span>
      )}
      {future && (
        <span className={featured ? "mb-1.5 text-[13px] text-el-on-dark-soft line-through" : "mb-1.5 text-[13px] text-el-muted-soft line-through"}>
          {future}
        </span>
      )}
    </div>
    <button
      onClick={onCta}
      className={
        featured
          ? "mt-6 inline-flex h-11 w-full items-center justify-center rounded-full bg-el-on-dark font-el-sans text-[15px] font-medium text-el-ink transition-opacity hover:opacity-90"
          : "mt-6 inline-flex h-11 w-full items-center justify-center rounded-full bg-el-ink font-el-sans text-[15px] font-medium text-el-on-dark transition-colors hover:bg-el-ink-soft"
      }
    >
      {ctaLabel}
    </button>
    <ul className="mt-7 space-y-3">
      {features.map((f) => (
        <li key={f} className="flex items-start gap-2.5">
          <Check className={featured ? "mt-0.5 h-4 w-4 shrink-0 text-el-mint" : "mt-0.5 h-4 w-4 shrink-0 text-el-ink"} />
          <span className={featured ? "font-el-sans text-[15px] leading-snug text-el-on-dark-soft" : "font-el-sans text-[15px] leading-snug text-el-body"}>
            {f}
          </span>
        </li>
      ))}
    </ul>
  </div>
);

export default PlanCard;
