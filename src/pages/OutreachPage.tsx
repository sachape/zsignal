import { useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import {
  CheckCircle2, Copy, Download, Loader2, Search, AlertTriangle,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { runTeaserAnalysis } from "@/services/teaserAnalysisRunner";
import type { AnalysisReport } from "@/types/analysis";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useAuth } from "@/contexts/AuthContext";

const ADMIN_EMAIL = "perathonersacha@gmail.com";

// ── DM template generator ────────────────────────────────────────────────────

type DmTone = "soft" | "direct" | "curious";

function getMainBlocker(report: AnalysisReport): { label: string; key: string } {
  const score = report.score;
  if (!score) return { label: "la progression", key: "general" };
  const dims = [
    { key: "regularity", label: "la régularité", score: score.regularity },
    { key: "content", label: "le contenu", score: score.content },
    { key: "positioning", label: "le positionnement", score: score.positioning },
    { key: "structure", label: "la structure", score: score.structure },
    { key: "momentum", label: "le momentum", score: score.momentum },
    { key: "monetization", label: "la monétisation", score: score.monetization },
  ];
  const weakest = dims.sort((a, b) => a.score - b.score)[0];
  return { label: weakest.label, key: weakest.key };
}

const BLOCKER_COPY: Record<string, string> = {
  regularity: "ton planning manque de régularité — tes viewers ne savent pas quand revenir",
  content: "tes meilleurs moments en live ne sont pas assez transformés en clips réutilisables",
  positioning: "ta catégorie change trop souvent, ce qui freine ta découvrabilité",
  structure: "tes sessions sont trop courtes pour créer une vraie habitude chez tes viewers",
  momentum: "tu as eu peu d'activité récente — difficile de garder ta communauté engagée",
  monetization: "tu approches des critères d'affiliation mais il reste des signaux à améliorer",
  general: "il y a des axes clairs à améliorer pour accélérer ta croissance",
};

function generateDm(
  login: string,
  report: AnalysisReport,
  tone: DmTone,
): string {
  const score = report.score?.overall ?? 0;
  const name = report.channel_summary?.display_name ?? login;
  const category = report.channel_summary?.category ?? "Twitch";
  const blocker = getMainBlocker(report);
  const blockerCopy = BLOCKER_COPY[blocker.key];

  if (tone === "soft") {
    return `Hey ${name} 👋

J'ai analysé ta chaîne avec Streamnco — ton StreamScore est ${score}/100.

Ce qui ressort : ${blockerCopy}.

J'ai un outil qui génère un diagnostic complet en 1 minute, gratuitement. Ça pourrait t'aider à identifier exactement quoi corriger en priorité.

Tu veux que je t'envoie le lien ?`;
  }

  if (tone === "direct") {
    return `Hey ${name},

Ton StreamScore sur Streamnco : ${score}/100.

Blocage principal détecté : ${blockerCopy}.

Le diagnostic complet est gratuit — juste ton pseudo Twitch à entrer sur streamnco.fr

Si tu veux des actions concrètes pour débloquer ta chaîne, c'est là.`;
  }

  // curious
  return `Hey ${name} 👋

Tu savais que ta chaîne a un score de ${score}/100 sur Streamnco ?

Ce qui me saute aux yeux : ${blockerCopy}. C'est souvent le premier frein sur une chaîne ${category} FR.

Curieux de voir ce qui ressort pour toi ? Le diagnostic est gratuit sur streamnco.fr — résultat en 1 minute.`;
}

// ── Types ────────────────────────────────────────────────────────────────────

type Status = "pending" | "loading" | "done" | "error" | "not_found";
type ContactStatus = "none" | "copied" | "sent";

interface StreamerRow {
  login: string;
  status: Status;
  report: AnalysisReport | null;
  error?: string;
  contactStatus: ContactStatus;
  dmCopied: boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Page ─────────────────────────────────────────────────────────────────────

const OutreachPage = () => {
  usePageMeta({ title: "Outreach — Streamnco" });
  const { user } = useAuth();

  if (!user || user.email !== ADMIN_EMAIL) {
    return <Navigate to="/dashboard" replace />;
  }

  const [input, setInput] = useState("");
  const [rows, setRows] = useState<StreamerRow[]>([]);
  const [running, setRunning] = useState(false);
  const [tone, setTone] = useState<DmTone>("direct");

  const analyze = useCallback(async () => {
    const logins = input
      .split(/[\n,;]+/)
      .map((l) => l.trim().toLowerCase().replace(/^@/, ""))
      .filter(Boolean)
      .slice(0, 30);

    if (!logins.length) return;

    const initial: StreamerRow[] = logins.map((login) => ({
      login, status: "pending", report: null, contactStatus: "none", dmCopied: false,
    }));
    setRows(initial);
    setRunning(true);

    // Process in batches of 4 to avoid rate limiting
    const BATCH = 4;
    for (let i = 0; i < logins.length; i += BATCH) {
      const batch = logins.slice(i, i + BATCH);

      setRows((prev) =>
        prev.map((r) =>
          batch.includes(r.login) ? { ...r, status: "loading" } : r,
        ),
      );

      await Promise.all(
        batch.map(async (login) => {
          const result = await runTeaserAnalysis({ channelInput: login });
          setRows((prev) =>
            prev.map((r) => {
              if (r.login !== login) return r;
              if (result.ok === false) {
                return {
                  ...r,
                  status: result.reason === "not_found" ? "not_found" : "error",
                  error: result.reason === "not_found" ? "Chaîne introuvable" : "Erreur API",
                };
              }
              return { ...r, status: "done", report: result.record.report };
            }),
          );
        }),
      );

      if (i + BATCH < logins.length) await sleep(600);
    }

    setRunning(false);
  }, [input]);

  const copyDm = (login: string, report: AnalysisReport) => {
    navigator.clipboard.writeText(generateDm(login, report, tone));
    setRows((prev) =>
      prev.map((r) =>
        r.login === login ? { ...r, dmCopied: true, contactStatus: "copied" } : r,
      ),
    );
    setTimeout(() => {
      setRows((prev) =>
        prev.map((r) => r.login === login ? { ...r, dmCopied: false } : r),
      );
    }, 2000);
  };

  const markSent = (login: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.login === login ? { ...r, contactStatus: "sent" } : r,
      ),
    );
  };

  const exportCsv = () => {
    const done = rows.filter((r) => r.status === "done" && r.report);
    const lines = [
      "login,display_name,score,blocage,categorie,dm",
      ...done.map((r) => {
        const report = r.report!;
        const score = report.stream_score?.overall ?? "";
        const name = report.channel_summary?.display_name ?? r.login;
        const blocker = getMainBlocker(report);
        const cat = report.channel_summary?.category ?? "";
        const dm = generateDm(r.login, report, tone).replace(/\n/g, " ").replace(/,/g, " ");
        return `${r.login},"${name}",${score},"${blocker.label}","${cat}","${dm}"`;
      }),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "outreach-streamnco.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const done = rows.filter((r) => r.status === "done").length;
  const total = rows.length;

  return (
    <AppShell>
      <PageContainer>
        <PageHeader
          eyebrow="Interne"
          title="Outreach Generator"
          description="Analyse des chaînes Twitch et génère des DMs personnalisés en masse."
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_1.8fr]">
          {/* ── Input panel ── */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border/50 bg-card/40 p-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pseudos Twitch <span className="font-normal normal-case">(1 par ligne, max 30)</span>
              </label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"xqc\npokimane\ntaroandfriends\n..."}
                rows={12}
                className="w-full resize-none rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/50"
              />

              {/* Tone selector */}
              <div className="mt-3">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Ton du message
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["soft", "direct", "curious"] as DmTone[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      className={cn(
                        "rounded-lg border px-2 py-1.5 text-xs font-medium transition-all",
                        tone === t
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-border/50 bg-muted/20 text-muted-foreground hover:border-border",
                      )}
                    >
                      {t === "soft" ? "Doux" : t === "direct" ? "Direct" : "Curieux"}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={analyze}
                disabled={running || !input.trim()}
                className="mt-3 w-full gap-2"
              >
                {running ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Analyse en cours…</>
                ) : (
                  <><Search className="h-4 w-4" /> Analyser et générer</>
                )}
              </Button>
            </div>

            {/* Stats */}
            {total > 0 && (
              <div className="rounded-xl border border-border/40 bg-card/30 p-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: "Analysés", value: done },
                    { label: "Copiés", value: rows.filter((r) => r.contactStatus !== "none").length },
                    { label: "Envoyés", value: rows.filter((r) => r.contactStatus === "sent").length },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xl font-bold tabular-nums text-foreground">{value}</p>
                      <p className="text-[10px] text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
                {done > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={exportCsv}
                    className="mt-3 w-full gap-2 text-xs"
                  >
                    <Download className="h-3.5 w-3.5" /> Exporter CSV
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* ── Results ── */}
          <div className="space-y-3">
            {rows.length === 0 && (
              <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border/40">
                <div className="text-center">
                  <Search className="mx-auto h-7 w-7 text-muted-foreground/25" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Entre des pseudos Twitch et lance l'analyse
                  </p>
                </div>
              </div>
            )}

            {rows.map((row) => {
              const report = row.report;
              const score = report?.stream_score?.overall;
              const name = report?.channel_summary?.display_name ?? row.login;
              const category = report?.channel_summary?.category ?? null;
              const followers = report?.channel_summary?.follower_count ?? null;
              const blocker = report ? getMainBlocker(report) : null;
              const dm = report ? generateDm(row.login, report, tone) : null;

              return (
                <div
                  key={row.login}
                  className={cn(
                    "overflow-hidden rounded-xl border bg-card/40 transition-all",
                    row.contactStatus === "sent"
                      ? "border-emerald-500/25 bg-emerald-500/5"
                      : "border-border/50",
                  )}
                >
                  {/* Header */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    {/* Avatar placeholder */}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {row.login[0]?.toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {name !== row.login ? name : row.login}
                        </p>
                        {name !== row.login && (
                          <span className="text-xs text-muted-foreground/50">@{row.login}</span>
                        )}
                        {category && (
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {category}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {followers != null && (
                          <span className="text-[10px] text-muted-foreground/60">
                            {followers.toLocaleString("fr-FR")} followers
                          </span>
                        )}
                        {blocker && (
                          <span className="flex items-center gap-1 text-[10px] text-warning/80">
                            <AlertTriangle className="h-2.5 w-2.5" /> {blocker.label}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Score badge */}
                    <div className="flex shrink-0 items-center gap-2">
                      {row.status === "loading" && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      {row.status === "pending" && (
                        <span className="text-[10px] text-muted-foreground/40">En attente</span>
                      )}
                      {(row.status === "not_found" || row.status === "error") && (
                        <span className="text-[10px] text-destructive">{row.error}</span>
                      )}
                      {score != null && (
                        <div className={cn(
                          "flex h-10 w-10 flex-col items-center justify-center rounded-lg border",
                          score >= 70 ? "border-primary/30 bg-primary/10 text-primary" :
                          score >= 45 ? "border-warning/30 bg-warning/10 text-warning" :
                          "border-destructive/30 bg-destructive/10 text-destructive",
                        )}>
                          <span className="text-sm font-bold tabular-nums leading-none">{score}</span>
                          <span className="text-[8px] opacity-60">pts</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* DM preview + actions */}
                  {dm && (
                    <div className="border-t border-border/30 px-4 pb-4 pt-3">
                      <div className="rounded-lg bg-muted/20 px-3 py-2.5">
                        <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/80">
                          {dm}
                        </p>
                      </div>
                      <div className="mt-2.5 flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1.5 px-2.5 text-xs"
                          onClick={() => copyDm(row.login, report!)}
                        >
                          {row.dmCopied ? (
                            <><CheckCircle2 className="h-3 w-3 text-emerald-400" /> Copié</>
                          ) : (
                            <><Copy className="h-3 w-3" /> Copier le DM</>
                          )}
                        </Button>
                        {row.contactStatus !== "sent" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-emerald-400"
                            onClick={() => markSent(row.login)}
                          >
                            <CheckCircle2 className="h-3 w-3" /> Marquer envoyé
                          </Button>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-medium text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" /> Envoyé
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
};

export default OutreachPage;
