import { Loader2 } from "lucide-react";

/**
 * Unified loading / error / empty surfaces used across the product.
 * Keeps state UX consistent everywhere.
 */
export const LoadingState = ({ label }: { label?: string }) => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
    <Loader2 className="h-5 w-5 animate-spin text-primary" />
    {label && <p className="text-sm">{label}</p>}
  </div>
);

export const ErrorState = ({
  title = "Une erreur est survenue",
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
    <h2 className="text-lg font-semibold text-foreground">{title}</h2>
    {description && (
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
    )}
    {action && <div className="mt-2">{action}</div>}
  </div>
);
