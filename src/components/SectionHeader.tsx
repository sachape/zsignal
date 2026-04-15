interface SectionHeaderProps {
  label?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}

const SectionHeader = ({ label, title, description, align = "center" }: SectionHeaderProps) => {
  return (
    <div className={`mb-10 ${align === "center" ? "text-center" : "text-left"}`}>
      {label && (
        <span className="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
          {label}
        </span>
      )}
      <h2 className="text-2xl font-bold text-foreground sm:text-3xl">{title}</h2>
      {description && (
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">{description}</p>
      )}
    </div>
  );
};

export default SectionHeader;
