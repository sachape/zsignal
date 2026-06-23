import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { Container } from "./el";

const NAV_LINKS = [
  { label: "Fonctionnalités", href: "#piliers" },
  { label: "Comment ça marche", href: "#comment" },
  { label: "Tarifs", href: "#tarifs" },
  { label: "FAQ", href: "#faq" },
];

const SiteNav = () => {
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        scrolled
          ? "border-b border-el-hairline bg-el-canvas/85 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <Container className="flex h-16 items-center justify-between">
        <Link
          to="/"
          className="font-el-sans text-[19px] font-semibold tracking-[-0.02em] text-el-ink"
          aria-label="Streamnco — accueil"
        >
          streamnco
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="font-el-sans text-[15px] font-medium text-el-body transition-colors hover:text-el-ink"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <Link
              to="/dashboard"
              className="inline-flex h-10 items-center rounded-full bg-el-ink px-5 font-el-sans text-[15px] font-medium text-el-on-dark transition-colors hover:bg-el-ink-soft"
            >
              Tableau de bord
            </Link>
          ) : (
            <>
              <button
                onClick={() => openAuthModal("login")}
                className="hidden h-10 items-center rounded-full px-4 font-el-sans text-[15px] font-medium text-el-ink transition-colors hover:bg-el-strong sm:inline-flex"
              >
                Connexion
              </button>
              <button
                onClick={() => openAuthModal("signup")}
                className="inline-flex h-10 items-center rounded-full bg-el-ink px-5 font-el-sans text-[15px] font-medium text-el-on-dark transition-colors hover:bg-el-ink-soft"
              >
                Essayer gratuitement
              </button>
            </>
          )}
        </div>
      </Container>
    </header>
  );
};

export default SiteNav;
