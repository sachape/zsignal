import { HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import { SectionHeading, SectionShell } from "./primitives";

const FAQS = [
  {
    q: "Faut-il connecter Twitch pour commencer ?",
    a: "Non. Entre simplement ton pseudo : StreamPulse lit les signaux publics de ta chaîne pour générer un premier diagnostic. La connexion arrive seulement si tu veux le suivi complet.",
  },
  {
    q: "Quelles données sont analysées ?",
    a: "Uniquement des données publiques : titres et catégories de tes streams récents, vues des VOD et clips, profil de chaîne. Aucune donnée privée n'est lue dans cette première étape.",
  },
  {
    q: "Puis-je essayer sans créer de compte ?",
    a: "Oui. Le premier diagnostic est accessible sans compte. Tu crées un compte uniquement pour sauvegarder ton historique et débloquer le suivi continu.",
  },
  {
    q: "Que débloque la version complète ?",
    a: "Analyses illimitées, historique de progression, plan d'action hebdomadaire, comparaison étendue avec d'autres chaînes et suggestions de contenu personnalisées.",
  },
  {
    q: "Est-ce utile si je débute ?",
    a: "Particulièrement, oui. StreamPulse t'évite les erreurs classiques en te montrant dès le départ ce qui pèse vraiment sur ta croissance — au lieu de te noyer dans des chiffres.",
  },
  {
    q: "StreamPulse publie-t-il quoi que ce soit sur ma chaîne ?",
    a: "Jamais. L'outil est en lecture seule. Aucun message, aucun follow, aucune action n'est effectuée sur ta chaîne ou ton compte.",
  },
  {
    q: "Pourrai-je suivre plusieurs chaînes plus tard ?",
    a: "Oui, le suivi multi-chaînes fait partie des évolutions prévues pour les comptes Pro.",
  },
];

const FaqSection = () => {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.2);

  return (
    <SectionShell id="faq">
      <SectionHeading
        badge="FAQ"
        title="Tout ce que tu te demandes avant de lancer"
        subtitle="Les réponses courtes aux objections les plus fréquentes."
      />

      <div
        ref={ref}
        className="mx-auto mt-12 max-w-3xl"
        style={{
          opacity: inView ? 1 : 0,
          transform: inView ? "translateY(0)" : "translateY(16px)",
          transition:
            "opacity 700ms cubic-bezier(0.16,1,0.3,1), transform 700ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <Accordion type="single" collapsible className="space-y-3">
          {FAQS.map((item, i) => (
            <AccordionItem
              key={item.q}
              value={`faq-${i}`}
              className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40 px-5 backdrop-blur-xl"
            >
              <AccordionTrigger className="py-4 text-left text-sm font-medium text-foreground hover:no-underline md:text-base">
                <span className="flex items-start gap-3 pr-3">
                  <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" />
                  {item.q}
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-4 pl-7 pr-2 text-sm leading-relaxed text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </SectionShell>
  );
};

export default FaqSection;
