import { useState, useRef, useEffect, useCallback, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Search, Loader2, ArrowRight, Radio, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  suggestStreamers,
  type StreamerSuggestion,
} from "@/services/streamerSearchSuggest";
import { normalizeChannelInput } from "@/services/channelInputNormalizer";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (next: string) => void;
  onSubmit: (login: string) => void;
  inputError: string | null;
}

const DEBOUNCE_MS = 300;
const MIN_CHARS = 2;

const HeroChannelSearch = ({ value, onChange, onSubmit, inputError }: Props) => {
  const [suggestions, setSuggestions] = useState<StreamerSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [hasSearched, setHasSearched] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dropdownRect, setDropdownRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

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

  useEffect(() => {
    const onDoc = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (containerRef.current?.contains(t)) return;
      if (dropdownRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  }, []);

  // Keep the portaled dropdown anchored to the input card on scroll/resize.
  useLayoutEffect(() => {
    if (!open) {
      setDropdownRect(null);
      return;
    }
    const update = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setDropdownRect({
        top: r.bottom + 8,
        left: r.left,
        width: r.width,
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, value]);

  const pickSuggestion = useCallback(
    (s: StreamerSuggestion) => {
      onChange(s.login);
      setOpen(false);
      setSuggestions([]);
      // Defer submit to next tick so parent state propagates
      setTimeout(() => onSubmit(s.login), 0);
    },
    [onChange, onSubmit],
  );

  const submitDirect = () => {
    const login = normalizeChannelInput(value);
    if (!login) return;
    onSubmit(login);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (open && activeIndex >= 0 && suggestions[activeIndex]) {
        pickSuggestion(suggestions[activeIndex]);
      } else {
        submitDirect();
      }
    }
  };

  const showDropdown =
    open && value.trim().length >= MIN_CHARS && (loading || hasSearched);

  return (
    <div ref={containerRef} className="relative">
      <div ref={anchorRef}>
        <Card>
          <CardContent className="flex flex-col gap-2 p-2 sm:flex-row">
            <div className="relative w-full flex-1 min-w-0">
              {loading ? (
                <Loader2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              ) : (
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              )}
              <Input
                ref={inputRef}
                type="text"
                placeholder="Pseudo Twitch ou URL de chaîne"
                value={value}
                onChange={(e) => {
                  onChange(e.target.value);
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={onKeyDown}
                className="h-11 w-full border-transparent bg-muted pl-9 focus-visible:ring-1 sm:h-10"
                aria-invalid={!!inputError}
                aria-autocomplete="list"
                aria-expanded={showDropdown}
                aria-controls="hero-suggest-list"
                role="combobox"
              />
            </div>
            <Button
              onClick={submitDirect}
              className="h-11 w-full shrink-0 sm:h-10 sm:w-auto"
            >
              Analyser ma chaîne
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {inputError && (
        <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>{inputError}</span>
        </div>
      )}

      {showDropdown &&
        dropdownRect &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            id="hero-suggest-list"
            role="listbox"
            style={{
              position: "fixed",
              top: dropdownRect.top,
              left: dropdownRect.left,
              width: dropdownRect.width,
              maxHeight: "min(320px, calc(100vh - 24px - " + dropdownRect.top + "px))",
            }}
            className="z-[100] overflow-hidden rounded-lg border border-border bg-popover text-left shadow-xl"
            // Prevent the input from losing focus on mobile tap (iOS Safari)
            onMouseDown={(e) => e.preventDefault()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            {loading && suggestions.length === 0 && (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Recherche en cours…
              </div>
            )}

            {!loading && hasSearched && suggestions.length === 0 && (
              <div className="px-4 py-3 text-sm text-muted-foreground">
                Aucun streamer trouvé pour « {value.trim()} »
              </div>
            )}

            {suggestions.length > 0 && (
              <ul className="max-h-[inherit] overflow-y-auto py-1">
                {suggestions.map((s, idx) => {
                  const active = idx === activeIndex;
                  return (
                    <li key={s.id} role="option" aria-selected={active}>
                      <button
                        type="button"
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => pickSuggestion(s)}
                        className={cn(
                          "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-secondary/70",
                          active && "bg-secondary",
                        )}
                      >
                        {s.thumbnail_url ? (
                          <img
                            src={s.thumbnail_url}
                            alt=""
                            className="h-9 w-9 shrink-0 rounded-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                            {s.display_name?.[0]?.toUpperCase() ?? "?"}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-medium text-foreground">
                              {s.display_name}
                            </span>
                            {s.is_live && (
                              <span className="inline-flex shrink-0 items-center gap-0.5 rounded-sm bg-destructive/15 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-destructive">
                                <Radio className="h-2 w-2" />
                                Live
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span className="truncate">@{s.login}</span>
                            {s.game_name && (
                              <>
                                <span aria-hidden>·</span>
                                <span className="truncate">{s.game_name}</span>
                              </>
                            )}
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

export default HeroChannelSearch;
