import { forwardRef } from "react";
import { getScoreTier } from "@/services/streamScoreTier";

// Hardcoded brand palette for reliable html-to-image capture (no CSS vars)
const BG = "#0d0e12";
const SURFACE = "#14161d";
const BORDER = "rgba(255,255,255,0.07)";
const FG = "#e8e9ed";
const FG_MUTED = "#7a8090";

const TIER_COLOR: Record<"high" | "mid" | "low", string> = {
  high: "hsl(95,98%,61%)",
  mid: "hsl(38,92%,50%)",
  low: "hsl(0,72%,51%)",
};

const TIER_LABEL: Record<"high" | "mid" | "low", string> = {
  high: "Base solide",
  mid: "En construction",
  low: "Base fragile",
};

interface MiniDim {
  label: string;
  score: number;
}

interface Props {
  displayName: string;
  login: string | null;
  score: number;
  miniBreakdown: MiniDim[];
  date: string;
}

const ShareScoreCard = forwardRef<HTMLDivElement, Props>(
  ({ displayName, login, score, miniBreakdown, date }, ref) => {
    const tier = getScoreTier(score);
    const accentColor = TIER_COLOR[tier];
    const tierLabel = TIER_LABEL[tier];

    // SVG ring
    const radius = 56;
    const circ = 2 * Math.PI * radius;
    const progress = (score / 100) * circ;
    const initial = (score / 100) * circ; // no animation in capture

    const letter = displayName.charAt(0).toUpperCase();

    return (
      <div
        ref={ref}
        style={{
          width: 600,
          height: 315,
          background: BG,
          fontFamily: "'DM Sans', system-ui, sans-serif",
          color: FG,
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          padding: "28px 32px 24px",
          boxSizing: "border-box",
        }}
      >
        {/* Radial glow top-left */}
        <div
          style={{
            position: "absolute",
            top: -60,
            left: -60,
            width: 260,
            height: 260,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${accentColor}18 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />
        {/* Radial glow bottom-right */}
        <div
          style={{
            position: "absolute",
            bottom: -40,
            right: -40,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${accentColor}10 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />

        {/* Top bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div
              style={{
                width: 22,
                height: 22,
                background: accentColor,
                borderRadius: 5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                color: "#0a0a0f",
              }}
            >
              ⚡
            </div>
            <span
              style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.02em" }}
            >
              Streamnco
            </span>
          </div>
          <span style={{ fontSize: 11, color: FG_MUTED }}>{date}</span>
        </div>

        {/* Main content row */}
        <div
          style={{
            display: "flex",
            gap: 28,
            flex: 1,
            alignItems: "center",
            position: "relative",
          }}
        >
          {/* Left: ring + score */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              flexShrink: 0,
            }}
          >
            {/* Avatar ring frame */}
            <div style={{ position: "relative", width: 148, height: 148 }}>
              <svg
                viewBox="0 0 148 148"
                width={148}
                height={148}
                style={{ transform: "rotate(-90deg)" }}
              >
                <circle
                  cx={74}
                  cy={74}
                  r={radius}
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth={10}
                />
                <circle
                  cx={74}
                  cy={74}
                  r={radius}
                  fill="none"
                  stroke={accentColor}
                  strokeWidth={10}
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={circ - initial}
                  style={{ filter: `drop-shadow(0 0 8px ${accentColor}80)` }}
                />
              </svg>
              {/* Score inside ring */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    fontSize: 40,
                    fontWeight: 800,
                    lineHeight: 1,
                    color: accentColor,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {score}
                </span>
                <span style={{ fontSize: 11, color: FG_MUTED, marginTop: 2 }}>
                  / 100
                </span>
              </div>
            </div>

            {/* Tier badge */}
            <div
              style={{
                borderRadius: 100,
                border: `1px solid ${accentColor}50`,
                background: `${accentColor}12`,
                padding: "3px 12px",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: accentColor,
              }}
            >
              {tierLabel}
            </div>
          </div>

          {/* Right: name + stats */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 16,
              minWidth: 0,
            }}
          >
            {/* Streamer identity */}
            <div>
              {/* Letter avatar */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: SURFACE,
                    border: `1.5px solid ${accentColor}40`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 15,
                    fontWeight: 700,
                    color: accentColor,
                    flexShrink: 0,
                  }}
                >
                  {letter}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      lineHeight: 1.2,
                      color: FG,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {displayName}
                  </div>
                  {login && (
                    <div style={{ fontSize: 12, color: FG_MUTED, marginTop: 1 }}>
                      @{login}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Dimension breakdown bars */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {miniBreakdown.slice(0, 3).map((dim) => {
                const dimTier = getScoreTier(dim.score);
                const dimColor = TIER_COLOR[dimTier];
                return (
                  <div key={dim.label}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 3,
                        fontSize: 10.5,
                      }}
                    >
                      <span style={{ color: FG_MUTED }}>{dim.label}</span>
                      <span
                        style={{ color: dimColor, fontWeight: 700 }}
                      >
                        {dim.score}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 4,
                        borderRadius: 100,
                        background: "rgba(255,255,255,0.07)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${dim.score}%`,
                          borderRadius: 100,
                          background: dimColor,
                          boxShadow: `0 0 6px ${dimColor}60`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom watermark */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: 12,
            position: "relative",
          }}
        >
          <span style={{ fontSize: 10, color: FG_MUTED }}>
            streamnco.com
          </span>
        </div>
      </div>
    );
  },
);

ShareScoreCard.displayName = "ShareScoreCard";
export default ShareScoreCard;
