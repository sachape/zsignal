import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatBlockProps {
  label: string;
  value: string;
  subtext?: string;
  accent?: boolean;
}

const StatBlock = ({ label, value, subtext, accent }: StatBlockProps) => {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            "mt-1 text-2xl font-semibold tracking-tight",
            accent ? "text-primary-strong" : "text-foreground",
          )}
        >
          {value}
        </p>
        {subtext && (
          <p className="mt-0.5 text-xs text-muted-foreground">{subtext}</p>
        )}
      </CardContent>
    </Card>
  );
};

export default StatBlock;
