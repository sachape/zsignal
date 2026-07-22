import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Check, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSocialPublishing, type PublishingPlatform } from "@/hooks/useSocialPublishing";

const PLATFORMS: { id: PublishingPlatform; label: string; cta: string }[] = [
  { id: "youtube",   label: "YouTube Shorts",   cta: "Connecter YouTube" },
  { id: "tiktok",    label: "TikTok",           cta: "Connecter TikTok" },
  { id: "instagram", label: "Instagram Reels",  cta: "Connecter Instagram" },
];

export default function SocialPublishingSection() {
  const { accounts, loading, error, connect, refresh } = useSocialPublishing();
  const [busy, setBusy] = useState<PublishingPlatform | null>(null);

  const handleConnect = async (p: PublishingPlatform) => {
    setBusy(p);
    try { await connect(p); }
    catch (e) {
      toast.error((e as Error).message ?? "Connexion impossible. Réessaie.");
      setBusy(null);
    }
  };

  return (
    <Card className="border-border/60 bg-card/40">
      <CardContent className="p-5">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold">Publication réseaux</h2>
            <p className="text-xs text-muted-foreground">
              Connecte tes comptes pour publier tes clips en un clic.
            </p>
          </div>
          {!loading && (
            <Button variant="link" size="sm" onClick={() => void refresh()} className="h-auto p-0 text-xs">
              Rafraîchir
            </Button>
          )}
        </div>

        {error && (
          <p className="mb-3 flex items-center gap-2 text-xs text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" /> {error}
          </p>
        )}

        <div className="grid gap-2 sm:grid-cols-3">
          {PLATFORMS.map((p) => {
            const account = accounts.find((a) => a.platform === p.id);
            const isError = account?.status === "error";
            const isConnected = account?.status === "connected";
            return (
              <div
                key={p.id}
                className={cn(
                  "flex flex-col gap-2 rounded-lg border p-3",
                  isConnected ? "border-primary/30 bg-primary/5"
                  : isError ? "border-destructive/40 bg-destructive/5"
                  : "border-border/60 bg-muted/20",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{p.label}</span>
                  {isConnected && (
                    <Badge variant="outline" className="border-primary/40 bg-primary/10 text-[12px] text-primary-strong">
                      <Check className="mr-1 h-3 w-3" /> Compte connecté
                    </Badge>
                  )}
                  {isError && (
                    <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-[12px] text-destructive">
                      Erreur
                    </Badge>
                  )}
                </div>
                {isConnected && account?.username && (
                  <p className="truncate text-xs text-muted-foreground">@{account.username}</p>
                )}
                <Button
                  size="sm"
                  variant={isConnected ? "outline" : "default"}
                  disabled={busy === p.id || loading}
                  onClick={() => handleConnect(p.id)}
                >
                  {busy === p.id ? (
                    <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Redirection…</>
                  ) : isError ? (
                    "Reconnecter"
                  ) : isConnected ? (
                    "Ajouter un autre compte"
                  ) : (
                    <><Plus className="mr-1.5 h-3.5 w-3.5" /> {p.cta}</>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
