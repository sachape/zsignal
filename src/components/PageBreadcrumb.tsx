import { Link, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { findActiveSection } from "@/components/SectionTabs";

type Crumb = { label: string; to?: string };

const matchPath = (pathname: string, patterns: string[]) =>
  patterns.some((p) => pathname === p || pathname.startsWith(`${p}/`));

/**
 * Breadcrumb for product detail pages — the "how do I get back up" layer of
 * the wayfinding system (sidebar = where in the product, section tabs = where
 * in the section, breadcrumb = the path up, page header = which page).
 *
 * It auto-derives `Section › Tab` from the current route (via SectionTabs),
 * then appends the page's own crumbs (e.g. the specific item being viewed).
 * Pages on routes that belong to no section can pass the full chain via `items`.
 */
const PageBreadcrumb = ({ items = [] }: { items?: Crumb[] }) => {
  const { pathname } = useLocation();
  const section = findActiveSection(pathname);

  const auto: Crumb[] = [];
  if (section) {
    const firstReal = section.tabs.find((t) => !t.soon);
    auto.push({ label: section.label, to: firstReal?.to });
    const activeTab = section.tabs.find(
      (t) => !t.soon && matchPath(pathname, t.matches ?? [t.to]),
    );
    if (activeTab) auto.push({ label: activeTab.label, to: activeTab.to });
  }

  const crumbs = [...auto, ...items];
  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Fil d'Ariane" className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        return (
          <span key={`${c.label}-${i}`} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/40" aria-hidden />}
            {c.to && !last ? (
              <Link to={c.to} className="transition-colors hover:text-foreground">
                {c.label}
              </Link>
            ) : (
              <span className={last ? "font-medium text-foreground" : ""} aria-current={last ? "page" : undefined}>
                {c.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
};

export default PageBreadcrumb;
