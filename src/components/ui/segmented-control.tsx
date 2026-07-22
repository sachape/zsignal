import * as React from "react";

import { cn } from "@/lib/utils";

// SegmentedControl — sélection UNIQUE dans un groupe (onglets/segments) : piste +
// items, un seul actif. Compound (value/onValueChange via contexte), sémantique
// radiogroup/radio. Dimensions via tokens --segmented-control-* ; couleurs via
// tokens sémantiques. Distinct de Chip (filtre pill), Tabs (bascule de vues) et
// RadioGroup (liste verticale de champs).
const SegmentedControlContext = React.createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
}>({});

export interface SegmentedControlProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  value?: string;
  onValueChange?: (value: string) => void;
}

const SegmentedControl = React.forwardRef<HTMLDivElement, SegmentedControlProps>(
  ({ value, onValueChange, className, children, ...props }, ref) => (
    <SegmentedControlContext.Provider value={{ value, onValueChange }}>
      <div
        ref={ref}
        role="radiogroup"
        className={cn(
          "inline-flex items-center rounded-[var(--segmented-control-radius)] border bg-card/50 p-[var(--segmented-control-padding)]",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </SegmentedControlContext.Provider>
  ),
);
SegmentedControl.displayName = "SegmentedControl";

export interface SegmentedControlItemProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "value"> {
  value: string;
}

const SegmentedControlItem = React.forwardRef<HTMLButtonElement, SegmentedControlItemProps>(
  ({ value, className, type = "button", ...props }, ref) => {
    const ctx = React.useContext(SegmentedControlContext);
    const active = ctx.value === value;
    return (
      <button
        ref={ref}
        type={type}
        role="radio"
        aria-checked={active}
        onClick={() => ctx.onValueChange?.(value)}
        className={cn(
          "rounded-[var(--segmented-control-item-radius)] px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0",
          active ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground",
          className,
        )}
        {...props}
      />
    );
  },
);
SegmentedControlItem.displayName = "SegmentedControlItem";

export { SegmentedControl, SegmentedControlItem };
