import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, Radio } from "lucide-react";
import { Input } from "@/components/ui/input";
import { normalizeChannelInput } from "@/services/channelInputNormalizer";
import {
  suggestStreamers,
  type StreamerSuggestion,
} from "@/services/streamerSearchSuggest";
import { cn } from "@/lib/utils";

interface Props {
  collapsed?: boolean;
}

const DEBOUNCE_MS = 220;

const SidebarStreamerSearch = ({ collapsed }: Props) => {
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<StreamerSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [hasSearched, setHasSearched] = useState(false);

  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced fetch
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = value.trim();

    if (q.length < 2) {
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
          setSuggestions(results);
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

  // Click outside closes
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const goToProfile = useCallback(
    (login: string) => {
      const clean = login.trim().toLowerCase();
      if (!clean) return;
      setOpen(false);
      setValue("");
      setSuggestions([]);
      navigate(`/streamer/${encodeURIComponent(clean)}`);
    },
    [navigate],
  );

  const submitDirect = () => {
    const login = normalizeChannelInput(value);
    if (!login) return;
    goToProfile(login);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
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
        goToProfile(suggestions[activeIndex].login);
      } else {
        submitDirect();
      }
    }
  };

  if (collapsed) return null;

  const showDropdown =
    open && value.trim().length >= 2 && (loading || hasSearched);

  return (
    <div className="px-2 pb-2" ref={containerRef}>
      <div className="relative">
        <div className="relative">
          {loading ? (
            <Loader2 className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : (
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          )}
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="Chercher un streamer"
            className="h-8 border-transparent bg-muted pl-7 text-xs focus-visible:ring-1"
            aria-autocomplete="list"
            aria-expanded={showDropdown}
            aria-controls="streamer-suggest-list"
          />
        </div>

        {showDropdown && (
          <div
            id="streamer-suggest-list"
            role="listbox"
            className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 overflow-hidden rounded-md border border-border bg-popover shadow-lg"
          >
            {loading && suggestions.length === 0 && (
              <div className="flex items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Recherche en cours…
              </div>
            )}

            {!loading && hasSearched && suggestions.length === 0 && (
              <div className="px-3 py-2.5 text-xs text-muted-foreground">
                Aucun streamer trouvé
              </div>
            )}

            {suggestions.length > 0 && (
              <ul className="max-h-72 overflow-y-auto py-1">
                {suggestions.map((s, idx) => {
                  const active = idx === activeIndex;
                  return (
                    <li key={s.id} role="option" aria-selected={active}>
                      <button
                        type="button"
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => goToProfile(s.login)}
                        className={cn(
                          "flex w-full items-center gap-2 px-2 py-1.5 text-left transition-colors",
                          active && "bg-accent text-accent-foreground",
                        )}
                      >
                        {s.thumbnail_url ? (
                          <img
                            src={s.thumbnail_url}
                            alt=""
                            className="h-7 w-7 shrink-0 rounded-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                            {s.display_name?.[0]?.toUpperCase() ?? "?"}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-xs font-medium text-foreground">
                              {s.display_name}
                            </span>
                            {s.is_live && (
                              <span className="inline-flex shrink-0 items-center gap-0.5 rounded-sm bg-destructive/15 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-destructive">
                                <Radio className="h-2 w-2" />
                                Live
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
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
          </div>
        )}
      </div>
    </div>
  );
};

export default SidebarStreamerSearch;
