import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Shield, Tv2, Trash2, Loader2 } from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useTwitchConnection } from "@/hooks/useTwitchConnection";
import { usePageMeta } from "@/hooks/usePageMeta";
import AccountMenu from "@/components/AccountMenu";

const SettingsPage = () => {
  const { user, deleteAccount } = useAuth();
  const { account, isConnected } = useTwitchConnection();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError(null);
    const { error } = await deleteAccount();
    if (error) {
      setDeleteError(error.message || "La suppression a échoué. Réessaie ou contacte le support.");
      setDeleting(false);
      return;
    }
    navigate("/");
  };

  usePageMeta({ title: "Mon compte", description: "Gérez votre compte Streamnco." });

  return (
    <AppShell>
      <PageContainer size="sm">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground md:text-[28px]">
            Mon compte
          </h1>
        </div>

        {/* Compte Streamnco */}
        <section className="mb-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Compte Streamnco
          </h2>
          <Card>
            <CardContent className="divide-y divide-border/50 p-0">
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-foreground">
                  {user?.email?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Adresse e-mail
                  </p>
                  <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground/60" />
                    {user?.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 px-5 py-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Mot de passe
                  </p>
                  <p className="text-sm text-foreground">••••••••••••</p>
                </div>
                <Button variant="outline" size="sm" disabled className="text-xs">
                  Modifier
                </Button>
              </div>

              <div className="flex items-center justify-between gap-4 px-5 py-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Plan actuel
                  </p>
                  <p className="mt-0.5 flex items-center gap-2 text-sm">
                    <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      Plan Gratuit
                    </span>
                  </p>
                </div>
                <Button asChild size="sm" className="text-xs">
                  <Link to="/billing">Passer au Pro</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Connexion Twitch */}
        <section className="mb-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Connexion Twitch
          </h2>
          <Card>
            <CardContent className="p-5">
              {isConnected && account ? (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {account.profile_image_url ? (
                      <img
                        src={account.profile_image_url}
                        alt={account.platform_login ?? ""}
                        className="h-9 w-9 rounded-full border border-border/60 object-cover"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-bold text-foreground">
                        {account.platform_display_name?.[0]?.toUpperCase() ?? "T"}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {account.platform_display_name ?? account.platform_login}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        @{account.platform_login}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                    Connecté
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                      <Tv2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Aucun compte Twitch connecté
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Connecte ta chaîne pour débloquer le cockpit live.
                      </p>
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/connect-twitch">Connecter</Link>
                  </Button>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between gap-3">
                <Button asChild variant="outline" size="sm" className="text-xs">
                  <Link to="/settings/twitch-accounts">Gérer mes comptes Twitch</Link>
                </Button>
                {isConnected && <AccountMenu />}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Format réseaux */}
        {isConnected && account?.platform_user_id && (
          <section className="mb-6">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Format réseaux
            </h2>
            <Card>
              <CardContent className="flex items-center justify-between gap-4 p-5">
                <div>
                  <p className="text-sm font-semibold text-foreground">Configurer ma caméra</p>
                  <p className="text-xs text-muted-foreground">
                    Indique l’emplacement de ta caméra dans tes streams. Streamnco l’utilisera pour générer tes clips verticaux 1080×1920.
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setPresetOpen(true)}>
                  Configurer
                </Button>
              </CardContent>
            </Card>
          </section>
        )}
        <LayoutPresetModal
          open={presetOpen}
          onOpenChange={setPresetOpen}
          platformUserId={account?.platform_user_id ?? null}
        />


        {/* Sécurité */}
        <section className="mb-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Sécurité
          </h2>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Shield className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Authentification à deux facteurs
                </p>
                <p className="text-xs text-muted-foreground">
                  Disponible prochainement.
                </p>
              </div>
              <Button variant="outline" size="sm" disabled className="text-xs">
                Activer
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Zone de danger */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Zone de danger
          </h2>
          <Card className="border-destructive/20">
            <CardContent className="flex items-center justify-between gap-4 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Supprimer mon compte
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Suppression définitive de toutes tes données.
                  </p>
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="text-xs">
                    Supprimer
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer ton compte ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est irréversible. Ton compte, tes données d'analyse et ton historique seront supprimés définitivement.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  {deleteError && (
                    <p className="text-xs text-destructive">{deleteError}</p>
                  )}
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={deleting}
                      onClick={(e) => {
                        e.preventDefault();
                        void handleDeleteAccount();
                      }}
                    >
                      {deleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Supprimer définitivement"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </section>
      </PageContainer>
    </AppShell>
  );
};

export default SettingsPage;
