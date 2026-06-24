import { Link } from "react-router-dom";
import { useAuthModal } from "@/contexts/AuthModalContext";
import logoMark from "@/assets/logo-mark.svg";
import { Container } from "./el";

const COLUMNS: { title: string; links: { label: string; to: string; external?: boolean }[] }[] = [
  {
    title: "Produit",
    links: [
      { label: "Fonctionnalités", to: "/fonctionnalites" },
      { label: "StreamScore", to: "/streamscore" },
      { label: "Solutions", to: "/solutions" },
      { label: "Tarifs", to: "/pricing" },
    ],
  },
  {
    title: "Ressources",
    links: [
      { label: "Blog", to: "/articles" },
      { label: "À propos", to: "/a-propos" },
    ],
  },
  {
    title: "Légal",
    links: [
      { label: "Mentions légales", to: "/legal/mentions" },
      { label: "CGU", to: "/legal/terms" },
      { label: "Confidentialité", to: "/legal/privacy" },
      { label: "Cookies", to: "/legal/cookies" },
    ],
  },
];

const SiteFooter = () => {
  const { openAuthModal } = useAuthModal();
  return (
    <footer className="border-t border-el-hairline bg-el-canvas">
      <Container className="py-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Brand + CTA */}
          <div>
            <span className="flex items-center gap-2">
              <img src={logoMark} alt="" className="h-7 w-7" />
              <span className="font-el-sans text-[19px] font-semibold tracking-[-0.02em] text-el-ink">
                streamnco
              </span>
            </span>
            <p className="mt-3 max-w-xs font-el-sans text-[15px] leading-relaxed text-el-body">
              Le cockpit créatif des streamers. Transforme tes lives en clips,
              visuels et croissance.
            </p>
            <button
              onClick={() => openAuthModal("signup")}
              className="mt-6 inline-flex h-10 items-center rounded-full bg-el-ink px-5 font-el-sans text-[15px] font-medium text-el-on-dark transition-colors hover:bg-el-ink-soft"
            >
              Créer mon compte
            </button>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="font-el-sans text-[12px] font-semibold uppercase tracking-[0.16em] text-el-muted">
                {col.title}
              </p>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      className="font-el-sans text-[15px] text-el-body transition-colors hover:text-el-ink"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-el-hairline pt-8 sm:flex-row sm:items-center">
          <p className="font-el-sans text-[14px] text-el-muted">
            © {new Date().getFullYear()} Streamnco. Tous droits réservés.
          </p>
          <a
            href="https://www.instagram.com/streamnco.fr/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-el-sans text-[14px] text-el-muted transition-colors hover:text-el-ink"
          >
            Instagram
          </a>
        </div>
      </Container>
    </footer>
  );
};

export default SiteFooter;
