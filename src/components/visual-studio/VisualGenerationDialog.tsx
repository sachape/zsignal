/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import * as Icons from "lucide-react";
import { Loader2, Upload, X, Check, RefreshCw, Download, Star, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  createVisualJob,
  deleteVisual,
  downloadVisual,
  fetchJob,
  fetchJobVariants,
  toggleFavorite,
  uploadReferenceImage,
  type GeneratedVisual,
  type VisualTemplate,
} from "@/services/visualStudio";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: VisualTemplate[];
  prefill: Record<string, any>;
  onCompleted: () => void;
}

type Step = "pick" | "form" | "result";

const STYLE_OPTIONS = [
  "Cinématique",
  "Néon / cyberpunk",
  "Minimaliste éditorial",
  "Esport bold",
  "Streetwear urbain",
  "Pastel cosy",
];

export default function VisualGenerationDialog({ open, onOpenChange, templates, prefill, onCompleted }: Props) {
  const [step, setStep] = useState<Step>("pick");
  const [template, setTemplate] = useState<VisualTemplate | null>(null);
  const [headline, setHeadline] = useState("");
  const [subtext, setSubtext] = useState("");
  const [game, setGame] = useState("");
  const [style, setStyle] = useState("Cinématique");
  const [palette, setPalette] = useState("");
  const [notes, setNotes] = useState("");
  const [refFile, setRefFile] = useState<File | null>(null);
  const [refUploading, setRefUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string>("queued");
  const [variants, setVariants] = useState<GeneratedVisual[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStep("pick");
      setTemplate(null);
      setHeadline("");
      setSubtext("");
      setGame(prefill?.game ?? "");
      setStyle("Cinématique");
      setPalette("");
      setNotes("");
      setRefFile(null);
      setJobId(null);
      setJobStatus("queued");
      setVariants([]);
      setError(null);
    }
  }, [open, prefill]);

  // Poll job status
  useEffect(() => {
    if (!jobId || step !== "result") return;
    let cancelled = false;
    const poll = async () => {
      while (!cancelled) {
        try {
          const job = await fetchJob(jobId);
          if (!job) break;
          setJobStatus(job.status);
          if (job.status === "succeeded") {
            const vars = await fetchJobVariants(jobId);
            if (!cancelled) setVariants(vars);
            onCompleted();
            break;
          }
          if (job.status === "failed") {
            setError(job.error_message ?? "génération échouée");
            break;
          }
        } catch (e) {
          console.error(e);
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    };
    void poll();
    return () => {
      cancelled = true;
    };
  }, [jobId, step, onCompleted]);

  const grouped = useMemo(() => {
    const map = new Map<string, VisualTemplate[]>();
    templates.forEach((t) => {
      if (!map.has(t.category)) map.set(t.category, []);
      map.get(t.category)!.push(t);
    });
    return map;
  }, [templates]);

  const handlePick = (t: VisualTemplate) => {
    setTemplate(t);
    setHeadline(prefill?.headline ?? prefill?.display_name ?? "");
    setStep("form");
  };

  const handleGenerate = async () => {
    if (!template) return;
    setSubmitting(true);
    setError(null);
    try {
      let referenceAssetId: string | null = null;
      if (refFile) {
        setRefUploading(true);
        referenceAssetId = await uploadReferenceImage(refFile);
        setRefUploading(false);
      }
      const res = await createVisualJob({
        template_id: template.id,
        params: {
          headline: headline.trim(),
          subtext: subtext.trim(),
          game: game.trim(),
          style,
          palette: palette.trim(),
          notes: notes.trim(),
          display_name: prefill?.display_name,
          handle: prefill?.handle,
        },
        reference_asset_id: referenceAssetId,
      });
      setJobId(res.job_id);
      setJobStatus("queued");
      setVariants([]);
      setStep("result");
    } catch (e: any) {
      const msg = e?.message === "quota_exceeded"
        ? "Tu as atteint la limite quotidienne de générations. Réessaie demain."
        : "Impossible de lancer la génération. Réessaie dans un instant.";
      toast.error(msg);
      setError(msg);
    } finally {
      setSubmitting(false);
      setRefUploading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!template) return;
    setStep("form");
  };

  const handleFavorite = async (v: GeneratedVisual) => {
    try {
      await toggleFavorite(v.id, !v.is_favorite);
      setVariants((prev) =>
        prev.map((x) => (x.id === v.id ? { ...x, is_favorite: !v.is_favorite } : x)),
      );
    } catch {
      toast.error("Action impossible");
    }
  };

  const handleDelete = async (v: GeneratedVisual) => {
    try {
      await deleteVisual(v);
      setVariants((prev) => prev.filter((x) => x.id !== v.id));
      onCompleted();
    } catch {
      toast.error("Suppression impossible");
    }
  };

  const handleDownload = async (v: GeneratedVisual) => {
    try {
      const name = `${template?.label ?? "visuel"}-${v.variant_index + 1}.png`.replace(/\s+/g, "-").toLowerCase();
      await downloadVisual(v, name);
    } catch {
      toast.error("Téléchargement impossible");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "pick" && "Choisis un type de visuel"}
            {step === "form" && (template?.label ?? "Personnalise")}
            {step === "result" && (template?.label ?? "Génération")}
          </DialogTitle>
          <DialogDescription>
            {step === "pick" && "Sélectionne le format dont tu as besoin. Streamnco prépare 3 variantes prêtes à l'emploi."}
            {step === "form" && "Quelques infos pour guider le rendu. Tout est optionnel."}
            {step === "result" && "Streamnco génère 3 propositions. Tu peux télécharger, mettre en favori ou régénérer."}
          </DialogDescription>
        </DialogHeader>

        {step === "pick" && (
          <div className="space-y-6">
            {Array.from(grouped.entries()).map(([cat, items]) => (
              <div key={cat}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {categoryLabel(cat)}
                </h3>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {items.map((t) => {
                    const Icon = (Icons as any)[t.icon ?? "Image"] ?? Icons.Image;
                    return (
                      <button
                        key={t.id}
                        onClick={() => handlePick(t)}
                        className="group flex flex-col gap-2 rounded-xl border border-border/60 bg-card/60 p-3 text-left transition-all hover:border-primary/50 hover:bg-card"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="text-sm font-semibold text-foreground">{t.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                        <span className="text-[10px] text-muted-foreground/70">
                          {t.width} × {t.height}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {step === "form" && template && (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label htmlFor="headline">Texte principal</Label>
                <Input
                  id="headline"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Ex : Live ce soir 21h"
                />
              </div>
              <div>
                <Label htmlFor="subtext">Sous-texte</Label>
                <Input
                  id="subtext"
                  value={subtext}
                  onChange={(e) => setSubtext(e.target.value)}
                  placeholder="Ex : Ranked solo / GTA RP"
                />
              </div>
              <div>
                <Label htmlFor="game">Jeu / thème</Label>
                <Input
                  id="game"
                  value={game}
                  onChange={(e) => setGame(e.target.value)}
                  placeholder="Ex : Valorant"
                />
              </div>
              <div>
                <Label htmlFor="style">Style visuel</Label>
                <select
                  id="style"
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {STYLE_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="palette">Couleurs (optionnel)</Label>
                <Input
                  id="palette"
                  value={palette}
                  onChange={(e) => setPalette(e.target.value)}
                  placeholder="Ex : violet néon + noir profond"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="notes">Indications libres</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Tout ce que tu veux préciser sur le rendu."
                  rows={2}
                />
              </div>
            </div>

            <div>
              <Label>Image de référence (optionnel)</Label>
              <div className="mt-1 flex items-center gap-2">
                <label className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-dashed border-border bg-muted/30 px-3 text-sm text-muted-foreground hover:bg-muted/50">
                  <Upload className="h-4 w-4" />
                  {refFile ? refFile.name : "Choisir un fichier (logo, photo, screenshot)"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setRefFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                {refFile && (
                  <Button size="icon" variant="ghost" onClick={() => setRefFile(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex items-center justify-between gap-2 pt-2">
              <Button variant="ghost" onClick={() => setStep("pick")}>
                ← Changer de format
              </Button>
              <Button onClick={handleGenerate} disabled={submitting || refUploading}>
                {(submitting || refUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Générer 3 visuels
              </Button>
            </div>
          </div>
        )}

        {step === "result" && (
          <div className="space-y-4">
            {jobStatus !== "succeeded" && jobStatus !== "failed" && (
              <div className="flex flex-col items-center justify-center gap-3 py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Streamnco compose tes visuels — ça prend ~30 secondes.
                </p>
              </div>
            )}
            {jobStatus === "failed" && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                La génération a échoué : {error ?? "raison inconnue"}.
                <div className="mt-3">
                  <Button size="sm" variant="outline" onClick={handleRegenerate}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Réessayer
                  </Button>
                </div>
              </div>
            )}
            {variants.length > 0 && (
              <div className="grid gap-3 md:grid-cols-3">
                {variants.map((v) => (
                  <div key={v.id} className="overflow-hidden rounded-xl border border-border/60 bg-card">
                    <div
                      className={cn(
                        "relative w-full bg-muted/40",
                        v.width && v.height && v.width === v.height && "aspect-square",
                        v.width && v.height && v.width > v.height && "aspect-video",
                        v.width && v.height && v.height > v.width && "aspect-[9/16]",
                      )}
                    >
                      {v.signedUrl ? (
                        <img src={v.signedUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                          Aperçu indisponible
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-1 p-2">
                      <Button size="icon" variant="ghost" onClick={() => handleFavorite(v)} title="Favori">
                        <Star className={cn("h-4 w-4", v.is_favorite && "fill-primary text-primary")} />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDownload(v)} title="Télécharger">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(v)} title="Supprimer">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {jobStatus === "succeeded" && (
              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={handleRegenerate}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Régénérer
                </Button>
                <Button onClick={() => onOpenChange(false)}>
                  <Check className="mr-2 h-4 w-4" /> Terminé
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function categoryLabel(cat: string): string {
  switch (cat) {
    case "twitch": return "Twitch";
    case "social": return "Réseaux sociaux";
    case "branding": return "Branding";
    default: return cat;
  }
}
