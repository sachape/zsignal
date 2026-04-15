interface StatBlockProps {
  label: string;
  value: string;
  subtext?: string;
  accent?: boolean;
}

const StatBlock = ({ label, value, subtext, accent }: StatBlockProps) => {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent ? "gradient-primary-text" : "text-foreground"}`}>
        {value}
      </p>
      {subtext && <p className="mt-0.5 text-xs text-muted-foreground">{subtext}</p>}
    </div>
  );
};

export default StatBlock;
