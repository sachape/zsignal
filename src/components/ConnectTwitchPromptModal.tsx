import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bookmark, BarChart3, RefreshCw, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { initiateTwitchOAuth } from "@/services/twitchOAuth";

interface ConnectTwitchPromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional: defer for now, do not connect. */
  onLater?: () => void;
}

/**
 * Premium Twitch connect prompt shown right after the user has created
 * their Streamnco account. Frames Twitch as a *data connection*, not as
 * the identity of the SaaS account.
 */
const ConnectTwitchPromptModal = ({
  open,
  onOpenChange,
  onLater,
}: ConnectTwitchPromptModalProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      await initiateTwitchOAuth();
    } catch {
      setLoading(false);
      navigate("/connect-twitch");
    }
  };

  const handleLater = () => {
    onLater?.();
    onOpenChange(false);
  };

  const benefits = [
    { icon: Bookmark, label: "Sauvegarder ton diagnostic" },
    { icon: BarChart3, label: "Débloquer les données enrichies de la chaîne" },
    { icon: RefreshCw, label: "Activer le suivi automatique après chaque live" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-5 rounded-lg p-6 sm:max-w-sm">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-base">
            Connecte Twitch pour débloquer le suivi complet
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Ton compte Streamnco est prêt. Connecte maintenant ta chaîne pour
            récupérer les followers, l'historique live, les comparaisons et le
            suivi automatique.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2.5">
          {benefits.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-start gap-2.5 text-sm text-foreground">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{label}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2">
          <Button
            size="lg"
            variant="twitch"
            onClick={handleConnect}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
                </svg>
                Continuer avec Twitch
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLater}
            disabled={loading}
            className="w-full text-muted-foreground"
          >
            Plus tard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConnectTwitchPromptModal;
