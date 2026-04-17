import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  label?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}

const SectionHeader = ({
  label,
  title,
  description,
  align = "center",
}: SectionHeaderProps) => {
  const isCenter = align === "center";
  return (
    <div
      className={cn(
        isCenter ? "mx-auto mb-10 max-w-2xl text-center" : "mb-4 text-left",
      )}
    >
      {label &&
        (isCenter ? (
          <span className="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            {label}
          </span>
        ) : (
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
        ))}
      <h2
        className={cn(
          "font-semibold tracking-tight text-foreground",
          isCenter ? "text-2xl sm:text-3xl" : "text-lg",
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            "text-muted-foreground",
            isCenter ? "mt-3 text-base" : "mt-1 text-sm",
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
};

export default SectionHeader;
