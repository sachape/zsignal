import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, ArrowRight, BarChart3, Users, CalendarCheck, ShieldCheck, EyeOff, Settings, AlertCircle } from "lucide-react";
import { normalizeChannelInput } from "@/services/channelInputNormalizer";
import LandingNav from "@/components/LandingNav";
import SectionHeader from "@/components/SectionHeader";
import ValueCard from "@/components/ValueCard";
import TrustCard from "@/components/TrustCard";
import ScoreCard from "@/components/ScoreCard";
import CompetitorCard from "@/components/CompetitorCard";
import ProgressRow from "@/components/ProgressRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

const Index = () => {
  const [username, setUsername] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleAnalyze = () => {
    const login = normalizeChannelInput(username);
    if (!login) {
      setInputError(
        "Entre un nom d'utilisateur Twitch valide ou une URL twitch.tv/...",
      );
      return;
    }
    setInputError(null);
    navigate(`/analyze?channel=${encodeURIComponent(login)}&mode=teaser`);
  };

  return (
    <div className="min-h-screen bg-background">
      <LandingNav />

      {/* Hero */}
      <section className="relative overflow-hidden pt-28 pb-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.06),transparent_60%)]" />
        <div className="container relative mx-auto max-w-6xl px-4 text-center md:px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="mb-4 inline-flex items-center rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium uppercase tracking-wider text-primary">
              Copilote de croissance streamer
            </span>
            <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Analyse ta chaîne Twitch et découvre quoi améliorer pour progresser
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
              Obtiens ton StreamScore, repère les concurrents les plus pertinents et reçois un plan d'action clair pour faire grandir ta chaîne.
            </p>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mt-10 max-w-lg"
          >
            <Card>
              <CardContent className="flex gap-2 p-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="ex. nexagaming ou twitch.tv/nexagaming"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (inputError) setInputError(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                    className="border-transparent bg-muted pl-9 focus-visible:ring-1"
                    aria-invalid={!!inputError}
                  />
                </div>
                <Button onClick={handleAnalyze} className="shrink-0">
                  Analyser
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
            {inputError && (
              <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{inputError}</span>
              </div>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              Aperçu gratuit · pas de compte requis pour la première analyse
            </p>
            <Button
              variant="link"
              onClick={() => navigate("/auth?redirect=/dashboard")}
              className="mt-1 text-muted-foreground hover:text-primary"
            >
              Déjà un compte ? Se connecter →
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Value Props */}
      <section className="py-16">
        <div className="container mx-auto max-w-6xl px-4 md:px-6">
          <SectionHeader
            label="Ce que tu obtiens"
            title="De la clarté en 3 étapes"
            description="Fini les devinettes. StreamPulse te donne des insights structurés et actionnables sur ta chaîne Twitch."
          />
          <div className="grid gap-6 sm:grid-cols-3">
            <ValueCard
              icon={BarChart3}
              title="StreamScore"
              description="Un score unique qui reflète la santé de ta chaîne — qualité de stream, régularité, engagement et dynamique de croissance."
            />
            <ValueCard
              icon={Users}
              title="Concurrents pertinents"
              description="Trouve des streamers de ton niveau qui progressent plus vite. Comprends ce qu'ils font différemment pour combler l'écart."
            />
            <ValueCard
              icon={CalendarCheck}
              title="Plan d'action hebdomadaire"
              description="Trois actions claires par semaine, classées par impact. Pas de conseils vagues — des étapes concrètes applicables dès aujourd'hui."
            />
          </div>
        </div>
      </section>

      {/* Demo Preview */}
      <section className="py-16">
        <div className="container mx-auto max-w-6xl px-4 md:px-6">
          <SectionHeader
            label="Aperçu"
            title="Un avant-goût de ton analyse"
            description="Voici ce que StreamPulse génère pour ta chaîne."
          />
          <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3">
            <ScoreCard score={62} />
            <div className="flex flex-col gap-3">
              <CompetitorCard name="streamzilla_fr" followers="2.4K" similarity={87} />
              <CompetitorCard name="nightowl_ttv" followers="1.8K" similarity={74} />
            </div>
            <Card>
              <CardContent className="p-6">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Progression affiliation
                </p>
                <div className="mt-4 space-y-3">
                  {[
                    { label: "Viewers moyens", value: "2.8 / 3", pct: 93 },
                    { label: "Jours de stream", value: "6 / 7", pct: 86 },
                    { label: "Chatteurs uniques", value: "42 / 50", pct: 84 },
                  ].map((item) => (
                    <ProgressRow
                      key={item.label}
                      label={item.label}
                      value={item.value}
                      pct={item.pct}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="border-t border-border py-16">
        <div className="container mx-auto max-w-6xl px-4 md:px-6">
          <SectionHeader
            label="Confiance & vie privée"
            title="Ta chaîne reste la tienne"
            description="StreamPulse ne touche jamais à ton stream. On analyse uniquement les données publiques pour t'aider à progresser."
          />
          <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-3">
            <TrustCard
              icon={EyeOff}
              title="Aucune publication"
              description="On ne poste, ne chat et n'interagit jamais en ton nom."
            />
            <TrustCard
              icon={Settings}
              title="Aucune modification"
              description="On ne modifie jamais les paramètres de ta chaîne ou de ton stream."
            />
            <TrustCard
              icon={ShieldCheck}
              title="Analyse en lecture seule"
              description="On utilise uniquement les données publiques pour construire tes insights."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
          © 2026 StreamPulse. Conçu pour les streamers qui veulent progresser.
        </div>
      </footer>
    </div>
  );
};

export default Index;
