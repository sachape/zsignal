import { Link, useSearchParams } from "react-router-dom";
import { Zap } from "lucide-react";
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
          className="mx-auto mb-6 flex items-center justify-center gap-2"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <Zap className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold text-foreground">
            StreamPulse
          </span>
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
