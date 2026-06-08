import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Erreur 404
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Page introuvable
            </h1>
            <p className="text-sm text-muted-foreground">
              Cette page n'existe pas ou a été déplacée.
            </p>
            <Button asChild className="mt-2">
              <Link to="/">Retour à l'accueil</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotFound;
