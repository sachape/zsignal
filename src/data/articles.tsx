import type { ReactNode } from "react";

export interface Article {
  slug: string;
  category: string;
  categoryColor: string;
  title: string;
  excerpt: string;
  readingTime: number;
  publishedAt: string;
  keywords: string[];
  metaDescription: string;
  illustration: ReactNode;
  tableOfContents: { id: string; label: string }[];
  content: ReactNode;
}

// ─── Shared content primitives ───────────────────────────────────────────────

const H2 = ({ id, children }: { id: string; children: ReactNode }) => (
  <h2
    id={id}
    className="mt-12 scroll-mt-24 text-2xl font-bold tracking-tight text-foreground first:mt-0"
  >
    {children}
  </h2>
);

const H3 = ({ children }: { children: ReactNode }) => (
  <h3 className="mt-8 text-lg font-semibold text-foreground">{children}</h3>
);

const P = ({ children }: { children: ReactNode }) => (
  <p className="mt-4 text-[15px] leading-[1.8] text-foreground/75">{children}</p>
);

const Ul = ({ children }: { children: ReactNode }) => (
  <ul className="mt-4 space-y-2 text-[15px] leading-[1.8] text-foreground/75">{children}</ul>
);

const Li = ({ children }: { children: ReactNode }) => (
  <li className="flex gap-2.5">
    <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
    <span>{children}</span>
  </li>
);

const Callout = ({
  icon,
  title,
  children,
}: {
  icon?: string;
  title?: string;
  children: ReactNode;
}) => (
  <div className="my-8 rounded-xl border border-primary/20 bg-primary/[0.04] p-5">
    {(icon || title) && (
      <div className="mb-2 flex items-center gap-2">
        {icon && <span className="text-base">{icon}</span>}
        {title && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">
            {title}
          </p>
        )}
      </div>
    )}
    <div className="text-[14px] leading-[1.75] text-foreground/80">{children}</div>
  </div>
);

const StatBlock = ({
  stats,
}: {
  stats: { value: string; label: string }[];
}) => (
  <div
    className={`my-8 grid gap-4 rounded-xl border border-white/[0.06] bg-card/40 p-6 ${
      stats.length === 3
        ? "grid-cols-3"
        : stats.length === 2
        ? "grid-cols-2"
        : "grid-cols-1"
    }`}
  >
    {stats.map((s) => (
      <div key={s.label} className="text-center">
        <p className="bg-gradient-to-b from-primary to-primary/60 bg-clip-text text-3xl font-bold tabular-nums text-transparent">
          {s.value}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">{s.label}</p>
      </div>
    ))}
  </div>
);

const ToolCard = ({
  name,
  badge,
  desc,
  pros,
  cons,
}: {
  name: string;
  badge: string;
  desc: string;
  pros: string[];
  cons: string[];
}) => (
  <div className="my-6 rounded-xl border border-white/[0.06] bg-card/40 p-5">
    <div className="flex items-center justify-between gap-3">
      <p className="font-semibold text-foreground">{name}</p>
      <span className="rounded-full border border-border/50 bg-muted/30 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {badge}
      </span>
    </div>
    <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
    <div className="mt-4 grid grid-cols-2 gap-4 text-[13px]">
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-primary/70">
          Points forts
        </p>
        <ul className="space-y-1">
          {pros.map((p) => (
            <li key={p} className="flex items-start gap-1.5 text-foreground/70">
              <span className="mt-0.5 text-primary">+</span> {p}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
          Limites
        </p>
        <ul className="space-y-1">
          {cons.map((c) => (
            <li key={c} className="flex items-start gap-1.5 text-foreground/50">
              <span className="mt-0.5">–</span> {c}
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>
);

const NumberedStep = ({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) => (
  <div className="mt-8 flex gap-4">
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-sm font-bold tabular-nums text-primary">
      {n}
    </div>
    <div className="min-w-0 flex-1 pt-0.5">
      <p className="font-semibold text-foreground">{title}</p>
      <div className="mt-1.5 text-[14px] leading-[1.75] text-foreground/70">{children}</div>
    </div>
  </div>
);

// ─── SVG Illustrations ────────────────────────────────────────────────────────

const IlluGrowth = () => (
  <svg viewBox="0 0 600 280" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
    <defs>
      <linearGradient id="g1" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stopColor="hsl(95,98%,61%)" stopOpacity="0" />
        <stop offset="100%" stopColor="hsl(95,98%,61%)" stopOpacity="0.18" />
      </linearGradient>
      <linearGradient id="g1s" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="hsl(95,98%,61%)" stopOpacity="0.3" />
        <stop offset="100%" stopColor="hsl(95,98%,61%)" stopOpacity="0.9" />
      </linearGradient>
    </defs>
    {/* Grid lines */}
    {[60, 120, 180, 240].map((y) => (
      <line key={y} x1="40" y1={y} x2="560" y2={y} stroke="white" strokeOpacity="0.05" strokeWidth="1" />
    ))}
    {/* Area fill */}
    <path d="M40 240 L120 210 L200 195 L280 160 L360 130 L440 90 L520 55 L560 45 L560 280 L40 280 Z" fill="url(#g1)" />
    {/* Line */}
    <path d="M40 240 L120 210 L200 195 L280 160 L360 130 L440 90 L520 55 L560 45" stroke="url(#g1s)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    {/* Dots */}
    {[[40,240],[120,210],[200,195],[280,160],[360,130],[440,90],[520,55],[560,45]].map(([x,y]) => (
      <circle key={`${x}-${y}`} cx={x} cy={y} r="4" fill="hsl(95,98%,61%)" fillOpacity="0.9" />
    ))}
    {/* Active dot glow */}
    <circle cx="560" cy="45" r="10" fill="hsl(95,98%,61%)" fillOpacity="0.15" />
    <circle cx="560" cy="45" r="5" fill="hsl(95,98%,61%)" />
    {/* Labels */}
    <text x="40" y="270" fill="white" fillOpacity="0.3" fontSize="10" fontFamily="DM Sans">J1</text>
    <text x="240" y="270" fill="white" fillOpacity="0.3" fontSize="10" fontFamily="DM Sans">J30</text>
    <text x="530" y="270" fill="white" fillOpacity="0.3" fontSize="10" fontFamily="DM Sans">J90</text>
    {/* Score badge */}
    <rect x="450" y="20" width="100" height="34" rx="8" fill="hsl(95,98%,61%)" fillOpacity="0.12" stroke="hsl(95,98%,61%)" strokeOpacity="0.3" strokeWidth="1" />
    <text x="500" y="41" fill="hsl(95,98%,61%)" fontSize="13" fontFamily="DM Sans" fontWeight="700" textAnchor="middle">+340%</text>
  </svg>
);

const IlluAffiliation = () => (
  <svg viewBox="0 0 600 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
    <defs>
      <linearGradient id="afill" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stopColor="hsl(95,98%,61%)" stopOpacity="0" />
        <stop offset="100%" stopColor="hsl(95,98%,61%)" stopOpacity="0.12" />
      </linearGradient>
    </defs>
    {/* Milestones */}
    {[
      { x: 60, label: "0", sub: "Départ" },
      { x: 200, label: "50", sub: "Followers" },
      { x: 350, label: "3 avg", sub: "Viewers" },
      { x: 500, label: "Affilié", sub: "🎉" },
    ].map(({ x, label, sub }, i) => (
      <g key={x}>
        <circle cx={x} cy={120} r={i === 3 ? 28 : 20}
          fill={i === 3 ? "hsl(95,98%,61%)" : "hsl(220,18%,9%)"}
          stroke={i === 3 ? "hsl(95,98%,61%)" : "white"}
          strokeOpacity={i === 3 ? 1 : 0.12}
          strokeWidth={i === 3 ? 0 : 1}
        />
        <text x={x} y={i === 3 ? 125 : 124} textAnchor="middle" fontSize={i === 3 ? "9" : "10"} fontWeight="700"
          fill={i === 3 ? "hsl(220,20%,6%)" : "white"} fontFamily="DM Sans">{label}</text>
        <text x={x} y="158" textAnchor="middle" fontSize="10" fill="white" fillOpacity="0.4" fontFamily="DM Sans">{sub}</text>
        {i < 3 && (
          <line x1={x + (i === 0 ? 20 : 20)} y1={120} x2={[200,350,500][i] - 20} y2={120}
            stroke="white" strokeOpacity="0.1" strokeWidth="1" strokeDasharray="4 4" />
        )}
      </g>
    ))}
    {/* Condition rows */}
    {[
      ["50 followers", "75%"],
      ["500 min/mois", "60%"],
      ["7 jours uniques", "80%"],
      ["3 viewers moy.", "45%"],
    ].map(([label, pct], i) => (
      <g key={label} transform={`translate(60, ${190 + i * 0})`}>
      </g>
    ))}
  </svg>
);

const IlluRegularity = () => (
  <svg viewBox="0 0 600 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
    {/* Calendar grid */}
    {Array.from({ length: 28 }, (_, i) => {
      const col = i % 7;
      const row = Math.floor(i / 7);
      const x = 60 + col * 72;
      const y = 40 + row * 56;
      const isActive = [0,1,2,4,5,7,8,9,11,14,15,16,18,21,22,23,25].includes(i);
      const isNew = [22,23,25].includes(i);
      return (
        <rect key={i} x={x} y={y} width={52} height={38} rx={6}
          fill={isNew ? "hsl(95,98%,61%)" : isActive ? "hsl(95,98%,61%)" : "hsl(220,18%,9%)"}
          fillOpacity={isNew ? 0.9 : isActive ? 0.18 : 1}
          stroke={isActive || isNew ? "hsl(95,98%,61%)" : "white"}
          strokeOpacity={isActive || isNew ? 0.4 : 0.06}
          strokeWidth={1}
        />
      );
    })}
    {/* Streak badge */}
    <rect x="220" y="230" width="160" height="26" rx="13" fill="hsl(95,98%,61%)" fillOpacity="0.12" stroke="hsl(95,98%,61%)" strokeOpacity="0.3" strokeWidth="1"/>
    <text x="300" y="247" textAnchor="middle" fontSize="11" fontWeight="700" fill="hsl(95,98%,61%)" fontFamily="DM Sans">🔥 Série : 12 semaines</text>
  </svg>
);

const IlluAnalytics = () => (
  <svg viewBox="0 0 600 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
    <defs>
      <linearGradient id="bar1" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stopColor="hsl(95,98%,61%)" stopOpacity="0.3" />
        <stop offset="100%" stopColor="hsl(95,98%,61%)" stopOpacity="0.8" />
      </linearGradient>
      <linearGradient id="bar2" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stopColor="white" stopOpacity="0.03" />
        <stop offset="100%" stopColor="white" stopOpacity="0.08" />
      </linearGradient>
    </defs>
    {/* Bars */}
    {[
      { x: 60, h: 80, active: false },
      { x: 130, h: 110, active: false },
      { x: 200, h: 95, active: false },
      { x: 270, h: 130, active: false },
      { x: 340, h: 145, active: false },
      { x: 410, h: 160, active: false },
      { x: 480, h: 190, active: true },
    ].map(({ x, h, active }) => (
      <g key={x}>
        <rect x={x} y={220 - h} width={52} height={h} rx={6}
          fill={active ? "url(#bar1)" : "url(#bar2)"}
          stroke={active ? "hsl(95,98%,61%)" : "white"}
          strokeOpacity={active ? 0.4 : 0.06}
          strokeWidth={1}
        />
        {active && (
          <>
            <rect x={x - 10} y={220 - h - 30} width={72} height={22} rx={6}
              fill="hsl(95,98%,61%)" fillOpacity="0.15" stroke="hsl(95,98%,61%)" strokeOpacity="0.4" strokeWidth="1"
            />
            <text x={x + 26} y={220 - h - 14} textAnchor="middle" fontSize="11" fontWeight="700" fill="hsl(95,98%,61%)" fontFamily="DM Sans">+28% 📈</text>
          </>
        )}
      </g>
    ))}
    {/* Baseline */}
    <line x1="40" y1="220" x2="555" y2="220" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
  </svg>
);

const IlluSchedule = () => (
  <svg viewBox="0 0 600 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
    {/* Week row */}
    {["L", "M", "M", "J", "V", "S", "D"].map((day, i) => {
      const x = 50 + i * 74;
      const hasStream = [1, 3, 5, 6].includes(i);
      const isPeak = [5, 6].includes(i);
      return (
        <g key={`${day}-${i}`}>
          <text x={x + 18} y="40" textAnchor="middle" fontSize="11" fill="white" fillOpacity="0.35" fontFamily="DM Sans" fontWeight="600">{day}</text>
          {hasStream ? (
            <>
              <rect x={x} y="55" width={36} height={140} rx={8}
                fill={isPeak ? "hsl(95,98%,61%)" : "hsl(95,98%,61%)"}
                fillOpacity={isPeak ? 0.22 : 0.1}
                stroke="hsl(95,98%,61%)"
                strokeOpacity={isPeak ? 0.5 : 0.25}
                strokeWidth={1}
              />
              {isPeak && (
                <rect x={x} y="110" width={36} height={85} rx={6} fill="hsl(95,98%,61%)" fillOpacity="0.35" />
              )}
              <text x={x + 18} y="210" textAnchor="middle" fontSize="9" fill="hsl(95,98%,61%)" fillOpacity="0.8" fontFamily="DM Sans">{isPeak ? "Peak" : "Live"}</text>
            </>
          ) : (
            <rect x={x} y="55" width={36} height={140} rx={8} fill="hsl(220,18%,9%)" stroke="white" strokeOpacity="0.06" strokeWidth={1} />
          )}
        </g>
      );
    })}
    {/* Time labels */}
    <text x="22" y="65" fontSize="9" fill="white" fillOpacity="0.2" fontFamily="DM Sans">21h</text>
    <text x="22" y="195" fontSize="9" fill="white" fillOpacity="0.2" fontFamily="DM Sans">19h</text>
  </svg>
);

const IlluNiche = () => (
  <svg viewBox="0 0 600 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
    <defs>
      <radialGradient id="nicheGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="hsl(95,98%,61%)" stopOpacity="0.15" />
        <stop offset="100%" stopColor="hsl(95,98%,61%)" stopOpacity="0" />
      </radialGradient>
    </defs>
    {/* Axis */}
    <line x1="60" y1="220" x2="540" y2="220" stroke="white" strokeOpacity="0.1" strokeWidth="1" />
    <line x1="60" y1="30" x2="60" y2="220" stroke="white" strokeOpacity="0.1" strokeWidth="1" />
    {/* Axis labels */}
    <text x="300" y="248" textAnchor="middle" fontSize="10" fill="white" fillOpacity="0.35" fontFamily="DM Sans">Nombre de streamers</text>
    <text x="20" y="130" fontSize="10" fill="white" fillOpacity="0.35" fontFamily="DM Sans" transform="rotate(-90,20,130)">Viewers disponibles</text>
    {/* Bubbles — saturated */}
    {[
      { cx: 420, cy: 80, r: 42, label: "Fortnite", saturated: true },
      { cx: 340, cy: 100, r: 34, label: "Minecraft", saturated: true },
      { cx: 460, cy: 140, r: 28, label: "LoL", saturated: true },
    ].map(({ cx, cy, r, label }) => (
      <g key={label}>
        <circle cx={cx} cy={cy} r={r} fill="white" fillOpacity="0.04" stroke="white" strokeOpacity="0.1" strokeWidth="1" />
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize="9" fill="white" fillOpacity="0.4" fontFamily="DM Sans">{label}</text>
      </g>
    ))}
    {/* Niche sweet spot */}
    <circle cx="180" cy="110" r="50" fill="url(#nicheGlow)" />
    <circle cx="180" cy="110" r="28" fill="hsl(95,98%,61%)" fillOpacity="0.12" stroke="hsl(95,98%,61%)" strokeOpacity="0.5" strokeWidth="1.5" />
    <text x="180" y="106" textAnchor="middle" fontSize="9" fill="hsl(95,98%,61%)" fontFamily="DM Sans" fontWeight="600">Hollow</text>
    <text x="180" y="119" textAnchor="middle" fontSize="9" fill="hsl(95,98%,61%)" fontFamily="DM Sans" fontWeight="600">Knight</text>
    {/* Arrow + label */}
    <path d="M235 90 Q260 70 260 55" stroke="hsl(95,98%,61%)" strokeOpacity="0.5" strokeWidth="1.5" fill="none" strokeDasharray="3 3" />
    <text x="265" y="52" fontSize="10" fill="hsl(95,98%,61%)" fillOpacity="0.8" fontFamily="DM Sans" fontWeight="700">Zone idéale</text>
  </svg>
);

const IlluStats = () => (
  <svg viewBox="0 0 600 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
    <defs>
      <linearGradient id="spark1" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="hsl(95,98%,61%)" stopOpacity="0.2" />
        <stop offset="100%" stopColor="hsl(95,98%,61%)" stopOpacity="0.9" />
      </linearGradient>
    </defs>
    {/* Metric cards */}
    {[
      { x: 40, y: 30, w: 160, label: "Viewers simultanés", value: "4.2", trend: "+0.8", good: true },
      { x: 220, y: 30, w: 160, label: "Durée moy. session", value: "1h 42", trend: "+12min", good: true },
      { x: 400, y: 30, w: 160, label: "Taux conversion", value: "2.1%", trend: "-0.3%", good: false },
    ].map(({ x, y, w, label, value, trend, good }) => (
      <g key={label}>
        <rect x={x} y={y} width={w} height={90} rx={10} fill="hsl(220,18%,9%)" stroke="white" strokeOpacity="0.07" strokeWidth={1} />
        <text x={x + 14} y={y + 24} fontSize="10" fill="white" fillOpacity="0.4" fontFamily="DM Sans">{label}</text>
        <text x={x + 14} y={y + 54} fontSize="22" fontWeight="700" fill="white" fontFamily="DM Sans">{value}</text>
        <rect x={x + 14} y={y + 64} width={70} height={16} rx={8}
          fill={good ? "hsl(95,98%,61%)" : "hsl(0,72%,51%)"} fillOpacity="0.12"
        />
        <text x={x + 49} y={y + 76} textAnchor="middle" fontSize="10" fontWeight="600"
          fill={good ? "hsl(95,98%,61%)" : "hsl(0,72%,51%)"} fontFamily="DM Sans">{trend}</text>
      </g>
    ))}
    {/* Sparkline */}
    <path d="M40 170 L120 158 L200 162 L280 145 L360 138 L440 125 L560 118"
      stroke="url(#spark1)" strokeWidth="2" strokeLinecap="round" />
    <text x="40" y="215" fontSize="10" fill="white" fillOpacity="0.25" fontFamily="DM Sans">Évolution du CCV sur 90 jours</text>
  </svg>
);

// ─── Articles ─────────────────────────────────────────────────────────────────

export const ARTICLES: Article[] = [
  // ──────────────────────────────────────────────────────────────────────────
  // 1 — Comment progresser sur Twitch
  // ──────────────────────────────────────────────────────────────────────────
  {
    slug: "comment-progresser-sur-twitch",
    category: "Croissance",
    categoryColor: "primary",
    title: "Comment progresser sur Twitch : les 5 leviers que 90% des streamers ignorent",
    excerpt:
      "La plupart des streamers stagnent non pas par manque d'effort, mais parce qu'ils optimisent les mauvaises métriques. Voici les 5 leviers qui changent vraiment la trajectoire d'une chaîne.",
    readingTime: 8,
    publishedAt: "2025-05-10",
    keywords: [
      "progresser sur twitch",
      "comment améliorer son stream twitch",
      "pourquoi je stagne sur twitch",
      "grandir sur twitch",
      "conseils twitch 2025",
    ],
    metaDescription:
      "Découvrez les 5 leviers les plus sous-exploités pour progresser sur Twitch en 2025 : régularité, titres, clips, cohérence de catégorie et signaux de rétention.",
    illustration: <IlluGrowth />,
    tableOfContents: [
      { id: "levier-1", label: "Régularité sur la durée" },
      { id: "levier-2", label: "Le titre comme premier filtre" },
      { id: "levier-3", label: "Les clips comme multiplicateur" },
      { id: "levier-4", label: "La cohérence de catégorie" },
      { id: "levier-5", label: "La rétention des premières minutes" },
      { id: "diagnostic", label: "Comment diagnostiquer ta chaîne" },
    ],
    content: (
      <>
        <P>
          La majorité des streamers qui stagnent font la même erreur : ils mesurent le mauvais indicateur.
          Ils regardent le nombre de followers, le nombre de vues, le peak de viewers — des chiffres qui
          flattent l'ego mais n'expliquent rien sur ce qui bloque vraiment la progression.
        </P>
        <P>
          La réalité, c'est que la croissance sur Twitch dépend de cinq leviers très concrets.
          Et la plupart des streamers n'en maîtrisent qu'un seul, parfois deux.
        </P>

        <StatBlock
          stats={[
            { value: "90%", label: "des chaînes stagnantes ont au moins 3 leviers non activés" },
            { value: "3×", label: "plus de croissance avec un schedule régulier vs. irrégulier" },
            { value: "6 min", label: "fenêtre critique pour convaincre un nouveau viewer de rester" },
          ]}
        />

        <H2 id="levier-1">Levier 1 — La régularité, pas la fréquence</H2>
        <P>
          Il y a une confusion fréquente entre régularité et fréquence. Streamer souvent, c'est bien.
          Streamer aux mêmes créneaux, c'est ce qui crée une audience habituée.
        </P>
        <P>
          L'algorithme Twitch ne favorise pas les chaînes qui streament le plus. Il favorise les chaînes
          dont les viewers <em>reviennent</em>. Et les viewers reviennent quand ils savent à quel moment
          te retrouver. C'est aussi simple — et aussi difficile — que ça.
        </P>
        <Callout icon="💡" title="Le concept de chaîne habitude">
          Une chaîne habitude, c'est une chaîne que les viewers ouvrent automatiquement à un horaire donné.
          Pas parce qu'ils vérifient si tu streams, mais parce qu'ils ont intégré ton créneau dans leur
          routine. Ça prend 8 à 12 semaines de régularité pour s'ancrer.
        </Callout>
        <P>
          Concrètement : mieux vaut 3 streams hebdomadaires aux mêmes horaires pendant 3 mois que
          7 streams pendant 2 semaines suivis d'une absence. Le signal régulier est infiniment plus
          puissant que le signal intense.
        </P>

        <H2 id="levier-2">Levier 2 — Le titre comme premier filtre</H2>
        <P>
          Le titre de ton stream, c'est la première chose qu'un potentiel viewer lit avant de cliquer —
          ou de passer. Pourtant, la grande majorité des streamers ne l'optimisent jamais vraiment.
        </P>
        <P>
          Un bon titre remplit deux fonctions : il décrit <strong>ce qui se passe</strong> (le contexte
          de jeu, le mode, le niveau) et il crée <strong>une tension ou un crochet</strong> (challenge,
          humour, milestone). Un mauvais titre, c'est juste le nom du jeu.
        </P>
        <Ul>
          <Li>❌ "Minecraft" → aucune raison de cliquer plutôt que sur n'importe quelle autre chaîne</Li>
          <Li>✅ "Minecraft SMP — J'essaie de finir l'Ender en solo pour la première fois" → contexte + enjeu</Li>
          <Li>✅ "Hollow Knight — Pantheon of Hallownest blind (essai 3)" → cohérence + progression visible</Li>
        </Ul>

        <H2 id="levier-3">Levier 3 — Les clips comme multiplicateur de visibilité</H2>
        <P>
          Twitch est une plateforme fermée. Les découvertes organiques depuis l'extérieur sont rares.
          Les clips, eux, voyagent : Reddit, Twitter/X, TikTok, Discord. Ce sont des ambassadeurs
          asynchrones de ton contenu.
        </P>
        <P>
          La plupart des streamers créent des clips de manière passive — ils attendent que les viewers
          le fassent. Les chaînes qui progressent vite ont une stratégie clip active : identifier les
          meilleurs moments en VOD, créer eux-mêmes les clips, les distribuer systématiquement.
        </P>
        <Callout icon="🎬" title="La règle du clip en 3 actes">
          Un bon clip a une intro immédiate (pas de contexte nécessaire), un pic émotionnel clair (rire,
          skill, réaction) et une durée inférieure à 60 secondes. Si tu as besoin d'expliquer le clip
          pour qu'il soit drôle, il n'est pas assez bon.
        </Callout>

        <H2 id="levier-4">Levier 4 — La cohérence de catégorie</H2>
        <P>
          Twitch catégorise les chaînes dans les jeux qu'elles streament. Quand tu changes de jeu
          toutes les semaines, tu envoies un signal confus : tes followers attendent souvent un contenu
          précis, pas toi en général (pas encore).
        </P>
        <P>
          La cohérence de catégorie a deux effets : elle signal l'expertise à l'algorithme et elle
          crée une identité mémorisable pour les nouveaux viewers. "Cette chaîne, c'est the guy
          qui joue aux soulslikes" est une identité forte. "Cette chaîne joue à tout" est une identité nulle.
        </P>
        <P>
          Ça ne veut pas dire que tu dois te limiter à un jeu pour toujours. Mais pendant tes 6 à 12 premiers
          mois, la cohérence paie. Choisis un catalogue restreint (2 à 3 jeux connexes) et tiens-t'en là.
        </P>

        <H2 id="levier-5">Levier 5 — La rétention des 6 premières minutes</H2>
        <P>
          Twitch mesure la durée de watch. Plus tes viewers restent longtemps, plus l'algorithme te
          recommande. Et la décision de rester — ou de partir — se joue dans les 5 à 6 premières minutes
          après qu'un nouveau viewer arrive.
        </P>
        <P>
          Pendant ces 6 minutes, un viewer qui ne te connaît pas évalue : est-ce que ce stream est
          agréable à regarder ? Est-ce que le streamer est réactif ? Est-ce qu'il se passe quelque chose ?
          Si la réponse à ces trois questions n'est pas oui, il part.
        </P>
        <Ul>
          <Li>Parle régulièrement, même s'il n'y a personne — les nouveaux arrivent à n'importe quel moment</Li>
          <Li>Donne du contexte immédiatement sur ce que tu fais dans le jeu</Li>
          <Li>Réagis à tout ce qui se passe à l'écran, explique ton raisonnement</Li>
          <Li>Évite les silences radio de plus de 20 secondes</Li>
        </Ul>

        <H2 id="diagnostic">Comment diagnostiquer ta chaîne maintenant</H2>
        <P>
          Le problème avec ces 5 leviers, c'est qu'il est difficile de savoir lequel est ton vrai
          point de blocage. Peut-être que ta régularité est parfaite mais que tes titres sont plats.
          Peut-être que ta rétention est bonne mais que tu ne clippes jamais.
        </P>
        <P>
          C'est exactement pour ça que Streamnco analyse ta chaîne : identifier le levier prioritaire
          sur lequel concentrer ton énergie cette semaine, pas énoncer 10 conseils génériques que
          tu connais déjà.
        </P>
        <Callout icon="🎯" title="Analyse ta chaîne gratuitement">
          Entre ton pseudo Twitch sur Streamnco et reçois un diagnostic de ta chaîne en moins d'une
          minute : StreamScore, blocage principal et prochaine priorité d'action. Aucune connexion
          requise pour commencer.
        </Callout>
      </>
    ),
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 2 — Devenir affilié Twitch
  // ──────────────────────────────────────────────────────────────────────────
  {
    slug: "devenir-affilie-twitch-2025",
    category: "Affiliation",
    categoryColor: "accent",
    title: "Devenir affilié Twitch en 2025 : le guide concret avec les vrais chiffres",
    excerpt:
      "50 followers, 500 minutes, 7 jours, 3 viewers. Ces 4 chiffres résument les conditions d'affiliation Twitch — mais les atteindre demande une stratégie précise. Voici le guide.",
    readingTime: 7,
    publishedAt: "2025-05-08",
    keywords: [
      "devenir affilié twitch",
      "affiliation twitch conditions",
      "affiliation twitch 2025",
      "comment atteindre affiliation twitch",
      "twitch affiliate requirements",
    ],
    metaDescription:
      "Guide complet pour devenir affilié Twitch en 2025 : conditions exactes, timeline réaliste, erreurs à éviter et stratégie pour atteindre les 3 viewers simultanés.",
    illustration: <IlluAffiliation />,
    tableOfContents: [
      { id: "conditions", label: "Les 4 conditions exactes" },
      { id: "plus-dur", label: "Le critère le plus difficile" },
      { id: "timeline", label: "Timeline réaliste" },
      { id: "erreurs", label: "Les 3 erreurs classiques" },
      { id: "apres", label: "Ce qui change après l'affiliation" },
    ],
    content: (
      <>
        <P>
          L'affiliation Twitch est souvent présentée comme un objectif mystérieux. En réalité,
          les conditions sont très précises. Le défi n'est pas de les comprendre — c'est de toutes
          les remplir en même temps, sur la même fenêtre de 30 jours.
        </P>

        <H2 id="conditions">Les 4 conditions exactes de l'affiliation Twitch</H2>
        <P>
          Pour accéder au programme d'affiliation Twitch, tu dois remplir <strong>simultanément</strong>{" "}
          ces quatre critères sur une période de 30 jours glissants :
        </P>

        <StatBlock
          stats={[
            { value: "50", label: "Followers au total" },
            { value: "500 min", label: "Broadcast sur 30 jours" },
            { value: "7 jours", label: "Diffusion uniques sur 30 jours" },
            { value: "3 avg", label: "Viewers simultanés moyens" },
          ]}
        />

        <NumberedStep n={1} title="50 followers">
          Le critère le plus simple à atteindre. 50 followers sont accessibles en quelques semaines
          avec un réseau minimal. Attention : Twitch pénalise les followers achetés et peut fermer
          le compte. Pas de raccourcis ici.
        </NumberedStep>
        <NumberedStep n={2} title="500 minutes de broadcast">
          ~8h20 de stream sur 30 jours. Avec des sessions de 2h, c'est 4-5 streams. Accessible
          rapidement si tu streams régulièrement.
        </NumberedStep>
        <NumberedStep n={3} title="7 jours de diffusion uniques">
          Le plus facile en termes de volume : 7 jours différents sur 30 jours. Soit environ
          2 streams par semaine.
        </NumberedStep>
        <NumberedStep n={4} title="3 viewers simultanés moyens">
          <strong>Le critère décisif.</strong> La moyenne est calculée sur l'ensemble de tes streams
          du mois. Pas un pic de viewers — la moyenne. Un seul stream à 10 viewers ne compense pas
          5 streams à 1 viewer.
        </NumberedStep>

        <H2 id="plus-dur">Pourquoi les 3 viewers moyens sont le vrai défi</H2>
        <P>
          Les 3 autres critères sont lineaires : stream plus souvent, tu les remplis. Les 3 viewers
          moyens, eux, dépendent de ton audience — pas seulement de toi.
        </P>
        <P>
          La plupart des streamers débutants démarrent avec 0 à 1 viewer. Passer à 3 en moyenne
          demande du temps et une approche active de construction d'audience.
        </P>
        <Callout icon="📊" title="Comment Twitch calcule la moyenne">
          Twitch utilise la moyenne des viewers sur l'ensemble de tes streams du dernier mois.
          Si tu as 5 streams avec respectivement [1, 2, 1, 8, 1] viewers, ta moyenne est 2.6 —
          sous le seuil. Le pic à 8 ne suffit pas.
        </Callout>

        <H3>Stratégies pour augmenter ton CCV moyen</H3>
        <Ul>
          <Li>
            <strong>Hosts et raids :</strong> invite d'autres petits streamers à se raider mutuellement
            après chaque session. C'est un des rares mécanismes de croissance organique sur Twitch.
          </Li>
          <Li>
            <strong>Communauté Discord :</strong> un Discord actif génère des viewers réguliers.
            Même 5 personnes en Discord qui regardent tes streams font passer la moyenne au-dessus du seuil.
          </Li>
          <Li>
            <strong>Créneau peu concurrentiel :</strong> streamer à une heure où la compétition est faible
            augmente mécaniquement tes chances d'apparaître en haut du browse dans ta catégorie.
          </Li>
          <Li>
            <strong>Promotion hors Twitch :</strong> TikTok clips, Twitter posts, Reddit gaming communities.
            La croissance organique Twitch est quasi nulle pour les petites chaînes — le trafic externe est essentiel.
          </Li>
        </Ul>

        <H2 id="timeline">Timeline réaliste pour atteindre l'affiliation</H2>
        <P>
          En partant de zéro, avec 3 à 4 streams par semaine et une approche active de construction
          d'audience :
        </P>
        <Ul>
          <Li><strong>Mois 1-2 :</strong> setup, premiers streams, premiers followers (objectif : 20-30 followers)</Li>
          <Li><strong>Mois 2-3 :</strong> régularité installée, premiers 50 followers atteints</Li>
          <Li><strong>Mois 3-5 :</strong> audience régulière, CCV qui atteint 2-3 viewers en moyenne</Li>
          <Li><strong>Mois 4-6 :</strong> affiliation obtenue (si la stratégie est cohérente)</Li>
        </Ul>
        <P>
          Ces chiffres supposent un effort régulier et réaliste. Les streamers qui visent l'affiliation
          en 30 jours en streamant tous les jours l'obtiennent parfois plus vite — mais au prix d'une
          intensité difficile à maintenir ensuite.
        </P>

        <H2 id="erreurs">Les 3 erreurs classiques qui retardent l'affiliation</H2>
        <NumberedStep n={1} title="Changer de jeu toutes les semaines">
          Chaque changement de catégorie remet le compteur à zéro dans l'algo et disperse l'audience
          potentielle. Choisis 1 à 2 jeux et tiens-t'en là pendant au moins 2 mois.
        </NumberedStep>
        <NumberedStep n={2} title="Streamer sans horaire fixe">
          Impossible de construire une audience habituée si personne ne sait quand tu streams.
          3 streams par semaine aux mêmes créneaux valent mieux que 7 streams à des horaires aléatoires.
        </NumberedStep>
        <NumberedStep n={3} title="Ignorer les 30 premières secondes">
          Un viewer qui arrive sur ta chaîne décide en moins de 30 secondes. Si tu regardes ton écran
          en silence ou si tu ne dis rien d'engaging, il repart. Parle constamment, même si la salle est vide.
        </NumberedStep>

        <H2 id="apres">Ce qui change vraiment après l'affiliation</H2>
        <P>
          L'affiliation donne accès aux abonnements (Subs), aux Bits, aux extensions et à une
          priorité de compression améliorée. Mais elle ne change pas la croissance de ta chaîne
          par elle-même.
        </P>
        <P>
          Le vrai changement, c'est psychologique : l'affiliation valide ta trajectoire et ouvre
          la porte à une relation plus formelle avec ta communauté. C'est une étape — pas une
          destination.
        </P>
        <Callout icon="🎯" title="Mesure ta progression vers l'affiliation">
          Streamnco analyse en temps réel où tu en es sur les 4 critères d'affiliation. Entre ton
          pseudo et vois exactement ce qui te manque encore, et quelle est ta priorité cette semaine.
        </Callout>
      </>
    ),
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 3 — Régularité Twitch
  // ──────────────────────────────────────────────────────────────────────────
  {
    slug: "regularite-twitch-facteur-croissance",
    category: "Stratégie",
    categoryColor: "primary",
    title: "Régularité sur Twitch : pourquoi c'est le facteur n°1 de croissance (et comment la tenir)",
    excerpt:
      "Tous les streamers qui progressent ont un point commun : ils streament selon un schedule prévisible. La régularité n'est pas une contrainte — c'est le mécanisme de croissance principal sur Twitch.",
    readingTime: 6,
    publishedAt: "2025-05-06",
    keywords: [
      "régularité twitch",
      "schedule stream twitch",
      "planning twitch",
      "combien de fois streamer twitch",
      "tenir un schedule twitch",
    ],
    metaDescription:
      "Pourquoi la régularité est le facteur n°1 de croissance sur Twitch, comment construire un schedule réaliste et comment le tenir sur le long terme.",
    illustration: <IlluRegularity />,
    tableOfContents: [
      { id: "pourquoi", label: "Pourquoi la régularité est decisive" },
      { id: "algo", label: "Comment l'algo récompense la régularité" },
      { id: "schedule", label: "Construire un schedule réaliste" },
      { id: "tenir", label: "Comment tenir son schedule" },
      { id: "serie", label: "La série et son impact psychologique" },
    ],
    content: (
      <>
        <P>
          Il y a un pattern très clair chez les streamers qui progressent : ils ont tous un schedule.
          Pas forcément le même (certains streament 2 fois par semaine, d'autres 5), mais ils
          streament <em>quand ils l'ont annoncé</em>. Ce n'est pas une coïncidence.
        </P>

        <H2 id="pourquoi">Pourquoi la régularité est le facteur décisif</H2>
        <P>
          La croissance sur Twitch repose sur un mécanisme simple : les viewers reviennent quand
          ils savent où te retrouver. Une audience n'est pas un groupe de gens qui te trouvent
          une fois — c'est un groupe de gens qui <em>reviennent</em> régulièrement.
        </P>
        <P>
          Et pour qu'ils reviennent, deux choses sont nécessaires : ils doivent apprécier le contenu,
          et ils doivent savoir quand il est disponible. La régularité adresse le deuxième point.
          C'est aussi basique — et aussi sous-estimé.
        </P>
        <Callout icon="🧠" title="Le concept d'audience habitude">
          Une chaîne habitude, c'est une chaîne que les viewers ouvrent par réflexe à un horaire donné.
          Comme une émission de télé qu'on regarde chaque semaine. Ce niveau d'ancrage prend typiquement
          8 à 12 semaines de régularité pour se construire.
        </Callout>

        <H2 id="algo">Comment l'algorithme Twitch récompense la régularité</H2>
        <P>
          Twitch n'a jamais publié les détails de son algorithme. Mais les observations convergent :
          les chaînes régulières ont un meilleur placement dans les listes de browse, une meilleure
          rétention et des recommendations plus fréquentes vers les viewers qui ont déjà regardé la chaîne.
        </P>
        <P>
          Le signal que la régularité envoie à l'algorithme, c'est la fiabilité. Une chaîne qui stream
          toujours le mardi et le jeudi soir génère des viewers récurrents. Et les viewers récurrents,
          c'est le principal signal positif que Twitch utilise pour recommander une chaîne.
        </P>
        <StatBlock
          stats={[
            { value: "3×", label: "plus de viewers récurrents avec un schedule régulier" },
            { value: "8-12", label: "semaines pour ancrer une habitude de visionnage" },
            { value: "68%", label: "des viewers réguliers arrivent avant le début du stream" },
          ]}
        />

        <H2 id="schedule">Comment construire un schedule réaliste</H2>
        <P>
          Le piège classique, c'est de se fixer un schedule trop ambitieux. 5 streams par semaine
          quand tu as un travail à temps plein et une vie sociale, c'est un aller simple vers l'épuisement
          et l'abandon.
        </P>
        <P>
          Un bon schedule part de ce que tu peux tenir <em>dans ta pire semaine</em>, pas dans ta
          meilleure. Si tu ne peux tenir que 2 streams par semaine quand tu es surchargé, commence
          par un schedule à 2 streams.
        </P>
        <NumberedStep n={1} title="Identifie tes créneaux réels">
          Regarde ton agenda des 4 dernières semaines. Quels sont les soirs où tu étais librement
          disponible ? Ces créneaux sont tes candidats.
        </NumberedStep>
        <NumberedStep n={2} title="Évalue la concurrence sur ces créneaux">
          Plus il y a de gros streamers en live sur ta catégorie à un horaire donné, plus tu seras
          enterré dans le browse. Les soirées de semaine (19h-22h) sont généralement plus favorables
          que le samedi soir pour les petites chaînes.
        </NumberedStep>
        <NumberedStep n={3} title="Annonce et tiens pendant 8 semaines">
          Mets ton schedule dans ton panneau Twitch, sur les réseaux, dans le titre de tes streams.
          Puis tiens-le pendant au moins 8 semaines. C'est la durée minimale pour savoir si un
          créneau fonctionne.
        </NumberedStep>

        <H2 id="tenir">4 techniques pour tenir son schedule sur le long terme</H2>
        <Ul>
          <Li>
            <strong>Rends le lancement idiot-proof :</strong> prépare tout (PC allumé, jeu ouvert,
            titre prêt) 15 minutes avant. La friction de démarrage est l'ennemi principal.
          </Li>
          <Li>
            <strong>Planifie tes absences :</strong> si tu sais que tu ne peux pas streamer une semaine,
            annonce-le à l'avance. La transparence préserve la confiance de la communauté.
          </Li>
          <Li>
            <strong>Différencie le schedule minimal du bonus :</strong> 2 streams = engagement
            non-négociable. 3 streams = bonus. Tu évites la pression d'un schedule trop ambitieux.
          </Li>
          <Li>
            <strong>Mesure la série, pas le total :</strong> tracker une série de semaines consécutives
            respectées est plus motivant que compter le nombre total de streams. La série donne une
            dimension de progression.
          </Li>
        </Ul>

        <H2 id="serie">La série et son impact psychologique</H2>
        <P>
          La régularité a un effet psychologique souvent sous-estimé : la série. Quand tu as tenu
          ton schedule 8 semaines d'affilée, briser la série devient difficile émotionnellement.
          Ce n'est plus juste "je vais rater un stream" — c'est "je vais casser une série de 8 semaines".
        </P>
        <P>
          Streamnco trackait automatiquement cette série pour toi : nombre de semaines consécutives
          avec au moins un stream, signal de danger si tu risques de briser la série cette semaine.
          Ce type de feedback visuel change radicalement le rapport à la régularité.
        </P>
        <Callout icon="🔥" title="Suis ta série de régularité">
          Streamnco calcule et affiche ta série hebdomadaire en temps réel. Si tu risques de la
          briser cette semaine, tu reçois une alerte. Entre ton pseudo pour voir ton état actuel.
        </Callout>
      </>
    ),
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 4 — Meilleurs outils analytics Twitch 2025
  // ──────────────────────────────────────────────────────────────────────────
  {
    slug: "meilleurs-outils-analytics-twitch-2025",
    category: "Outils",
    categoryColor: "info",
    title: "Les meilleurs outils d'analytics Twitch en 2025 — comparatif complet",
    excerpt:
      "TwitchTracker, SullyGnome, Streamlabs, le dashboard natif... Chaque outil répond à un besoin précis. Ce comparatif te dit lequel utiliser selon ton niveau et tes objectifs.",
    readingTime: 9,
    publishedAt: "2025-05-04",
    keywords: [
      "outils analytics twitch",
      "statistiques twitch",
      "dashboard twitch streamer",
      "TwitchTracker alternative",
      "analyser sa chaîne twitch",
      "meilleur outil twitch 2025",
    ],
    metaDescription:
      "Comparatif complet des meilleurs outils analytics Twitch en 2025 : TwitchTracker, SullyGnome, Streamlabs, dashboard natif et Streamnco — forces, limites et cas d'usage.",
    illustration: <IlluAnalytics />,
    tableOfContents: [
      { id: "quoi-mesurer", label: "Ce que tu dois vraiment mesurer" },
      { id: "dashboard-natif", label: "Le dashboard natif Twitch" },
      { id: "twitchtracker", label: "TwitchTracker" },
      { id: "sullygnome", label: "SullyGnome" },
      { id: "streamlabs", label: "Streamlabs Analytics" },
      { id: "streamnco", label: "Streamnco" },
      { id: "verdict", label: "Verdict selon ton profil" },
    ],
    content: (
      <>
        <P>
          Il existe une dizaine d'outils pour analyser une chaîne Twitch. Le problème, ce n'est pas
          le manque d'options — c'est de savoir lequel utiliser pour quoi. Certains affichent des
          données historiques, d'autres se concentrent sur le live, d'autres encore essaient de
          tout faire mais sans direction claire.
        </P>
        <P>
          Ce comparatif ne va pas te lister 20 outils. Il va t'expliquer les 5 qui méritent vraiment
          ton attention, leurs forces réelles et les cas d'usage précis pour lesquels chacun excelle.
        </P>

        <H2 id="quoi-mesurer">Avant tout : ce que tu dois vraiment mesurer</H2>
        <P>
          La plupart des streamers mesurent ce qui est facile à voir : le nombre de followers,
          le peak de viewers, le nombre de streams. Ce sont des vanity metrics — ils font plaisir
          mais n'expliquent rien sur ce qui bloque la progression.
        </P>
        <P>
          Les métriques qui comptent vraiment sont :
        </P>
        <Ul>
          <Li><strong>CCV moyen (Concurrent Viewers) :</strong> le vrai indicateur de santé d'une chaîne</Li>
          <Li><strong>Taux de rétention :</strong> durée moyenne de watch divisée par durée du stream</Li>
          <Li><strong>Ratio followers/CCV :</strong> signal de l'écart entre audience passive et active</Li>
          <Li><strong>Régularité :</strong> nombre de semaines consécutives avec au moins un stream</Li>
          <Li><strong>Cohérence de catégorie :</strong> concentration sur une ou plusieurs catégories</Li>
        </Ul>

        <H2 id="dashboard-natif">Le dashboard natif Twitch (Creator Dashboard)</H2>
        <ToolCard
          name="Twitch Creator Dashboard"
          badge="Natif · Gratuit"
          desc="Le tableau de bord intégré à Twitch. Donne accès aux stats de base de tes streams et à l'analytics de ta chaîne."
          pros={[
            "Données officielles Twitch",
            "CCV en temps réel pendant le live",
            "Historique des streams",
            "Démographie basique",
          ]}
          cons={[
            "Très limité pour l'analyse rétrospective",
            "Pas de comparaison avec des benchmarks",
            "Pas d'action suggérée",
            "Interface peu pratique pour l'analyse croisée",
          ]}
        />
        <P>
          Idéal pour : suivre ses chiffres basiques semaine après semaine. Insuffisant pour
          comprendre <em>pourquoi</em> ils évoluent ou <em>que faire</em> pour les améliorer.
        </P>

        <H2 id="twitchtracker">TwitchTracker</H2>
        <ToolCard
          name="TwitchTracker"
          badge="Tiers · Gratuit"
          desc="Outil de référence pour l'historique public des chaînes Twitch. Accès à des données remontant à plusieurs années."
          pros={[
            "Historique très profond",
            "Stats publiques sur n'importe quelle chaîne",
            "Données sur les catégories (viewers par jeu)",
            "Gratuit et sans compte",
          ]}
          cons={[
            "Interface datée",
            "Pas d'analyse ni de recommandation",
            "Délai de mise à jour (pas temps réel)",
            "Données brutes sans contexte",
          ]}
        />
        <P>
          Idéal pour : recherche concurrentielle, regarder l'historique d'une chaîne,
          voir les tendances par catégorie. Pas un outil de pilotage quotidien.
        </P>

        <H2 id="sullygnome">SullyGnome</H2>
        <ToolCard
          name="SullyGnome"
          badge="Tiers · Freemium"
          desc="Spécialisé dans les données agrégées par jeu et par catégorie. Excellent pour analyser la demande dans une niche donnée."
          pros={[
            "Données très granulaires par catégorie",
            "Ratios viewers/streamers par jeu",
            "Tendances de croissance par catégorie",
            "Historique long terme",
          ]}
          cons={[
            "Peu adapté pour suivre sa propre chaîne",
            "Interface complexe",
            "Limites sur le plan gratuit",
            "Pas d'insights personnalisés",
          ]}
        />
        <P>
          Idéal pour : choisir sa niche, analyser le marché d'une catégorie, valider une hypothèse
          de positionnement. Moins utile pour le pilotage quotidien.
        </P>

        <H2 id="streamlabs">Streamlabs Analytics</H2>
        <ToolCard
          name="Streamlabs Analytics"
          badge="Intégré · Freemium"
          desc="Module analytics intégré à Streamlabs. Fort sur les données de stream technique et les performances en direct."
          pros={[
            "Intégration native avec l'OBS Streamlabs",
            "Données techniques (bitrate, drops)",
            "Alertes de stream en temps réel",
            "Interface moderne",
          ]}
          cons={[
            "Utile surtout si tu utilises Streamlabs OBS",
            "Analytics limité sur le plan gratuit",
            "Focus technique, pas stratégique",
            "Pas de recommandations de croissance",
          ]}
        />

        <H2 id="streamnco">Streamnco</H2>
        <ToolCard
          name="Streamnco"
          badge="Copilote · Freemium"
          desc="Outil de diagnostic et de progression orienté action. Analyse les signaux de ta chaîne pour identifier le blocage principal et générer un plan hebdomadaire."
          pros={[
            "Diagnostic structuré avec StreamScore",
            "Identification du blocage principal",
            "Plan hebdomadaire actionnable",
            "Suivi de régularité et de série",
            "Pas besoin de connecter son compte pour commencer",
          ]}
          cons={[
            "Moins de données brutes historiques que TwitchTracker",
            "Focus sur les signaux de progression, pas le live technique",
          ]}
        />

        <H2 id="verdict">Verdict selon ton profil</H2>
        <Ul>
          <Li><strong>Débutant :</strong> commence par Streamnco (diagnostic) + dashboard natif Twitch (suivi basique)</Li>
          <Li><strong>Streamer qui veut choisir sa niche :</strong> SullyGnome pour analyser les catégories, TwitchTracker pour valider</Li>
          <Li><strong>Streamer qui analyse la concurrence :</strong> TwitchTracker pour l'historique, Streamnco pour comparer ton positionnement</Li>
          <Li><strong>Streamer qui pilote sa progression :</strong> Streamnco comme outil principal</Li>
        </Ul>
        <Callout icon="🎯" title="Diagnostique ta chaîne maintenant">
          Aucun de ces outils ne te dit ce que <em>tu</em> dois faire cette semaine. Streamnco le fait.
          Entre ton pseudo et reçois ton diagnostic en moins d'une minute.
        </Callout>
      </>
    ),
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 5 — Comment lire ses stats Twitch
  // ──────────────────────────────────────────────────────────────────────────
  {
    slug: "comment-lire-ses-stats-twitch",
    category: "Analytics",
    categoryColor: "info",
    title: "Comment lire ses stats Twitch pour vraiment progresser (et ignorer le bruit)",
    excerpt:
      "Le nombre de followers ne dit rien sur la santé de ta chaîne. Le CCV moyen, lui, dit presque tout. Voici comment lire tes statistiques Twitch pour prendre des décisions concrètes.",
    readingTime: 7,
    publishedAt: "2025-05-02",
    keywords: [
      "analyser ses stats twitch",
      "statistiques twitch important",
      "lire ses stats twitch",
      "CCV twitch",
      "métriques twitch streamer",
    ],
    metaDescription:
      "Guide complet pour lire ses statistiques Twitch : quelles métriques comptent vraiment, comment interpréter le CCV, la rétention et le ratio followers/viewers.",
    illustration: <IlluStats />,
    tableOfContents: [
      { id: "vanity", label: "Les métriques inutiles (vanity metrics)" },
      { id: "ccv", label: "Le CCV : métrique reine" },
      { id: "retention", label: "La rétention comme signal" },
      { id: "ratio", label: "Le ratio followers/CCV" },
      { id: "plateau", label: "Interpréter un plateau" },
      { id: "actions", label: "Transformer les stats en actions" },
    ],
    content: (
      <>
        <P>
          Il est très facile de passer des heures sur ses statistiques Twitch sans en tirer la
          moindre décision concrète. Trop de données, pas assez de contexte, et aucune indication
          sur ce qu'il faudrait changer.
        </P>
        <P>
          Ce guide va te montrer quelles métriques regarder, dans quel ordre, et surtout ce
          qu'elles signifient concrètement pour la stratégie de ta chaîne.
        </P>

        <H2 id="vanity">Les métriques inutiles (vanity metrics)</H2>
        <P>
          Commençons par ce qu'il ne faut <em>pas</em> optimiser — ou du moins, ne pas utiliser
          comme indicateur principal de performance.
        </P>
        <Ul>
          <Li>
            <strong>Nombre de followers total :</strong> c'est un compteur historique. Un compte
            avec 2 000 followers mais 0 viewer actif est "mort". Le total dit peu sur la santé actuelle.
          </Li>
          <Li>
            <strong>Peak de viewers :</strong> une valeur ponctuelle. Un raid de 50 personnes peut
            créer un pic artificiel qui ne représente pas ta chaîne.
          </Li>
          <Li>
            <strong>Nombre d'heures streamées :</strong> un indicateur d'effort, pas de résultat.
            On peut streamer 200h sans progression si les fondamentaux sont absents.
          </Li>
          <Li>
            <strong>Nombre de clips créés :</strong> pertinent seulement si les clips ont des vues
            et ramènent du trafic vers la chaîne.
          </Li>
        </Ul>

        <H2 id="ccv">Le CCV : la métrique reine</H2>
        <P>
          Le <strong>CCV (Concurrent Viewers)</strong> — nombre moyen de viewers simultanés par stream —
          est le meilleur indicateur de la santé d'une chaîne. C'est lui que Twitch utilise pour
          l'algorithme, pour les conditions d'affiliation et de partenariat, et pour les marques.
        </P>
        <StatBlock
          stats={[
            { value: "3 CCV", label: "Seuil d'affiliation Twitch" },
            { value: "75 CCV", label: "Seuil indicatif pour le Partenariat" },
            { value: "~1%", label: "des viewers qui voient une chaîne la suivent" },
          ]}
        />
        <P>
          Pour améliorer ton CCV moyen, il faut travailler deux axes : attirer de nouveaux viewers
          (acquisition) et faire rester ceux qui arrivent (rétention). La plupart des streamers
          sur-investissent sur l'acquisition et sous-investissent sur la rétention.
        </P>

        <H2 id="retention">La rétention comme signal de qualité</H2>
        <P>
          La rétention mesure combien de temps les viewers restent sur ta chaîne. Elle est
          directement corrélée à la qualité perçue du contenu et de l'énergie du streamer.
        </P>
        <P>
          Tu peux calculer un proxy de rétention avec les données du dashboard natif Twitch :
          <code className="mx-1 rounded bg-muted/50 px-1.5 py-0.5 text-[13px] font-mono text-primary">
            Watch Time total ÷ (Viewers uniques × Durée du stream)
          </code>
        </P>
        <Ul>
          <Li><strong>{'>'} 30% :</strong> excellent — les gens restent longtemps</Li>
          <Li><strong>15-30% :</strong> correct — attention aux premières minutes</Li>
          <Li><strong>{'<'} 15% :</strong> signal fort que quelque chose fait fuir les viewers rapidement</Li>
        </Ul>
        <Callout icon="💡" title="Le test des premières minutes">
          Regarde tes VODs des 10 premières minutes. Est-ce que quelqu'un qui ne te connaît pas
          aurait une raison de rester ? Est-ce qu'il se passe quelque chose ? Est-ce que tu parles ?
          C'est là que se joue la rétention.
        </Callout>

        <H2 id="ratio">Le ratio followers/CCV</H2>
        <P>
          Le ratio entre ton nombre de followers et ton CCV moyen mesure l'"activation" de ton audience.
          Une chaîne avec 1 000 followers et 5 viewers actifs a un ratio de 0.5%. Une chaîne avec
          200 followers et 10 viewers a un ratio de 5%.
        </P>
        <P>
          Un ratio bas signale un problème de rétention ou un écart temporel : les followers sont
          anciens et ne reçoivent plus les notifications. Un ratio élevé signale une audience très
          engagée et récente.
        </P>
        <Ul>
          <Li><strong>{'<'} 1% :</strong> problème probable de rétention ou audience "froide"</Li>
          <Li><strong>1-3% :</strong> normal pour une chaîne en croissance</Li>
          <Li><strong>{'>'} 5% :</strong> excellent — audience très engagée</Li>
        </Ul>

        <H2 id="plateau">Comment interpréter un plateau</H2>
        <P>
          Un plateau, c'est quand les métriques n'évoluent plus pendant plusieurs semaines. C'est
          le signal le plus difficile à interpréter parce qu'il peut venir de sources très différentes.
        </P>
        <Ul>
          <Li><strong>Plateau CCV avec followers en hausse :</strong> ton acquisition fonctionne mais ton engagement baisse — travailler la rétention</Li>
          <Li><strong>Plateau followers avec CCV stable :</strong> ta communauté existante est fidèle mais tu n'attires plus de nouveaux — travailler la visibilité externe</Li>
          <Li><strong>Plateau sur tout :</strong> signal de saturation de créneau, problème de cohérence de contenu ou burnout — diagnostic plus profond nécessaire</Li>
        </Ul>

        <H2 id="actions">Transformer les stats en actions concrètes</H2>
        <P>
          Lire des stats sans en tirer des actions, c'est de la procrastination déguisée en travail.
          Chaque session d'analyse doit se terminer par une décision : qu'est-ce que je change
          cette semaine ?
        </P>
        <Callout icon="🎯" title="Diagnostic automatique en moins d'une minute">
          Plutôt que de passer des heures à interpréter tes stats manuellement, Streamnco le fait
          pour toi : analyse les signaux, identifie le blocage principal, génère la priorité
          de la semaine. Entre ton pseudo pour commencer.
        </Callout>
      </>
    ),
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 6 — Schedule Twitch
  // ──────────────────────────────────────────────────────────────────────────
  {
    slug: "schedule-twitch-guide-complet",
    category: "Stratégie",
    categoryColor: "primary",
    title: "Schedule Twitch : le guide pour créer un planning qui tient vraiment",
    excerpt:
      "Tout le monde sait qu'il faut un schedule. Personne ne sait vraiment comment en créer un qui tient 3 mois. Ce guide te donne la méthode concrète — créneau, communication, gestion des imprévus.",
    readingTime: 6,
    publishedAt: "2025-04-30",
    keywords: [
      "schedule twitch",
      "planning stream twitch",
      "horaires twitch",
      "créer un schedule twitch",
      "meilleurs créneaux stream twitch",
    ],
    metaDescription:
      "Comment créer et tenir un schedule Twitch sur le long terme : choisir ses créneaux, communiquer son planning, gérer les imprévus et mesurer l'impact de la régularité.",
    illustration: <IlluSchedule />,
    tableOfContents: [
      { id: "pourquoi-schedule", label: "Pourquoi un schedule change tout" },
      { id: "choisir", label: "Comment choisir ses créneaux" },
      { id: "competition", label: "Analyser la concurrence horaire" },
      { id: "communiquer", label: "Communiquer son schedule" },
      { id: "imprevus", label: "Gérer les imprévus proprement" },
      { id: "ajuster", label: "Quand et comment ajuster" },
    ],
    content: (
      <>
        <P>
          Le schedule est la décision la plus importante qu'un streamer peut prendre après
          avoir choisi sa niche. Et pourtant, la grande majorité des débutants streament "quand
          ils ont le temps" — ce qui veut dire de manière imprévisible, donc sans construire
          d'audience habituée.
        </P>

        <H2 id="pourquoi-schedule">Pourquoi un schedule change tout</H2>
        <P>
          Un schedule prévisible crée trois effets distincts :
        </P>
        <NumberedStep n={1} title="Il permet aux viewers de planifier">
          Quand tes viewers savent que tu streams le mardi et le jeudi à 20h, ils peuvent te
          mettre dans leur routine. Sans schedule, ils ne peuvent pas.
        </NumberedStep>
        <NumberedStep n={2} title="Il force la régularité du streamer">
          Annoncer un schedule publiquement crée une responsabilité. C'est une friction positive :
          tu es moins susceptible d'annuler quand tu l'as annoncé à ta communauté.
        </NumberedStep>
        <NumberedStep n={3} title="Il améliore le signal pour l'algorithme">
          Les chaînes régulières ont un meilleur taux de viewers récurrents. Et les viewers
          récurrents sont le signal le plus puissant pour l'algorithme Twitch.
        </NumberedStep>

        <H2 id="choisir">Comment choisir ses créneaux : la méthode</H2>
        <P>
          Ne commence pas par "quand est-ce que les gens regardent Twitch". Commence par "quand
          est-ce que je suis disponible et en condition de bien streamer".
        </P>
        <P>
          Un créneau tenu à 80% d'énergie toutes les semaines vaut infiniment plus qu'un créneau
          premium tenu à 40% parce que tu es épuisé.
        </P>
        <Callout icon="📋" title="Les 3 questions à te poser">
          1. Quels sont les soirs où je suis systématiquement libre et en forme ?<br/>
          2. À quelle heure est-ce que je termine généralement mon travail/études ?<br/>
          3. Combien d'heures de stream est-ce que je peux tenir confortablement (pas au maximum) ?
        </Callout>

        <H2 id="competition">Analyser la concurrence sur tes créneaux candidats</H2>
        <P>
          Une fois que tu as identifié tes créneaux disponibles, regarde la concurrence dans ta
          catégorie à ces horaires. Plus il y a de grosses chaînes actives, plus tu seras enterré
          dans le browse.
        </P>
        <Ul>
          <Li><strong>Samedi 20h-23h :</strong> pic de compétition — déconseillé pour les petites chaînes</Li>
          <Li><strong>Mardi-mercredi 19h-22h :</strong> bon ratio audience/compétition</Li>
          <Li><strong>Dimanche après-midi :</strong> créneau souvent sous-exploité sur beaucoup de jeux</Li>
          <Li><strong>Matinées week-end :</strong> très peu de compétition, audience plus réduite mais fidèle</Li>
        </Ul>
        <P>
          Tu peux utiliser SullyGnome pour analyser le nombre de streamers actifs dans ta catégorie
          par créneau horaire. C'est un travail de 15 minutes qui peut changer significativement
          ton exposition.
        </P>

        <H2 id="communiquer">Communiquer son schedule efficacement</H2>
        <P>
          Un schedule que tu connais mais que personne d'autre ne connaît ne sert à rien. Il doit
          être visible partout où tes viewers (actuels et potentiels) peuvent te trouver.
        </P>
        <Ul>
          <Li><strong>Panneau Twitch :</strong> premier endroit à mettre à jour — visible sur ta page chaîne</Li>
          <Li><strong>Bio Twitter/X/Instagram :</strong> pour les viewers qui te suivent sur les réseaux</Li>
          <Li><strong>Canal #schedule de ton Discord :</strong> avec les jours/heures en fuseau horaire</Li>
          <Li><strong>Titre du stream :</strong> rappel dans le titre (ex: "Mardi/Jeudi 20h")</Li>
          <Li><strong>Fin de chaque stream :</strong> annonce verbalement ton prochain stream avant de terminer</Li>
        </Ul>

        <H2 id="imprevus">Gérer les imprévus proprement</H2>
        <P>
          Les imprévus arrivent. La question n'est pas de les éviter — c'est de les gérer de
          manière à préserver la confiance de ta communauté.
        </P>
        <P>
          La règle simple : si tu sais 24h à l'avance que tu ne peux pas streamer, annonce-le.
          Un tweet "pas de stream ce jeudi, de retour mardi" prend 20 secondes et montre que tu
          respectes ton audience. Le silence est interprété comme de l'abandon.
        </P>
        <Callout icon="⚡" title="Le système de niveau minimal">
          Définis un "schedule minimal non-négociable" (ex: 1 stream/semaine) et un "schedule
          cible" (ex: 3 streams/semaine). Le minimal est ce que tu garantis même dans ta pire
          semaine. Le cible est ce que tu vises quand tout va bien. Tu préserves ainsi la
          continuité même en période difficile.
        </Callout>

        <H2 id="ajuster">Quand et comment ajuster son schedule</H2>
        <P>
          Un schedule n'est pas gravé dans le marbre. Mais le changer trop souvent annule
          son effet principal : la prévisibilité.
        </P>
        <P>
          La règle : tiens un schedule au minimum 8 semaines avant de l'évaluer. Si après 8 semaines
          les résultats ne sont pas là, ajuste un seul paramètre à la fois (horaire OU fréquence,
          pas les deux en même temps) et tiens encore 8 semaines pour mesurer l'impact.
        </P>
      </>
    ),
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 7 — Choisir sa niche Twitch
  // ──────────────────────────────────────────────────────────────────────────
  {
    slug: "choisir-sa-niche-twitch",
    category: "Stratégie",
    categoryColor: "primary",
    title: "Choisir sa niche Twitch : la méthode pour trouver ton marché et éviter les pièges classiques",
    excerpt:
      "Streamer Fortnite sans 10 000 viewers, c'est être invisible. La niche n'est pas une limitation — c'est le mécanisme qui te rend visible. Voici comment choisir la tienne avec méthode.",
    readingTime: 7,
    publishedAt: "2025-04-28",
    keywords: [
      "niche twitch",
      "catégorie twitch",
      "choisir sa niche twitch",
      "quel jeu streamer twitch",
      "catégorie moins concurrentielle twitch",
      "trouver sa niche streamer",
    ],
    metaDescription:
      "Méthode complète pour choisir sa niche Twitch : analyser le ratio viewers/streamers, éviter les marchés saturés, trouver le bon positionnement et construire une identité claire.",
    illustration: <IlluNiche />,
    tableOfContents: [
      { id: "paradoxe", label: "Le paradoxe du généraliste" },
      { id: "ratio", label: "Le ratio viewers/streamers" },
      { id: "methode", label: "La méthode en 3 étapes" },
      { id: "pieges", label: "Les pièges classiques" },
      { id: "identite", label: "Niche ≠ personnalité" },
      { id: "tester", label: "Comment tester avant de s'engager" },
    ],
    content: (
      <>
        <P>
          Il y a une illusion répandue chez les streamers débutants : l'idée que streamer des jeux
          populaires garantit plus de visibilité. C'est l'inverse. Plus un jeu est populaire, plus
          il y a de streamers, et plus tu es noyé dans la masse.
        </P>
        <P>
          La niche n'est pas un compromis. C'est la stratégie de base de toutes les chaînes
          qui ont réussi à croître sans audience préexistante.
        </P>

        <H2 id="paradoxe">Le paradoxe du généraliste sur Twitch</H2>
        <P>
          Le browse Twitch fonctionne par catégorie. Quand quelqu'un cherche un stream Fortnite,
          il voit une liste classée par nombre de viewers. Si tu as 5 viewers, tu apparais
          en bas de cette liste — derrière des milliers de chaînes.
        </P>
        <P>
          Dans une catégorie moins fréquentée avec 5 viewers, tu peux apparaître dans les 10
          premiers résultats. C'est mécaniquement plus de découvertabilité.
        </P>
        <StatBlock
          stats={[
            { value: "40 000+", label: "streams simultanés pour Fortnite aux heures de pointe" },
            { value: "150-300", label: "streams pour un jeu de niche moyen" },
            { value: "10×", label: "plus de chances d'être découvert dans une niche" },
          ]}
        />

        <H2 id="ratio">Le ratio viewers/streamers : la métrique clé</H2>
        <P>
          Pour évaluer l'attractivité d'une catégorie, le bon indicateur n'est pas le nombre
          de viewers — c'est le <strong>ratio viewers/streamers</strong>. Il mesure combien
          de viewers sont disponibles par streamer actif.
        </P>
        <Callout icon="📊" title="Comment interpréter le ratio">
          <strong>Ratio {'<'} 1 :</strong> en moyenne, moins d'un viewer par streamer. Catégorie sur-saturée.<br/>
          <strong>Ratio 1-3 :</strong> compétition élevée, difficile sans communauté préexistante.<br/>
          <strong>Ratio {'>'} 5 :</strong> bonne opportunité — plus de viewers que de streamers actifs.<br/>
          <strong>Ratio {'>'} 10 :</strong> niche idéale, peu de compétition, demande réelle.
        </Callout>
        <P>
          Tu peux trouver ces données sur SullyGnome dans la section "Browse" → sélectionner
          une catégorie → voir le ratio moyen viewers/streamers par tranche horaire.
        </P>

        <H2 id="methode">La méthode en 3 étapes pour trouver ta niche</H2>
        <NumberedStep n={1} title="Liste tes 10 jeux préférés que tu connais bien">
          La connaissance du jeu est non-négociable. Tu vas en parler pendant des heures — tu
          dois être naturellement expert et passionné. Pas la peine de choisir un jeu "de niche"
          si tu t'ennuies à le jouer.
        </NumberedStep>
        <NumberedStep n={2} title="Analyse le ratio viewers/streamers pour chacun">
          Utilise SullyGnome pour regarder le ratio en soirée (ton créneau probable) pour
          chaque jeu de ta liste. Élimine tous ceux qui ont un ratio inférieur à 3.
        </NumberedStep>
        <NumberedStep n={3} title="Croise attractivité et passion">
          Parmi les jeux restants (ratio {'>'} 3), lequel te passionne le plus ? C'est ta niche
          de départ. Si plusieurs matchent, commence par le plus récent (la fenêtre de découverte
          est souvent meilleure sur les jeux récents).
        </NumberedStep>

        <H2 id="pieges">Les pièges classiques à éviter</H2>
        <Ul>
          <Li>
            <strong>Just Chatting sans audience :</strong> la catégorie la plus regardée sur Twitch
            est aussi la plus dure pour un débutant. Sans jeu pour filtrer les viewers potentiels,
            il n'y a aucun mécanisme de découverte naturelle.
          </Li>
          <Li>
            <strong>Les survival games ultra-saturés :</strong> Rust, ARK, DayZ ont des communautés
            énormes et des milliers de streamers. Très difficile d'émerger sans 50+ viewers.
          </Li>
          <Li>
            <strong>Changer de niche toutes les 3 semaines :</strong> le temps d'ancrage d'une niche
            est d'au moins 6 à 8 semaines. Partir avant d'avoir un signal clair, c'est recommencer
            à zéro indéfiniment.
          </Li>
          <Li>
            <strong>Choisir un jeu mort :</strong> un jeu avec un bon ratio peut simplement être
            un jeu que personne ne regarde. Vérifie qu'il y a au minimum 500-1000 viewers simultanés
            dans la catégorie aux heures de pointe.
          </Li>
        </Ul>

        <H2 id="identite">Niche ≠ personnalité : une distinction importante</H2>
        <P>
          Choisir une niche de jeu, ce n'est pas renoncer à sa personnalité. La niche définit
          <em> où tu es visible</em> dans le browse Twitch. Ta personnalité définit
          <em> pourquoi les gens reviennent</em>.
        </P>
        <P>
          Les streamers qui durent sont ceux dont l'audience vient pour le jeu et reste pour
          le streamer. C'est la combinaison niche (acquisition) + personnalité (rétention) qui
          crée une chaîne solide.
        </P>

        <H2 id="tester">Comment tester une niche avant de s'y engager</H2>
        <P>
          Avant de t'engager sur 8 semaines dans une catégorie, fais un test de 3 streams :
          stream dans la catégorie aux créneaux que tu envisages, note le CCV moyen, le nombre
          de nouvelles personnes qui arrivent organiquement depuis le browse, et ton propre niveau
          d'énergie sur le jeu.
        </P>
        <P>
          Si après 3 streams tu as au moins 1-2 nouveaux viewers organiques et que tu es toujours
          enthousiasmé par le contenu, le test est positif. Engage-toi pour 8 semaines.
        </P>
        <Callout icon="🎯" title="Analyse la concurrence dans ta niche">
          Streamnco analyse tes streams et te montre comment tu te positionnes dans ta catégorie
          par rapport aux chaînes de taille similaire. Un benchmarking concret, pas des généralités.
        </Callout>
      </>
    ),
  },
];

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}
