import { useState, useRef, useEffect, useCallback, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Search, Loader2, Radio } from "lucide-react";
import { normalizeChannelInput } from "@/services/channelInputNormalizer";
import { suggestStreamers, type StreamerSuggestion } from "@/services/streamerSearchSuggest";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 300;
const MIN_CHARS = 2;

/**
 * Free-diagnostic hook with Twitch channel autocomplete (debounced search via
 * suggestStreamers). Value before signup — the site's primary conversion lever.
 * `tone="dark"` for the ink CTA bands. The suggestion dropdown is portaled so it
 * escapes the section's overflow-hidden.
 */
const DiagnosticForm = ({
  tone = "light",
  className,
}: {
  tone?: "light" | "dark";
  className?: string;
}) => {
  const navigate = useNavigate();
  const dark = tone === "dark";

  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<StreamerSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [hasSearched, setHasSearched] = useState(false);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLFormElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced suggestion search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = value.trim();
    if (q.length < MIN_CHARS) {
      setSuggestions([]);
      setLoading(false);
      setHasSearched(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      try {
        const results = await suggestStreamers(q, ctrl.signal);
        if (!ctrl.signal.aborted) {
          setSuggestions(results.slice(0, 8));
          setHasSearched(true);
          setActiveIndex(results.length > 0 ? 0 : -1);
        }
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (containerRef.current?.contains(t) || dropdownRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  }, []);

  // Anchor the portaled dropdown
  useLayoutEffect(() => {
    if (!open) {
      setRect(null);
      return;
    }
    const update = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.bottom + 8, left: r.left, width: r.width });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, value]);

  const go = (login: string, game?: string | null) => {
    const hint = game ? `&hint_game=${encodeURIComponent(game)}` : "";
    navigate(`/analyze?channel=${encodeURIComponent(login)}&mode=teaser${hint}`);
  };

  const pick = useCallback((s: StreamerSuggestion) => {
    setValue(s.login);
    setOpen(false);
    setSuggestions([]);
    go(s.login, s.game_name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const login = normalizeChannelInput(value);
    if (!login) {
      setError("Entre un pseudo Twitch valide ou une URL twitch.tv/…");
      return;
    }
    setError(null);
    go(login);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") return setOpen(false);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (open && activeIndex >= 0 && suggestions[activeIndex]) {
        e.preventDefault();
        pick(suggestions[activeIndex]);
      }
      // else: let the form submit
    }
  };

  const showDropdown = open && value.trim().length >= MIN_CHARS && (loading || hasSearched);

  return (
    <div ref={containerRef} className={cn("mx-auto max-w-lg", className)}>
      <form onSubmit={submit} ref={anchorRef}>
        <div
          className={cn(
            "flex flex-col gap-2 rounded-2xl border p-2 transition-colors sm:flex-row sm:items-center sm:rounded-full",
            dark
              ? "border-white/15 bg-white/[0.06] focus-within:border-white/35"
              : "border-el-hairline-strong bg-el-card shadow-[0_12px_40px_-16px_rgba(0,0,0,0.18)] focus-within:border-el-ink/40",
          )}
        >
          <div className="relative flex-1">
            {loading ? (
              <Loader2 className={cn("pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin", dark ? "text-el-on-dark-soft" : "text-el-muted")} />
            ) : (
              <Search className={cn("pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2", dark ? "text-el-on-dark-soft" : "text-el-muted")} />
            )}
            <input
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setOpen(true);
                if (error) setError(null);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={onKeyDown}
              placeholder="Ton pseudo Twitch (ex. ninja)"
              aria-label="Pseudo ou URL de ta chaîne Twitch"
              role="combobox"
              aria-expanded={showDropdown}
              aria-autocomplete="list"
              className={cn(
                "h-11 w-full bg-transparent pl-10 pr-4 font-el-sans text-[16px] outline-none",
                dark ? "text-el-on-dark placeholder:text-el-on-dark-soft" : "text-el-ink placeholder:text-el-muted-soft",
              )}
            />
          </div>
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
      </form>
      {error && <p className={cn("mt-2 font-el-sans text-[13px]", dark ? "text-el-rose" : "text-el-danger")}>{error}</p>}

      {showDropdown && rect && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            role="listbox"
            style={{
              position: "fixed",
              top: rect.top,
              left: rect.left,
              width: rect.width,
              maxHeight: `min(340px, calc(100vh - 24px - ${rect.top}px))`,
            }}
            className="z-[100] overflow-hidden rounded-2xl border border-el-hairline bg-el-card text-left shadow-[0_30px_60px_-20px_rgba(0,0,0,0.3)]"
            onMouseDown={(e) => e.preventDefault()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            {loading && suggestions.length === 0 && (
              <div className="flex items-center gap-2 px-4 py-3 font-el-sans text-[14px] text-el-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Recherche en cours…
              </div>
            )}
            {!loading && hasSearched && suggestions.length === 0 && (
              <div className="px-4 py-3 font-el-sans text-[14px] text-el-muted">
                Aucun streamer trouvé pour « {value.trim()} »
              </div>
            )}
            {suggestions.length > 0 && (
              <ul className="max-h-[inherit] overflow-y-auto py-1.5">
                {suggestions.map((s, idx) => {
                  const active = idx === activeIndex;
                  return (
                    <li key={s.id} role="option" aria-selected={active}>
                      <button
                        type="button"
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => pick(s)}
                        className={cn("flex w-full items-center gap-3 px-3 py-2 text-left transition-colors", active ? "bg-el-strong" : "hover:bg-el-canvas-soft")}
                      >
                        {s.thumbnail_url ? (
                          <img src={s.thumbnail_url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" loading="lazy" />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-el-strong text-[13px] font-semibold text-el-muted">
                            {s.display_name?.[0]?.toUpperCase() ?? "?"}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate font-el-sans text-[14px] font-medium text-el-ink">{s.display_name}</span>
                            {s.is_live && (
                              <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-el-danger/12 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-el-danger">
                                <Radio className="h-2 w-2" /> Live
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 font-el-sans text-[12px] text-el-muted">
                            <span className="truncate">@{s.login}</span>
                            {s.game_name && (<><span aria-hidden>·</span><span className="truncate">{s.game_name}</span></>)}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
};

export default DiagnosticForm;
