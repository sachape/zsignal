import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Scissors,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  Eye,
  Clock,
  TrendingUp,
  Flame,
  Calendar,
  Wand2,
  Loader2,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState, ErrorState } from "@/components/StateView";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { usePageMeta } from "@/hooks/usePageMeta";
import { cn } from "@/lib/utils";
import {
  buildPlannerResult,
  filterInsights,
  loadCategories,
  loadConnectedTwitchAccount,
  loadRecentClips,
  POTENTIAL_LABEL_FR,
  sortInsights,
  type CategoryInfo,
  type ClipFilter,
  type ClipInsight,
  type ClipSort,
  type ConnectedTwitchAccount,
  type PlannerResult,
} from "@/services/shortContentPlanner";
import { generateClipCopy } from "@/services/shortContentCopy";

type Status = "loading" | "ready" | "error";

const FILTERS: { id: ClipFilter; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "high", label: "Potentiel élevé" },
  { id: "underused", label: "Sous-exploités" },
  { id: "recent", label: "Récents" },
  { id: "rework", label: "À retravailler" },
];

const SORTS: { id: ClipSort; label: string }[] = [
  { id: "potential", label: "Potentiel" },
  { id: "views", label: "Vues" },
  { id: "recent", label: "Plus récents" },
  { id: "duration", label: "Durée" },
];

function formatDuration(sec: number): string {
  if (!sec || sec <= 0) return "—";
  const s = Math.round(sec);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r === 0 ? `${m}min` : `${m}m${r.toString().padStart(2, "0")}`;
}

function formatRelDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = (Date.now() - d.getTime()) / 86400000;
  if (diff < 1) return "aujourd'hui";
  if (diff < 2) return "hier";
  if (diff < 7) return `il y a ${Math.floor(diff)} j`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function formatViews(n: number | null | undefined): string {
  const v = Math.max(0, n ?? 0);
  if (v >= 10000) return `${(v / 1000).toFixed(1).replace(".0", "")}k`;
  return v.toLocaleString("fr-FR");
}

function labelBadgeClass(label: ClipInsight["label"]): string {
  switch (label) {
    case "high":
      return "border-primary/40 bg-primary/15 text-primary-strong";
    case "good":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
    case "rework":
      return "border-amber-500/30 bg-amber-500/10 text-amber-400";
    case "weak":
    default:
      return "border-border/60 bg-muted/40 text-muted-foreground";
  }
}

function thumbUrl(raw: string | null): string | null {
  if (!raw) return null;
  return raw
    .replace("%{width}", "320")
    .replace("%{height}", "180")
    .replace("{width}", "320")
    .replace("{height}", "180");
}

interface CopyButtonProps {
  label: string;
  text: string;
  small?: boolean;
}

const CopyButton = ({ label, text, small }: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: "Copié", description: `${label} dans le presse-papiers.` });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ title: "Impossible de copier", description: "Réessaie depuis le bouton.", variant: "destructive" });
    }
  };
  return (
    <Button
      type="button"
      variant="outline"
      size={small ? "sm" : "default"}
      onClick={onCopy}
      className={cn("gap-1.5", small && "h-7 px-2 text-[11px]")}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {label}
    </Button>
  );
};

type TransformState = "idle" | "creating" | "existing";

interface ClipCardProps {
  insight: ClipInsight;
  gameName: string | null;
  transformState: TransformState;
  onTransform: (insight: ClipInsight) => void;
}

const ClipCard = ({ insight, gameName, transformState, onTransform }: ClipCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const copy = useMemo(
    () => generateClipCopy(insight.clip, insight, gameName),
    [insight, gameName],
  );
  const thumb = thumbUrl(insight.clip.thumbnail_url);
  const title = insight.clip.title?.trim() || "Clip sans titre";

  return (
    <Card className="overflow-hidden border-border/60 bg-card/60 backdrop-blur">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          <div className="relative w-full shrink-0 overflow-hidden bg-muted sm:w-[200px] md:w-[240px]">
            <div className="aspect-video w-full">
              {thumb ? (
                <img
                  src={thumb}
                  alt={title}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <Scissors className="h-6 w-6" />
                </div>
              )}
            </div>
            <div className="absolute bottom-2 left-2 flex gap-1.5">
              <Badge variant="outline" className={cn("text-[10px] font-semibold uppercase tracking-wider", labelBadgeClass(insight.label))}>
                {POTENTIAL_LABEL_FR[insight.label]}
              </Badge>
              {insight.isUnderused && (
                <Badge variant="outline" className="border-amber-500/40 bg-background/80 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                  Sous-exploité
                </Badge>
              )}
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-foreground sm:text-base" title={title}>
                  {title}
                </h3>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{insight.reason}</p>
              </div>
              {insight.clip.url && (
                <a
                  href={insight.clip.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-md border border-border/60 p-1.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                  title="Voir sur Twitch"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{formatViews(insight.clip.view_count)} vues</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDuration(insight.durationSec)}</span>
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatRelDate(insight.clip.clip_created_at)}</span>
              <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />{insight.score}/100</span>
              {gameName ? (
                <Badge variant="outline" className="h-5 border-border/60 bg-muted/30 text-[10px] font-medium text-muted-foreground">
                  {gameName}
                </Badge>
              ) : insight.clip.game_id ? (
                <Badge variant="outline" className="h-5 border-border/60 bg-muted/20 text-[10px] font-medium text-muted-foreground/70">
                  Catégorie inconnue
                </Badge>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {transformState === "existing" ? (
                <Button asChild type="button" size="sm" className="h-7 gap-1.5 px-2 text-[11px]">
                  <Link to="/content-queue">
                    <Check className="h-3.5 w-3.5" />
                    Voir dans la queue
                  </Link>
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onTransform(insight)}
                  disabled={transformState === "creating"}
                  className="h-7 gap-1.5 px-2 text-[11px]"
                >
                  {transformState === "creating" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="h-3.5 w-3.5" />
                  )}
                  {transformState === "creating" ? "Création…" : "Transformer en Short"}
                </Button>
              )}
              <CopyButton small label="Hook" text={copy.hooks[0] ?? ""} />
              <CopyButton small label="Caption" text={copy.caption} />
              <CopyButton small label="Titre" text={copy.title} />
              <CopyButton small label="Pack complet" text={copy.fullPack} />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setExpanded((v) => !v)}
                className="h-7 px-2 text-[11px] text-muted-foreground"
              >
                {expanded ? "Masquer" : "Voir le pack"}
              </Button>
            </div>


            {expanded && (
              <div className="mt-1 space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3 text-xs">
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">Titre court</p>
                  <p className="text-foreground">{copy.title}</p>
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">Hooks (3 variantes)</p>
                  <ul className="space-y-1 text-foreground">
                    {copy.hooks.map((h, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-muted-foreground/60">{i + 1}.</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">Caption</p>
                  <pre className="whitespace-pre-wrap font-sans text-foreground">{copy.caption}</pre>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">Format</p>
                    <p className="text-foreground">{copy.formatRecommendation}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">Timing</p>
                    <p className="text-foreground">{copy.timingRecommendation}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const SummaryTile = ({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  hint?: string;
}) => (
  <Card className="border-border/60 bg-card/60">
    <CardContent className="flex items-start gap-3 p-4">
      <div className="rounded-md bg-primary/10 p-2 text-primary-strong">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">{label}</p>
        <p className="mt-0.5 truncate text-base font-semibold text-foreground" title={value}>{value}</p>
        {hint && <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{hint}</p>}
      </div>
    </CardContent>
  </Card>
);

const ClipsPage = () => {
  usePageMeta({
    title: "Clips · Streamnco",
    description: "Repère tes meilleurs moments Twitch et transforme-les en contenus courts prêts à poster.",
  });

  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<Status>("loading");
  const [account, setAccount] = useState<ConnectedTwitchAccount | null>(null);
  const [result, setResult] = useState<PlannerResult | null>(null);
  const [categories, setCategories] = useState<Map<string, CategoryInfo>>(new Map());
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<ClipFilter>("all");
  const [sort, setSort] = useState<ClipSort>("potential");
  const [transformStates, setTransformStates] = useState<Record<string, TransformState>>({});

  const loadExistingTransforms = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("creator_content_items")
      .select("external_platform_id")
      .eq("user_id", user.id)
      .eq("source_platform", "twitch_clip")
      .not("external_platform_id", "is", null);
    if (!data) return;
    const map: Record<string, TransformState> = {};
    for (const row of data) {
      const key = (row as { external_platform_id: string | null }).external_platform_id;
      if (key) map[key] = "existing";
    }
    setTransformStates((prev) => ({ ...map, ...prev }));
  }, [user]);

  const handleTransform = useCallback(
    async (insight: ClipInsight) => {
      if (!user) return;
      const clip = insight.clip;
      const clipKey = clip.twitch_clip_id;
      if (!clipKey || !clip.url) {
        toast({
          title: "Clip indisponible",
          description: "Ce clip Twitch n'a pas d'URL exploitable.",
          variant: "destructive",
        });
        return;
      }
      if (transformStates[clipKey] === "existing" || transformStates[clipKey] === "creating") return;

      setTransformStates((prev) => ({ ...prev, [clipKey]: "creating" }));
      try {
        // Anti-dup guard: re-check before insert.
        const { data: existing } = await supabase
          .from("creator_content_items")
          .select("id")
          .eq("user_id", user.id)
          .eq("source_platform", "twitch_clip")
          .eq("external_platform_id", clipKey)
          .maybeSingle();

        let contentItemId = existing?.id ?? null;
        const durationSec = Math.max(5, Math.min(Math.round(clip.duration ?? 60), 60));
        const title = clip.title?.trim() || "Clip Twitch";

        if (!contentItemId) {
          const { data: inserted, error: insertErr } = await supabase
            .from("creator_content_items")
            .insert({
              user_id: user.id,
              platform: "tiktok",
              title,
              status: "to_generate",
              source_platform: "twitch_clip",
              reason: "twitch_clip_full",
              source_video_url: clip.url,
              source_start_time: 0,
              source_end_time: durationSec,
              source_duration: durationSec,
              external_platform_id: clipKey,
              thumbnail_url: clip.thumbnail_url,
              hashtags: [],
            })
            .select("id")
            .single();
          if (insertErr || !inserted) throw insertErr ?? new Error("insert_failed");
          contentItemId = inserted.id;
        }

        const { data: jobData, error: jobErr } = await supabase.functions.invoke<{
          success?: boolean;
          error?: string;
          message?: string;
        }>("clip-job-create", {
          body: {
            content_item_id: contentItemId,
            source_type: "twitch_clip",
            source_url: clip.url,
            start_time_seconds: 0,
            end_time_seconds: durationSec,
          },
        });

        const errMsg = jobErr?.message ?? jobData?.message ?? jobData?.error;
        if (jobErr || (jobData && jobData.success === false)) {
          // Content item exists → still mark as existing so user can find it in queue.
          setTransformStates((prev) => ({ ...prev, [clipKey]: "existing" }));
          toast({
            title: "Génération non lancée",
            description: errMsg ?? "Réessaie depuis la Content Queue.",
            variant: "destructive",
          });
          return;
        }

        setTransformStates((prev) => ({ ...prev, [clipKey]: "existing" }));
        toast({
          title: "Clip en génération",
          description: "Retrouve-le dans la Content Queue.",
        });
      } catch (err) {
        setTransformStates((prev) => ({ ...prev, [clipKey]: "idle" }));
        toast({
          title: "Impossible de transformer ce clip",
          description: err instanceof Error ? err.message : "Réessaie dans un instant.",
          variant: "destructive",
        });
      }
    },
    [toast, transformStates, user],
  );

  const load = useCallback(async () => {
    if (!user) return;
    setStatus("loading");
    try {
      const acc = await loadConnectedTwitchAccount(user.id);
      setAccount(acc);
      const clips = await loadRecentClips({ lookbackDays: 14 });
      const planner = buildPlannerResult(clips);
      setResult(planner);
      // Best-effort: load category names. Failure is silent (cards show fallback).
      const cats = await loadCategories(clips.map((c) => c.game_id));
      setCategories(cats);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(async () => {
    if (!user || !account) {
      toast({
        title: "Compte Twitch non connecté",
        description: "Connecte ton compte Twitch pour récupérer tes clips.",
        variant: "destructive",
      });
      return;
    }
    setRefreshing(true);
    try {
      const startedAt = new Date(Date.now() - 14 * 86400000).toISOString();
      const { data, error } = await supabase.functions.invoke<{ success?: boolean; upserted?: number; error?: string }>(
        "twitch-clips-ingest",
        {
          body: {
            user_id: user.id,
            broadcaster_id: account.broadcaster_id,
            started_at: startedAt,
          },
        },
      );
      if (error || !data?.success) {
        toast({
          title: "Impossible de rafraîchir tes clips",
          description: "Réessaie dans quelques instants.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Clips à jour",
          description: data.upserted ? `${data.upserted} clips synchronisés.` : "Synchronisation terminée.",
        });
        await load();
      }
    } catch {
      toast({
        title: "Impossible de rafraîchir tes clips",
        description: "Réessaie dans quelques instants.",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  }, [account, load, toast, user]);

  const visibleInsights = useMemo(() => {
    if (!result) return [];
    return sortInsights(filterInsights(result.insights, filter), sort);
  }, [result, filter, sort]);

  const action = (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild className="gap-2">
        <a href="/clips/vod-import">
          <Scissors className="h-4 w-4" />
          Créer depuis une VOD
        </a>
      </Button>
      <Button onClick={refresh} disabled={refreshing} variant="outline" className="gap-2">
        <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
        {refreshing ? "Synchronisation…" : "Rafraîchir mes clips"}
      </Button>
    </div>
  );

  return (
    <AppShell>
      <PageContainer size="lg">
        <PageHeader
          title="Clips"
          description="Repère tes meilleurs moments et transforme-les en contenus courts."
          action={action}
        />

        {status === "loading" && <LoadingState label="Chargement de tes clips…" />}

        {status === "error" && (
          <ErrorState
            title="Impossible de charger tes clips"
            description="Une erreur est survenue. Réessaie dans quelques instants."
            action={<Button onClick={load} variant="outline" className="gap-2"><RefreshCw className="h-4 w-4" />Réessayer</Button>}
          />
        )}

        {status === "ready" && result && result.total === 0 && (
          <Card className="border-border/60 bg-card/40">
            <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
              <div className="rounded-full bg-primary/10 p-3 text-primary-strong">
                <Scissors className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Aucun clip Twitch récent détecté.</h2>
              <p className="max-w-md text-sm text-muted-foreground">
                Crée quelques clips pendant tes lives, puis reviens ici pour obtenir des idées de contenus courts.
              </p>
              <Button onClick={refresh} disabled={refreshing} className="mt-2 gap-2">
                <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                Rafraîchir mes clips
              </Button>
            </CardContent>
          </Card>
        )}

        {status === "ready" && result && result.total > 0 && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryTile
                icon={Scissors}
                label="Clips récents"
                value={String(result.total)}
                hint="14 derniers jours"
              />
              <SummaryTile
                icon={Flame}
                label="Clip le plus fort"
                value={result.topPerformer?.clip.title?.trim() || "Sans titre"}
                hint={result.topPerformer ? `${formatViews(result.topPerformer.clip.view_count)} vues · ${POTENTIAL_LABEL_FR[result.topPerformer.label]}` : undefined}
              />
              <SummaryTile
                icon={Sparkles}
                label="À republier"
                value={String(
                  result.insights.filter((i) => i.isUnderused || i.label === "high").length,
                )}
                hint={result.underusedCount > 0 ? `${result.underusedCount} sous-exploités` : "Top potentiel inclus"}
              />
              <SummaryTile
                icon={TrendingUp}
                label="Format conseillé"
                value="9:16 court"
                hint={result.recommendedFormat}
              />
            </div>

            {result.total < 3 && (
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardContent className="p-4 text-sm text-amber-200/90">
                  Pas encore assez de clips pour une analyse complète, mais voici ceux que tu peux déjà recycler.
                </CardContent>
              </Card>
            )}

            {/* Filters + sort */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1.5">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition-colors",
                      filter === f.id
                        ? "border-primary/40 bg-primary/15 text-primary-strong"
                        : "border-border/60 bg-card/40 text-muted-foreground hover:bg-muted/40",
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Trier par</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as ClipSort)}
                  className="rounded-md border border-border/60 bg-card/40 px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none"
                >
                  {SORTS.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* List */}
            {visibleInsights.length === 0 ? (
              <Card className="border-border/60 bg-card/40">
                <CardContent className="p-6 text-center text-sm text-muted-foreground">
                  Aucun clip ne correspond à ce filtre. Essaie un autre filtre.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {visibleInsights.map((insight) => (
                  <ClipCard
                    key={insight.clip.id}
                    insight={insight}
                    gameName={
                      insight.clip.game_id
                        ? categories.get(insight.clip.game_id)?.game_name ?? null
                        : null
                    }
                  />
                ))}
              </div>
            )}

            {/* Footer reco */}
            <Card className="border-border/60 bg-card/40">
              <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">Format recommandé</p>
                  <p className="mt-1 text-sm text-foreground">{result.recommendedFormat}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">Timing conseillé</p>
                  <p className="mt-1 text-sm text-foreground">{result.recommendedTiming}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </PageContainer>
    </AppShell>
  );
};

export default ClipsPage;
