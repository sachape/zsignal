import { motion } from "framer-motion";
import { ShieldCheck, EyeOff, Settings, BarChart3, Users, CalendarCheck, Zap } from "lucide-react";
import AppShell from "@/components/AppShell";
import TrustCard from "@/components/TrustCard";
import SectionHeader from "@/components/SectionHeader";
import ValueCard from "@/components/ValueCard";

const ConnectTwitchPage = () => {
  return (
    <AppShell>
      <div className="container mx-auto max-w-3xl px-4 py-16">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary">
            <Zap className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-extrabold text-foreground">Connecter Twitch</h1>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            Débloque une analyse approfondie, des recommandations personnalisées et un suivi de progression hebdomadaire en connectant ton compte Twitch.
          </p>
        </motion.div>

        {/* What you unlock */}
        <div className="mt-14">
          <SectionHeader label="Ce que tu débloques" title="Va au-delà de l'analyse de surface" />
          <div className="grid gap-5 sm:grid-cols-3">
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
        </div>

        {/* Trust */}
        <div className="mt-14">
          <SectionHeader label="Vie privée" title="Ce qu'on fait — et ce qu'on ne fait pas" />
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
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-14 rounded-xl border border-border bg-card p-8 text-center"
        >
          <h3 className="text-xl font-bold text-foreground">Prêt à débloquer ta croissance ?</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Ça prend 10 secondes. Tu peux te déconnecter à tout moment.
          </p>
          <button className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#9146FF] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
            </svg>
            Se connecter avec Twitch
          </button>
        </motion.div>
      </div>
    </AppShell>
  );
};

export default ConnectTwitchPage;
