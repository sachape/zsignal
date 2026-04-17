interface Props {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/**
 * Standard product page header. One source of truth for title hierarchy.
 */
const PageHeader = ({ eyebrow, title, description, action }: Props) => {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-[28px]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
};

export default PageHeader;
