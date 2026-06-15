import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      {/* Premium atmosphere — aurora + grain + grid, consistent with the landing */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[40rem] w-[56rem] -translate-x-1/2 landing-aurora" aria-hidden />
      <div className="landing-grain pointer-events-none absolute inset-0" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,hsl(var(--foreground)/0.04)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)] opacity-40"
        aria-hidden
      />

      <div className="relative w-full max-w-lg text-center">
        <p className="bg-gradient-to-b from-foreground to-foreground/25 bg-clip-text text-[7rem] font-bold leading-none tracking-tighter text-transparent sm:text-[9rem]">
          404
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Cette page a quitté le live.
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
          La page que tu cherches n'existe pas ou a été déplacée. Reviens à l'accueil pour reprendre là où tu en étais.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="group gap-2">
            <Link to="/">
              <Home className="h-4 w-4" />
              Retour à l'accueil
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/fonctionnalites">Voir les fonctionnalités</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
