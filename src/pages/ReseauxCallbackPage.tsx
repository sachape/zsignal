import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function ReseauxCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    const error = params.get("error");
    if (error) {
      toast.error("Connexion impossible. Réessaie.");
    } else if (status === "success" || params.get("connected")) {
      toast.success("Compte connecté avec succès.");
    } else {
      toast.success("Retour de connexion réseau.");
    }
    const t = setTimeout(() => navigate("/reseaux", { replace: true }), 600);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="flex h-screen items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        Retour vers Streamnco…
      </div>
    </div>
  );
}
