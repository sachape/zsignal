/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Palette, Plus, Sparkles, Star, Download, Trash2 } from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { usePageMeta } from "@/hooks/usePageMeta";
import { supabase } from "@/integrations/supabase/client";
import VisualGenerationDialog from "@/components/visual-studio/VisualGenerationDialog";
import {
  fetchTemplates,
  fetchLibrary,
  fetchBrandKit,
  toggleFavorite,
  deleteVisual,
  downloadVisual,
  type VisualTemplate,
  type GeneratedVisual,
} from "@/services/visualStudio";
import { useQuotaUsage } from "@/hooks/useQuotaUsage";
import { cn } from "@/lib/utils";

const VisualStudioPage = () => {
  usePageMeta({
    title: "Studio visuel · Streamnco",
    description: "Génère bannières, posts, stories et annonces de live en quelques secondes.",
  });

  const { user } = useAuth();
  const [templates, setTemplates] = useState<VisualTemplate[]>([]);
  const [library, setLibrary] = useState<GeneratedVisual[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [prefill, setPrefill] = useState<Record<string, any>>({});
  const quota = useQuotaUsage();

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [tpls, lib, brand] = await Promise.all([
        fetchTemplates(),
        fetchLibrary(48),
        fetchBrandKit().catch(() => null),
      ]);
      setTemplates(tpls);
      setLibrary(lib);

      // Build prefill from brand kit + last connected Twitch profile
      const pf: Record<string, any> = {};
      if (brand) {
        pf.display_name = brand.display_name;
        pf.handle = brand.handle;
        pf.palette = brand.primary_color ? `${brand.primary_color}` : undefined;
      }
      if (!pf.display_name && user?.email) {
        const { data: tp } = await (supabase as any)
          .from("twitch_profiles")
          .select("display_name, login")
          .limit(1)
          .maybeSingle();
        if (tp) {
          pf.display_name = tp.display_name;
          pf.handle = tp.login;
        }
      }
      setPrefill(pf);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleFavorite = async (v: GeneratedVisual) => {
    try {
      await toggleFavorite(v.id, !v.is_favorite);
      setLibrary((prev) => prev.map((x) => (x.id === v.id ? { ...x, is_favorite: !v.is_favorite } : x)));
    } catch {
      toast.error("Action impossible");
    }
  };
  const handleDelete = async (v: GeneratedVisual) => {
    try {
      await deleteVisual(v);
      setLibrary((prev) => prev.filter((x) => x.id !== v.id));
    } catch {
      toast.error("Suppression impossible");
    }
  };
  const handleDownload = async (v: GeneratedVisual) => {
    try {
      await downloadVisual(v, `streamnco-visuel-${v.id.slice(0, 8)}.png`);
    } catch {
      toast.error("Téléchargement impossible");
    }
  };

  const featured = useMemo(() => templates.slice(0, 4), [templates]);

  return (
    <AppShell>
      <PageContainer>
        <PageHeader
          title="Studio visuel"
          description="Bannières, stories, annonces de live, posts — générés en quelques secondes."
          action={
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Créer un visuel
            </Button>
          }
        />

        {!quota.loading && (
          <p className="mt-2 text-xs text-muted-foreground">
            {quota.visualsUsed} / {quota.visualsLimit} générations utilisées ce mois-ci
          </p>
        )}

        {/* Quick start templates */}
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Démarrage rapide</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {featured.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setPrefill((p) => ({ ...p }));
                  setDialogOpen(true);
                }}
                className="group flex flex-col items-start gap-2 rounded-xl border border-border/60 bg-card/60 p-4 text-left transition-all hover:border-primary/50 hover:bg-card"
              >
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{t.label}</span>
                <span className="text-xs text-muted-foreground line-clamp-2">{t.description}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Library */}
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">Ta bibliothèque</h2>
            {library.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">{library.length} visuels</Badge>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-xl bg-muted/40" />
              ))}
            </div>
          ) : library.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Palette className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold">Aucun visuel pour le moment</h3>
                <p className="max-w-md text-sm text-muted-foreground">
                  Crée ton premier visuel et il s'ajoutera ici. Tu pourras le retrouver, le télécharger ou le mettre en favori à tout moment.
                </p>
                <Button onClick={() => setDialogOpen(true)} className="mt-2 gap-2">
                  <Plus className="h-4 w-4" /> Créer mon premier visuel
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {library.map((v) => (
                <div key={v.id} className="group overflow-hidden rounded-xl border border-border/60 bg-card">
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
                    {v.is_favorite && (
                      <div className="absolute right-2 top-2 rounded-full bg-background/80 p-1">
                        <Star className="h-3 w-3 fill-primary text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-1 p-2 opacity-80 transition-opacity group-hover:opacity-100">
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
        </section>

        <VisualGenerationDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          templates={templates}
          prefill={prefill}
          onCompleted={() => { void loadAll(); void quota.refresh(); }}
        />
      </PageContainer>
    </AppShell>
  );
};

export default VisualStudioPage;
