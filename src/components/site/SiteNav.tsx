import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthModal } from "@/contexts/AuthModalContext";
import logoMark from "@/assets/logo-mark.svg";
import { Container } from "./el";

const NAV_LINKS = [
  { label: "Fonctionnalités", href: "/fonctionnalites" },
  { label: "Solutions", href: "/solutions" },
  { label: "StreamScore", href: "/streamscore" },
  { label: "Tarifs", href: "/pricing" },
  { label: "Blog", href: "/articles" },
];

const SiteNav = () => {
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        scrolled || open
          ? "border-b border-el-hairline bg-el-canvas/90 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <Container className="flex h-16 items-center justify-between">
        <Link
          to="/"
          onClick={() => setOpen(false)}
          className="flex items-center gap-2"
          aria-label="Streamnco — accueil"
        >
          <img src={logoMark} alt="" className="h-7 w-7" />
          <span className="font-el-sans text-[19px] font-semibold tracking-[-0.02em] text-el-ink">streamnco</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              to={l.href}
              className="font-el-sans text-[15px] font-medium text-el-body transition-colors hover:text-el-ink"
            >
              {l.label}
            </Link>
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
          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-el-ink transition-colors hover:bg-el-strong md:hidden"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </Container>

      {/* Mobile panel */}
      {open && (
        <div className="border-t border-el-hairline bg-el-canvas md:hidden">
          <Container className="flex flex-col py-3">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                to={l.href}
                onClick={() => setOpen(false)}
                className="border-b border-el-hairline py-3.5 font-el-sans text-[16px] font-medium text-el-ink last:border-0"
              >
                {l.label}
              </Link>
            ))}
            {!user && (
              <button
                onClick={() => {
                  setOpen(false);
                  openAuthModal("login");
                }}
                className="mt-3 inline-flex h-11 items-center justify-center rounded-full border border-el-hairline-strong font-el-sans text-[15px] font-medium text-el-ink"
              >
                Connexion
              </button>
            )}
          </Container>
        </div>
      )}
    </header>
  );
};

export default SiteNav;
