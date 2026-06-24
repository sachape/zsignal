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

/**
 * Public site navigation. `theme="light"` for the editorial marketing site;
 * `theme="dark"` for the logged-out product shell (dark surfaces, e.g. the
 * /analyze diagnostic teaser).
 */
const SiteNav = ({ theme = "light" }: { theme?: "light" | "dark" }) => {
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const dark = theme === "dark";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const wordmark = dark ? "text-el-on-dark" : "text-el-ink";
  const linkCls = dark
    ? "text-el-on-dark-soft hover:text-el-on-dark"
    : "text-el-body hover:text-el-ink";
  const ctaPill = dark
    ? "bg-el-on-dark text-el-ink hover:opacity-90"
    : "bg-el-ink text-el-on-dark hover:bg-el-ink-soft";
  const ghostCls = dark
    ? "text-el-on-dark hover:bg-white/10"
    : "text-el-ink hover:bg-el-strong";

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        scrolled || open
          ? dark
            ? "border-b border-white/10 bg-el-dark/90 backdrop-blur-xl"
            : "border-b border-el-hairline bg-el-canvas/90 backdrop-blur-xl"
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
          <span className={cn("font-el-sans text-[19px] font-semibold tracking-[-0.02em]", wordmark)}>streamnco</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} to={l.href} className={cn("font-el-sans text-[15px] font-medium transition-colors", linkCls)}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <Link to="/dashboard" className={cn("inline-flex h-10 items-center rounded-full px-5 font-el-sans text-[15px] font-medium transition-colors", ctaPill)}>
              Tableau de bord
            </Link>
          ) : (
            <>
              <button
                onClick={() => openAuthModal("login")}
                className={cn("hidden h-10 items-center rounded-full px-4 font-el-sans text-[15px] font-medium transition-colors sm:inline-flex", ghostCls)}
              >
                Connexion
              </button>
              <button
                onClick={() => openAuthModal("signup")}
                className={cn("inline-flex h-10 items-center rounded-full px-5 font-el-sans text-[15px] font-medium transition-colors", ctaPill)}
              >
                Essayer gratuitement
              </button>
            </>
          )}
          <button
            onClick={() => setOpen((v) => !v)}
            className={cn("inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors md:hidden", ghostCls)}
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </Container>

      {open && (
        <div className={cn("md:hidden", dark ? "border-t border-white/10 bg-el-dark" : "border-t border-el-hairline bg-el-canvas")}>
          <Container className="flex flex-col py-3">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                to={l.href}
                onClick={() => setOpen(false)}
                className={cn("border-b py-3.5 font-el-sans text-[16px] font-medium last:border-0", dark ? "border-white/10 text-el-on-dark" : "border-el-hairline text-el-ink")}
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
                className={cn("mt-3 inline-flex h-11 items-center justify-center rounded-full border font-el-sans text-[15px] font-medium", dark ? "border-white/20 text-el-on-dark" : "border-el-hairline-strong text-el-ink")}
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
