import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ShieldCheck,
  EyeOff,
  Settings,
  BarChart3,
  Users,
  CalendarCheck,
  Zap,
  CheckCircle2,
  LinkIcon,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import SectionHeader from "@/components/SectionHeader";
import TrustCard from "@/components/TrustCard";
import ValueCard from "@/components/ValueCard";
import { LoadingState } from "@/components/StateView";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useTwitchConnection } from "@/hooks/useTwitchConnection";
import { initiateTwitchOAuth } from "@/services/twitchOAuth";
import { onboardingFlags } from "@/services/onboardingFlags";

type PageState = "default" | "loading" | "success" | "already-connected";

const ConnectTwitchPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isConnected, account, loading: connectionLoading } =
    useTwitchConnection();

  const justConnected = searchParams.get("connected") === "true";

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth?redirect=/connect-twitch");
    }
  }, [user, authLoading, navigate]);

  const getState = (): PageState => {
    if (connectionLoading) return "loading";
    if (justConnected) return "success";
    if (isConnected) return "already-connected";
    return "default";
  };

  const state = getState();

  if (state === "loading") {
    return (
      <AppShell>
        <LoadingState />
      </AppShell>
    );
  }

  if (state === "success") {
    return (
      <AppShell>
        <PageContainer size="sm">
          <Card>
            <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-success/10">
                <CheckCircle2 className="h-4 w-4 text-success" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-base font-semibold text-foreground">
                  Compte Twitch connecté
                </h2>
                <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                  Ton compte est prêt. On peut maintenant analyser ta chaîne en
                  profondeur.
                </p>
              </div>
              <Button onClick={() => navigate("/dashboard")} className="mt-2">
                Aller au tableau de bord
              </Button>
            </CardContent>
          </Card>
        </PageContainer>
      </AppShell>
    );
  }

  if (state === "already-connected") {
    return (
      <AppShell>
        <PageContainer size="sm">
          <Card>
            <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                <LinkIcon className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-base font-semibold text-foreground">
                  Twitch déjà connecté
                </h2>
                <p className="text-sm text-muted-foreground">
                  Compte :{" "}
                  <span className="font-medium text-foreground">
                    {account?.platform_display_name ||
                      account?.platform_login ||
                      "Twitch"}
                  </span>
                </p>
              </div>
              <Button onClick={() => navigate("/analyze")} className="mt-2">
                Lancer une analyse
              </Button>
            </CardContent>
          </Card>
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageContainer>
        <PageHeader
          eyebrow="Configuration"
          title="Connecter Twitch"
          description="Débloque une analyse approfondie, des recommandations personnalisées et un suivi de progression hebdomadaire en connectant ton compte Twitch."
        />

        <section className="mb-10">
          <SectionHeader
            label="Ce que tu débloques"
            title="Va au-delà de l'analyse de surface"
            align="left"
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <ValueCard
              icon={BarChart3}
              title="StreamScore complet"
              description="Obtiens un diagnostic détaillé de ta chaîne sur 8 indicateurs clés."
            />
            <ValueCard
              icon={Users}
              title="Tous les concurrents"
              description="Accède à l'ensemble des concurrents pertinents, pas seulement le meilleur match."
            />
            <ValueCard
              icon={CalendarCheck}
              title="Plan hebdomadaire"
              description="Reçois chaque semaine un plan d'action personnalisé basé sur tes dernières données."
            />
          </div>
        </section>

        <section className="mb-10">
          <SectionHeader
            label="Vie privée"
            title="Ce qu'on fait — et ce qu'on ne fait pas"
            align="left"
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <TrustCard
              icon={EyeOff}
              title="Aucune publication"
              description="On ne publie jamais de message, on ne follow personne et on n'interagit jamais en ton nom."
            />
            <TrustCard
              icon={Settings}
              title="Aucune modification"
              description="On ne touche jamais à la configuration de ton stream, ton titre ou ta catégorie."
            />
            <TrustCard
              icon={ShieldCheck}
              title="Accès en lecture seule"
              description="On accède uniquement aux données publiques et à tes statistiques de stream. Rien d'autre."
            />
          </div>
        </section>

        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-foreground">
                Prêt à débloquer ta croissance ?
              </h3>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                Ça prend 10 secondes. Tu peux te déconnecter à tout moment.
              </p>
            </div>
            <Button
              onClick={() => {
                const teaserId = onboardingFlags.getPendingTeaserId();
                initiateTwitchOAuth({ teaserId }).catch((err) => console.error(err));
              }}
              variant="twitch"
              className="mt-2"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
              </svg>
              Se connecter avec Twitch
            </Button>
          </CardContent>
        </Card>
      </PageContainer>
    </AppShell>
  );
};

export default ConnectTwitchPage;
