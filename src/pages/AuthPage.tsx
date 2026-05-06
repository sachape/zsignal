import { Link, useSearchParams } from "react-router-dom";
import logo from "@/assets/logo.svg";
import { Card, CardContent } from "@/components/ui/card";
import AuthForm from "@/components/auth/AuthForm";

const AuthPage = () => {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
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
    </div>
  );
};

export default AuthPage;
