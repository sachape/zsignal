import { useMemo, useState } from "react";
import {
  Search,
  LifeBuoy,
  Rocket,
  Gauge,
  Link as LinkIcon,
  Map,
  Crown,
  ShieldCheck,
  AlertTriangle,
  MessageCircle,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import PageContainer from "@/components/PageContainer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { usePageMeta } from "@/hooks/usePageMeta";
import { cn } from "@/lib/utils";

type Article = { id: string; title: string; content: string };
type Category = {
  id: string;
  label: string;
  icon: typeof Rocket;
  articles: Article[];
};

const CATEGORIES: Category[] = [
  {
    id: "demarrage",
    label: "Démarrage",
    icon: Rocket,
    articles: [
      {
        id: "a1",
        title: "Comment lancer mon premier diagnostic ?",
        content:
          "Pour lancer ton premier diagnostic, entre ton pseudo Twitch dans Streamnco, sélectionne ta chaîne, puis lance l'analyse.\n\nStreamnco récupère les signaux disponibles pour produire un résumé clair de ta chaîne : activité récente, structure, contenu, positionnement et pistes d'amélioration.\n\nPour obtenir une analyse plus complète, connecte ton compte Twitch.",
      },
      {
        id: "a2",
        title: "Ai-je besoin de connecter Twitch pour utiliser Streamnco ?",
        content:
          "Tu peux lancer un premier aperçu avec ton pseudo Twitch.\n\nLa connexion Twitch permet d'obtenir une analyse plus complète, un meilleur suivi et des recommandations plus précises.\n\nCertaines données ne sont pas accessibles publiquement. C'est pour cette raison que la connexion Twitch améliore la qualité du diagnostic.",
      },
      {
        id: "a3",
        title: "Que faire après mon premier diagnostic ?",
        content:
          "Commence par lire ton résumé d'analyse, puis regarde ton StreamScore et ta feuille de route.\n\nL'objectif n'est pas de tout corriger d'un coup. Streamnco t'aide à identifier les priorités les plus importantes pour progresser plus vite.",
      },
    ],
  },
  {
    id: "diagnostic",
    label: "Diagnostic & StreamScore",
    icon: Gauge,
    articles: [
      {
        id: "a4",
        title: "Comment fonctionne le StreamScore ?",
        content:
          "Le StreamScore est un indicateur global qui aide à comprendre la progression de ta chaîne Twitch.\n\nIl analyse plusieurs dimensions :\n- Régularité\n- Structure\n- Contenu\n- Positionnement\n- Momentum\n- Monétisation\n\nLe score ne sert pas à juger ta chaîne. Il sert à identifier les leviers qui bloquent ou accélèrent ta progression.",
      },
      {
        id: "a5",
        title: "Pourquoi mon score est faible ?",
        content:
          "Un score faible ne veut pas dire que ta chaîne est mauvaise.\n\nCela indique souvent que Streamnco détecte des signaux faibles sur certaines dimensions : manque de régularité, structure peu claire, positionnement difficile à lire, faible historique récent ou peu de données disponibles.\n\nLa bonne approche consiste à suivre la feuille de route et à améliorer un levier à la fois.",
      },
      {
        id: "a6",
        title: "Comment améliorer mon StreamScore ?",
        content:
          "Les premiers leviers sont généralement :\n- streamer plus régulièrement\n- clarifier ton positionnement\n- améliorer tes titres de live\n- choisir des catégories cohérentes\n- structurer tes sessions\n- analyser tes performances après chaque live\n- suivre ta feuille de route chaque semaine\n\nLe but n'est pas d'atteindre 100 immédiatement. Le but est de créer une progression régulière.",
      },
      {
        id: "a7",
        title: "Pourquoi certaines données sont vides ?",
        content:
          "Certaines données peuvent être vides lorsque :\n- ta chaîne n'a pas assez d'activité récente\n- Twitch ne rend pas certaines informations publiques\n- ton compte Twitch n'est pas encore connecté\n- Streamnco n'a pas encore assez d'historique pour comparer tes performances\n\nCe n'est pas forcément une erreur. Connecte ton compte Twitch et relance l'analyse pour obtenir plus de signaux.",
      },
    ],
  },
  {
    id: "twitch",
    label: "Connexion Twitch",
    icon: LinkIcon,
    articles: [
      {
        id: "a8",
        title: "Comment connecter mon compte Twitch ?",
        content:
          "Clique sur « Continuer avec Twitch » ou « Connecter Twitch », puis autorise Streamnco à accéder aux données nécessaires.\n\nCette connexion permet de débloquer une analyse plus complète, un meilleur suivi de progression et des recommandations plus fiables.",
      },
      {
        id: "a9",
        title: "Twitch ne se connecte pas, que faire ?",
        content:
          "Essaie d'abord de te déconnecter puis de reconnecter ton compte Twitch.\n\nSi le problème continue, contacte le support avec :\n- ton pseudo Twitch\n- la page concernée\n- une capture d'écran\n- le message d'erreur affiché",
      },
      {
        id: "a10",
        title: "Streamnco peut-il modifier ma chaîne Twitch ?",
        content:
          "Non. Streamnco n'a pas vocation à modifier ta chaîne Twitch, publier du contenu ou changer tes paramètres à ta place.\n\nLa connexion sert à analyser les données nécessaires pour produire un diagnostic plus utile.",
      },
    ],
  },
  {
    id: "feuille-de-route",
    label: "Feuille de route",
    icon: Map,
    articles: [
      {
        id: "a11",
        title: "À quoi sert la feuille de route ?",
        content:
          "La feuille de route transforme ton diagnostic en plan d'action.\n\nElle t'aide à savoir quoi faire en priorité, au lieu de te perdre dans trop de métriques.\n\nChaque recommandation est liée à un problème détecté dans ton analyse.",
      },
      {
        id: "a12",
        title: "Comment utiliser ma feuille de route ?",
        content:
          "Lis d'abord la priorité principale, puis applique les actions recommandées dans l'ordre.\n\nNe cherche pas à tout faire en même temps. L'objectif est d'avancer chaque semaine sur les actions qui peuvent avoir le plus d'impact sur ta progression.",
      },
      {
        id: "a13",
        title: "Pourquoi ma feuille de route change ?",
        content:
          "Ta feuille de route peut évoluer lorsque Streamnco détecte de nouveaux signaux : nouveau live, changement de régularité, progression du score, nouvelle faiblesse ou nouvelle opportunité.\n\nElle s'adapte à l'état réel de ta chaîne.",
      },
    ],
  },
  {
    id: "abonnement",
    label: "Abonnement & Pro",
    icon: Crown,
    articles: [
      {
        id: "a14",
        title: "Quelle est la différence entre gratuit et Pro ?",
        content:
          "La version gratuite permet de découvrir ton diagnostic et les premiers signaux de progression.\n\nLa version Pro débloque une analyse plus complète, une feuille de route plus avancée, un meilleur suivi et des recommandations plus détaillées.",
      },
      {
        id: "a15",
        title: "J'ai un problème de paiement ou d'abonnement",
        content:
          "Contacte le support avec :\n- l'email utilisé sur Streamnco\n- une capture du problème\n- la page concernée\n\nL'équipe vérifiera l'état de ton compte et de ton abonnement.",
      },
      {
        id: "a16",
        title: "Puis-je commencer gratuitement ?",
        content:
          "Oui. Tu peux commencer avec un premier diagnostic gratuit.\n\nLa version gratuite sert à comprendre les premiers signaux de ta chaîne avant de passer sur une analyse plus complète.",
      },
    ],
  },
  {
    id: "donnees",
    label: "Données & confidentialité",
    icon: ShieldCheck,
    articles: [
      {
        id: "a17",
        title: "Quelles données Twitch sont utilisées ?",
        content:
          "Streamnco utilise les données nécessaires pour analyser ta chaîne et produire ton diagnostic.\n\nCertaines données viennent des informations publiques de ta chaîne. D'autres données peuvent être accessibles uniquement après connexion Twitch.\n\nStreamnco n'a pas vocation à modifier ta chaîne Twitch ni à publier du contenu à ta place.",
      },
      {
        id: "a18",
        title: "Pourquoi Streamnco demande une connexion Twitch ?",
        content:
          "La connexion Twitch permet d'accéder à des signaux plus fiables pour produire une analyse plus complète.\n\nSans connexion, certaines données peuvent être absentes ou limitées.",
      },
      {
        id: "a19",
        title: "Mes données sont-elles revendues ?",
        content:
          "Non. Streamnco utilise les données pour fournir l'analyse, le diagnostic, le suivi et les recommandations liées à ta chaîne.",
      },
    ],
  },
  {
    id: "problemes",
    label: "Problèmes fréquents",
    icon: AlertTriangle,
    articles: [
      {
        id: "a20",
        title: "Mon diagnostic reste bloqué",
        content:
          "Rafraîchis la page puis relance l'analyse.\n\nSi le problème continue, contacte le support avec :\n- ton pseudo Twitch\n- la page concernée\n- une capture d'écran\n- l'heure approximative du problème",
      },
      {
        id: "a21",
        title: "Le mauvais compte Twitch apparaît",
        content:
          "Vérifie que tu as sélectionné le bon compte Twitch au moment de l'analyse ou de la connexion.\n\nSi le problème continue, contacte le support avec ton pseudo Twitch exact et une capture de la page concernée.",
      },
      {
        id: "a22",
        title: "Je ne comprends pas mon analyse",
        content:
          "Commence par lire le résumé principal, puis regarde les dimensions du StreamScore.\n\nLa feuille de route indique ensuite les actions prioritaires. C'est la partie la plus importante si tu veux savoir quoi faire concrètement.",
      },
      {
        id: "a23",
        title: "Comment contacter le support ?",
        content:
          "Ouvre le menu compte dans la sidebar, puis clique sur « Support ».\n\nAjoute dans ton message :\n- ton pseudo Twitch\n- la page concernée\n- une capture d'écran si possible\n- une description courte du problème",
      },
    ],
  },
];

function openCrisp(): void {
  const w = window as unknown as { $crisp?: unknown[] };
  if (!w.$crisp || typeof (w.$crisp as { push?: unknown }).push !== "function")
    return;
  try {
    (w.$crisp as unknown[]).push(["do", "chat:show"] as never);
    (w.$crisp as unknown[]).push(["do", "chat:open"] as never);
  } catch {
    // Crisp unavailable — fail silently
  }
}

function scrollToCategory(id: string): void {
  const el = document.getElementById(`cat-${id}`);
  if (!el) return;
  const y = el.getBoundingClientRect().top + window.scrollY - 96;
  window.scrollTo({ top: y, behavior: "smooth" });
}

const HelpPage = () => {
  const [query, setQuery] = useState("");

  usePageMeta({
    title: "Centre d'aide Streamnco | Support & FAQ",
    description:
      "Trouve les réponses aux questions fréquentes sur Streamnco, le diagnostic Twitch, le StreamScore, la connexion Twitch, la feuille de route et l'abonnement Pro.",
    canonical: "https://streamnco.fr/help",
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATEGORIES;
    return CATEGORIES
      .map((c) => ({
        ...c,
        articles: c.articles.filter(
          (a) =>
            a.title.toLowerCase().includes(q) ||
            a.content.toLowerCase().includes(q),
        ),
      }))
      .filter((c) => c.articles.length > 0);
  }, [query]);

  const noResults = query.trim().length > 0 && filtered.length === 0;

  return (
    <AppShell>
      <PageContainer size="lg">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 opacity-60"
            style={{
              background:
                "radial-gradient(60% 50% at 50% 0%, hsl(var(--primary) / 0.15), transparent 70%)",
            }}
          />
          <div className="container mx-auto max-w-4xl px-4 py-16 text-center md:px-6 md:py-24">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground">
              <LifeBuoy className="h-3.5 w-3.5 text-primary" />
              Support Streamnco
            </div>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
              Centre d'aide Streamnco
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
              Trouve rapidement une réponse sur ton diagnostic, ton StreamScore,
              Twitch, ta feuille de route ou ton abonnement.
            </p>

            <div className="relative mx-auto mt-8 max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher une question, un problème ou un mot-clé…"
                className="h-12 rounded-xl border-white/10 bg-white/[0.03] pl-11 text-sm shadow-lg shadow-black/20 placeholder:text-muted-foreground/70 focus-visible:ring-primary/40"
                aria-label="Rechercher dans le centre d'aide"
              />
            </div>
          </div>
        </section>

        <div className="mt-10">
          {/* Quick support card */}
          <div className="mb-12 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.08] via-white/[0.02] to-transparent p-6 md:p-8">
            <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Besoin d'aide ?
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                    Si tu ne trouves pas ta réponse, ouvre le support depuis ton
                    menu compte ou envoie-nous ton pseudo Twitch avec une
                    capture du problème.
                  </p>
                </div>
              </div>
              <Button
                onClick={openCrisp}
                className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Contacter le support
              </Button>
            </div>
          </div>

          {/* Category cards */}
          {!query && (
            <>
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-foreground/40">
                Catégories
              </h2>
              <div className="mb-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {CATEGORIES.map((c) => {
                  const Icon = c.icon;
                  return (
                    <button
                      key={c.id}
                      onClick={() => scrollToCategory(c.id)}
                      className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left transition-all hover:border-primary/30 hover:bg-white/[0.04]"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {c.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {c.articles.length} article
                          {c.articles.length > 1 ? "s" : ""}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Sticky category nav (desktop) */}
              <nav
                aria-label="Navigation des catégories"
                className="sticky top-14 z-10 -mx-4 mb-8 hidden border-y border-white/[0.06] bg-background/80 px-4 py-3 backdrop-blur-md md:block"
              >
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => scrollToCategory(c.id)}
                      className="rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </nav>
            </>
          )}

          {/* Articles */}
          {noResults ? (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10 text-center">
              <h3 className="text-lg font-semibold text-foreground">
                Aucun résultat trouvé
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Essaie avec un autre mot-clé ou contacte le support Streamnco.
              </p>
              <Button
                onClick={openCrisp}
                className="mt-5 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Contacter le support
              </Button>
            </div>
          ) : (
            <div className="space-y-12">
              {filtered.map((c) => {
                const Icon = c.icon;
                return (
                  <section
                    key={c.id}
                    id={`cat-${c.id}`}
                    className="scroll-mt-28"
                  >
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <h2 className="text-xl font-semibold text-foreground">
                        {c.label}
                      </h2>
                    </div>

                    <Accordion
                      type="single"
                      collapsible
                      className={cn(
                        "overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]",
                      )}
                    >
                      {c.articles.map((a, i) => (
                        <AccordionItem
                          key={a.id}
                          value={a.id}
                          className={cn(
                            "border-b border-white/[0.06] px-5 last:border-b-0",
                          )}
                        >
                          <AccordionTrigger className="text-left text-sm font-medium text-foreground hover:no-underline">
                            {a.title}
                          </AccordionTrigger>
                          <AccordionContent className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                            {a.content}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </PageContainer>
    </AppShell>
  );
};

export default HelpPage;
