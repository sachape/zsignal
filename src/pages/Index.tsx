import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  ArrowRight,
  BarChart3,
  Users,
  CalendarCheck,
  ShieldCheck,
  EyeOff,
  Settings,
  AlertCircle,
  Zap,
  Target,
  TrendingUp,
  Clock,
} from "lucide-react";
import { normalizeChannelInput } from "@/services/channelInputNormalizer";
import { useAuthModal } from "@/contexts/AuthModalContext";
import LandingNav from "@/components/LandingNav";
import HeroChannelSearch from "@/components/HeroChannelSearch";
import DemoPreviewSection from "@/components/DemoPreviewSection";
import SectionHeader from "@/components/SectionHeader";
import ValueCard from "@/components/ValueCard";
import TrustCard from "@/components/TrustCard";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const ANALYSE_SIGNALS = [
  "Cadence de stream",
  "Titres de stream",
  "Catégories jouées",
  "Clips & moments forts",
  "Régularité hebdomadaire",
  "Positionnement de niche",
  "Signaux de croissance",
  "Engagement du chat",
  "Durée des sessions",
  "Progression d'affiliation",
];

const FAQ_ITEMS = [
  {
    q: "Est-ce que je dois connecter mon compte Twitch ?",
    a: "Non. L'aperçu gratuit fonctionne uniquement à partir de ton nom d'utilisateur public. Aucune connexion, aucune autorisation requise.",
  },
  {
    q: "Est-ce que ça marche si je débute ?",
    a: "Oui. L'outil est conçu pour les streamers de tous niveaux. Si tu streames depuis moins de 3 mois, il t'aide à poser des bases solides avant de chercher à croître.",
  },
  {
    q: "Est-ce que c'est réservé à Twitch ?",
    a: "Pour l'instant, StreamPulse analyse les chaînes Twitch. Le support d'autres plateformes est en cours de développement.",
  },
  {
    q: "Combien de temps ça prend ?",
    a: "L'analyse complète prend moins de 60 secondes. Ton plan d'action est disponible immédiatement après.",
  },
  {
    q: "Est-ce que StreamPulse publie ou modifie quelque chose sur ma chaîne ?",
    a: "Non. L'outil est 100 % en lecture seule. Il n'écrit, ne publie et n'interagit jamais en ton nom.",
  },
];

const Index = () => {
  const [username, setUsername] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { openAuthModal } = useAuthModal();

  const handleAnalyze = (explicitLogin?: string) => {
    const login =
      explicitLogin?.trim().toLowerCase() || normalizeChannelInput(username);
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
            className="mx-auto mt-10 max-w-lg text-left"
          >
            <HeroChannelSearch
              value={username}
              onChange={(next) => {
                setUsername(next);
                if (inputError) setInputError(null);
              }}
              onSubmit={(login) => handleAnalyze(login)}
              inputError={inputError}
            />
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Aperçu gratuit · pas de compte requis pour la première analyse
            </p>
            <Button
              variant="link"
              onClick={() =>
                openAuthModal({
                  redirectTo: "/dashboard",
                  pendingChannel: normalizeChannelInput(username) || undefined,
                })
              }
              className="mt-1 text-muted-foreground hover:text-primary"
            >
              Déjà un compte ? Se connecter →
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Pourquoi Stream Spark */}
      <section className="py-16">
        <div className="container mx-auto max-w-6xl px-4 md:px-6">
          <SectionHeader
            label="Pourquoi Stream Spark"
            title="Ce qui change vraiment"
            description="Fini les devinettes. Chaque décision s'appuie sur des données concrètes issues de ta chaîne."
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <ValueCard
              icon={BarChart3}
              title="Un score qui parle"
              description="Le StreamScore condense la santé de ta chaîne en un seul chiffre clair — qualité, régularité, engagement, croissance."
            />
            <ValueCard
              icon={Target}
              title="Priorités actionnables"
              description="Trois actions par semaine, classées par impact. Pas de théorie — des étapes concrètes applicables dès aujourd'hui."
            />
            <ValueCard
              icon={Users}
              title="Benchmarks pertinents"
              description="Identifie les streamers qui progressent dans ta niche et comprends exactement ce qu'ils font différemment."
            />
            <ValueCard
              icon={Zap}
              title="Résultat en 60 secondes"
              description="Pas d'inscription requise pour l'aperçu. Ton diagnostic complet est disponible immédiatement."
            />
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="border-t border-border py-16">
        <div className="container mx-auto max-w-6xl px-4 md:px-6">
          <SectionHeader
            label="Comment ça marche"
            title="3 étapes, c'est tout"
          />
          <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3">
            {[
              {
                step: "01",
                title: "Tu entres ton compte",
                description:
                  "Tape ton nom d'utilisateur Twitch ou colle l'URL de ta chaîne. Aucune connexion requise.",
              },
              {
                step: "02",
                title: "On analyse tes signaux",
                description:
                  "StreamPulse examine ta cadence, tes titres, ta régularité, tes clips et bien d'autres indicateurs de croissance.",
              },
              {
                step: "03",
                title: "Tu reçois des priorités claires",
                description:
                  "Un plan d'action structuré, des concurrents pertinents et un score pour suivre ta progression dans le temps.",
              },
            ].map(({ step, title, description }) => (
              <Card key={step} className="relative overflow-hidden">
                <CardContent className="p-6">
                  <span className="mb-4 block text-4xl font-bold tracking-tighter text-primary/20">
                    {step}
                  </span>
                  <h3 className="mb-2 text-base font-semibold text-foreground">
                    {title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Ce que l'outil analyse */}
      <section className="py-16">
        <div className="container mx-auto max-w-6xl px-4 md:px-6">
          <SectionHeader
            label="Sous le capot"
            title="Ce que l'outil analyse"
            description="StreamPulse croise plusieurs signaux pour te donner un diagnostic complet de ta chaîne."
          />
          <div className="mx-auto max-w-3xl">
            <div className="flex flex-wrap justify-center gap-3">
              {ANALYSE_SIGNALS.map((signal) => (
                <span
                  key={signal}
                  className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  {signal}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pour qui */}
      <section className="border-t border-border py-16">
        <div className="container mx-auto max-w-6xl px-4 md:px-6">
          <SectionHeader
            label="Pour qui"
            title="Fait pour toi si…"
          />
          <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3">
            {[
              {
                icon: TrendingUp,
                profile: "Débutant sérieux",
                description:
                  "Tu streames depuis peu mais tu veux poser les bonnes bases dès le début, éviter les erreurs classiques et progresser plus vite.",
              },
              {
                icon: BarChart3,
                profile: "Streamer qui stagne",
                description:
                  "Tu publies régulièrement mais ta croissance est à l'arrêt. Tu veux comprendre ce qui bloque et identifier les leviers concrets.",
              },
              {
                icon: Target,
                profile: "Créateur structuré",
                description:
                  "Tu veux suivre ta progression dans le temps, valider tes décisions par des données et construire une stratégie de contenu cohérente.",
              },
            ].map(({ icon: Icon, profile, description }) => (
              <Card
                key={profile}
                className="transition-colors hover:border-primary/40"
              >
                <CardContent className="p-6">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-foreground">
                    {profile}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Preview */}
      <DemoPreviewSection />

      {/* FAQ */}
      <section className="border-t border-border py-16">
        <div className="container mx-auto max-w-6xl px-4 md:px-6">
          <SectionHeader
            label="Questions fréquentes"
            title="Tout ce que tu veux savoir"
          />
          <div className="mx-auto max-w-2xl">
            <Accordion type="single" collapsible className="w-full">
              {FAQ_ITEMS.map((item, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left text-sm font-medium text-foreground hover:no-underline hover:text-primary">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-16">
        <div className="container mx-auto max-w-6xl px-4 md:px-6">
          <div className="mx-auto max-w-xl rounded-xl border border-primary/20 bg-primary/5 px-6 py-12 text-center">
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium uppercase tracking-wider text-primary">
              <Clock className="h-3.5 w-3.5" />
              Moins de 60 secondes
            </span>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Prêt à voir où tu en es ?
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Entre ton nom de chaîne et reçois ton diagnostic immédiatement. Gratuit, sans compte.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <div className="relative w-full max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="ton pseudo Twitch"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                  className="border-border bg-background pl-9 focus-visible:ring-1"
                />
              </div>
              <Button onClick={() => handleAnalyze()} className="w-full shrink-0 sm:w-auto">
                Analyser ma chaîne
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
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
