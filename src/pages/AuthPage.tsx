import { Link, useSearchParams } from "react-router-dom";
import logo from "@/assets/logo.svg";
import { Card, CardContent } from "@/components/ui/card";
import AuthForm from "@/components/auth/AuthForm";

const AuthPage = () => {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* La page n'affiche pas de titre : AuthForm ouvre directement sur un h2.
            Ce h1 rétablit la hiérarchie et donne son titre à la page pour les
            lecteurs d'écran, sans modifier le rendu. */}
        <h1 className="sr-only">Connexion à Streamnco</h1>
        <Link
          to="/"
          className="mx-auto mb-6 flex items-center justify-center"
          aria-label="Streamnco"
        >
          <img src={logo} alt="Streamnco" className="h-6 w-auto" />
        </Link>

        <Card>
          <CardContent className="p-6">
            <AuthForm redirectTo={redirectTo} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default AuthPage;
