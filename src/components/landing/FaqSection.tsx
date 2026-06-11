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
    q: "Est-ce que Streamnco publie automatiquement sur TikTok et Instagram ?",
    a: "Non. Streamnco t'aide à préparer des contenus adaptés à TikTok, Reels et Shorts, puis à les télécharger. La publication reste manuelle tant que les intégrations officielles ne sont pas suffisamment fiables.",
  },
  {
    q: "Est-ce que je peux télécharger mes clips et visuels ?",
    a: "Oui. Tous les clips réseaux et visuels générés peuvent être téléchargés depuis ta file de contenu pour être publiés manuellement où tu veux.",
  },
  {
    q: "Est-ce que le Studio visuel exporte aux bons formats ?",
    a: "Oui. Tes visuels sont exportés aux dimensions adaptées à chaque usage : bannière Twitch, story verticale 9:16, post carré 1:1, cover YouTube, annonce de live, et plus encore. 8 formats prêts à l'emploi avec 3 variantes par génération.",
  },
  {
    q: "Combien de clips et de visuels puis-je générer ?",
    a: "Chaque plan inclut une limite mensuelle pour garder le service fiable. Gratuit : 5 visuels et 3 clips par mois. Pro : 100 visuels et 30 clips. Growth : 300 visuels et 200 clips. Les générations en échec ne sont pas comptées.",
  },
  {
    q: "Faut-il connecter Twitch pour commencer ?",
    a: "Non. Tu peux lancer un premier diagnostic public en entrant ton pseudo Twitch. Connecter ta chaîne devient utile pour le suivi complet, le StreamScore personnalisé et la génération de clips à partir de tes propres Clips et VOD.",
  },
  {
    q: "Mes données Twitch sont-elles privées ?",
    a: "Oui. Streamnco ne publie jamais à ta place sans ton action explicite, et ne partage pas tes données avec des tiers. Le diagnostic public utilise uniquement les signaux Twitch déjà visibles publiquement.",
  },
  {
    q: "Est-ce utile si je débute ?",
    a: "Oui — c'est même là que Streamnco aide le plus. Tu poses tout de suite de bonnes bases : un StreamScore clair pour savoir où tu en es, et de quoi créer du contenu autour de tes premiers lives sans logiciel pro.",
  },
  {
    q: "À quoi sert le StreamScore ?",
    a: "Il synthétise les signaux Twitch importants en score, dimensions et recommandations. L'objectif n'est pas de promettre une croissance garantie, mais de clarifier les priorités.",
  },
];

const FaqSection = () => {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.2);

  return (
    <SectionShell id="faq">
      <SectionHeading
        badge="FAQ"
        title="Des promesses claires, pas de flou."
        subtitle="Ce qui est disponible, ce qui est manuel, et ce qui viendra plus tard."
      />

      <div
        ref={ref}
        className="mx-auto mt-8 max-w-3xl md:mt-12"
        style={{
          opacity: inView ? 1 : 0,
          transform: inView ? "translateY(0)" : "translateY(16px)",
          transition:
            "opacity 700ms cubic-bezier(0.16,1,0.3,1), transform 700ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <Accordion type="single" collapsible defaultValue="faq-0" className="space-y-3">
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
