import { HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import { SectionHeading, SectionShell } from "./primitives";

const DEFAULT_FAQS = [
  {
    q: "Faut-il connecter Twitch pour commencer ?",
    a: "Non. Entre simplement ton pseudo : Streamnco lit les signaux publics de ta chaîne pour générer un premier diagnostic. La connexion Twitch arrive seulement si tu veux le suivi complet.",
  },
  {
    q: "Quelles données sont analysées ?",
    a: "Streamnco analyse les signaux utiles de ta chaîne : régularité, progression vers l'objectif, dynamiques visibles et premiers indicateurs de performance. Le niveau de détail augmente avec le suivi complet.",
  },
  {
    q: "Puis-je essayer sans créer de compte ?",
    a: "Oui. Tu peux lancer un premier diagnostic sans compte. Le compte devient utile si tu veux sauvegarder ton analyse, la retrouver et aller plus loin.",
  },
  {
    q: "Que débloque la version complète ?",
    a: "Le suivi complet ajoute l'historique, une lecture plus riche de ta progression, davantage de contexte sur tes performances et un accompagnement plus utile dans le temps.",
  },
  {
    q: "Est-ce utile si je débute ?",
    a: "Oui. Streamnco n'est pas réservé aux grosses chaînes. L'outil est justement utile pour poser de bonnes bases, éviter les erreurs classiques et suivre une progression plus claire.",
  },
  {
    q: "Streamnco publie-t-il quoi que ce soit sur ma chaîne ?",
    a: "Non. Streamnco ne publie rien à ta place. Le diagnostic initial est en lecture seule.",
  },
];

type FaqItem = { q: string; a: string };

const FaqSection = ({ extraFaq }: { extraFaq?: FaqItem[] }) => {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.2);
  const faqs = extraFaq ? [...DEFAULT_FAQS, ...extraFaq] : DEFAULT_FAQS;

  return (
    <SectionShell id="faq">
      <SectionHeading
        badge="FAQ"
        title="Les questions qu'on nous pose avant de lancer"
        subtitle="Des réponses directes pour démarrer sereinement."
      />

      <div
        ref={ref}
        className="mx-auto mt-8 max-w-3xl md:mt-12"
        style={{
          opacity: inView ? 1 : 0,
          transform: inView ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 700ms cubic-bezier(0.16,1,0.3,1), transform 700ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <Accordion type="single" collapsible defaultValue="faq-0" className="space-y-3">
          {faqs.map((item, i) => (
            <AccordionItem
              key={item.q}
              value={`faq-${i}`}
              className="overflow-hidden rounded-2xl border-2 border-foreground/70 bg-card px-5"
              style={{ boxShadow: "3px 3px 0 0 rgba(23,29,46,0.55)" }}
            >
              <AccordionTrigger className="py-4 text-left text-sm font-semibold text-foreground hover:no-underline md:text-base">
                <span className="flex items-start gap-3 pr-3">
                  <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
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
