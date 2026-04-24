import { useNavigate } from "react-router-dom";
import { Bookmark, BarChart3, History } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { onboardingFlags } from "@/services/onboardingFlags";
import { initiateTwitchOAuth } from "@/services/twitchOAuth";

interface TwitchUnlockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teaserId?: string | null;
}

/**
 * Twitch-first unlock modal shown from the free result page.
 * Replaces the generic email/password/Google auth modal for this path.
 */
const TwitchUnlockModal = ({ open, onOpenChange, teaserId }: TwitchUnlockModalProps) => {
  const navigate = useNavigate();

  const handleContinueWithTwitch = async () => {
    if (teaserId) {
      onboardingFlags.setPendingTeaserId(teaserId);
    }
    onOpenChange(false);

    try {
      await initiateTwitchOAuth({ teaserId: teaserId ?? null });
    } catch (err) {
      console.error("[TwitchUnlockModal] OAuth init failed", err);
      navigate(`/connect-twitch${teaserId ? `?teaser=${teaserId}` : ""}`);
    }
  };

  const benefits = [
    { icon: Bookmark, label: "Sauvegarder ce diagnostic" },
    { icon: BarChart3, label: "Voir les données enrichies de ta chaîne" },
    { icon: History, label: "Retrouver ton historique et tes comparaisons" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-5 rounded-lg p-6 sm:max-w-sm">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-base">
            Débloque la suite de ton diagnostic
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Connecte Twitch pour sauvegarder cette analyse, afficher les données
            avancées et débloquer le suivi complet.
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
            onClick={handleContinueWithTwitch}
            className="w-full"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
            </svg>
            Continuer avec Twitch
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="w-full text-muted-foreground"
          >
            Rester sur l'aperçu
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TwitchUnlockModal;
