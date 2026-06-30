import { useState } from "react";
import { Loader2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  packageId: string;
  label?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "secondary" | "ghost";
  className?: string;
}

/**
 * Pay As You Go — Opens a Stripe Checkout for the given credit pack.
 * Errors are surfaced as toasts only — never expose raw `package_inactive`,
 * `package_price_not_configured`, etc. to the end-user.
 */
export function BuyCreditsButton({ packageId, label, size = "sm", variant = "default", className }: Props) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-credit-checkout-session", {
        body: { package_id: packageId },
      });
      if (error) throw error;
      const url = (data as { url?: string } | null)?.url;
      if (!url) throw new Error("missing_url");
      window.location.href = url;
    } catch {
      toast.error("Impossible de démarrer l'achat. Réessaie dans un instant.");
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleClick} disabled={loading} size={size} variant={variant} className={className}>
      {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />}
      {label ?? "Acheter des crédits"}
    </Button>
  );
}

export default BuyCreditsButton;
