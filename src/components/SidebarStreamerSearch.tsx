import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { normalizeChannelInput } from "@/services/channelInputNormalizer";

interface Props {
  collapsed?: boolean;
}

/**
 * Lightweight sidebar search. Submits to /streamer/:login on Enter.
 * No live autosuggest (kept honest and dependency-free for this phase).
 */
const SidebarStreamerSearch = ({ collapsed }: Props) => {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (busy) {
      const t = setTimeout(() => setBusy(false), 600);
      return () => clearTimeout(t);
    }
  }, [busy]);

  if (collapsed) return null;

  const submit = () => {
    const login = normalizeChannelInput(value);
    if (!login) return;
    setBusy(true);
    navigate(`/streamer/${encodeURIComponent(login)}`);
    setValue("");
  };

  return (
    <div className="px-2 pb-2">
      <div className="relative">
        {busy ? (
          <Loader2 className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : (
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        )}
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Chercher un streamer"
          className="h-8 border-transparent bg-muted pl-7 text-xs focus-visible:ring-1"
        />
      </div>
    </div>
  );
};

export default SidebarStreamerSearch;
