import { useEffect } from "react";

export interface PageMeta {
  title: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: "website" | "profile" | "article";
  canonical?: string;
}

const DEFAULT_TITLE = "Streamnco — Analyse ta chaîne Twitch";
const DEFAULT_DESC =
  "Analyse ta chaîne Twitch gratuitement. StreamScore, progression vers l'affiliation, benchmarks concurrents — tout automatiquement.";

function upsertMeta(
  attr: "name" | "property",
  value: string,
  content: string,
): void {
  let el = document.querySelector<HTMLMetaElement>(
    `meta[${attr}="${value}"]`,
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, value);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string): void {
  let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export function usePageMeta(meta: PageMeta | null): void {
  useEffect(() => {
    if (!meta) return;

    // Title
    document.title = `${meta.title} | Streamnco`;

    // Description
    const desc = meta.description ?? DEFAULT_DESC;
    upsertMeta("name", "description", desc);

    // Open Graph
    const ogTitle = meta.ogTitle ?? meta.title;
    const ogDesc = meta.ogDescription ?? desc;
    upsertMeta("property", "og:title", `${ogTitle} | Streamnco`);
    upsertMeta("property", "og:description", ogDesc);
    upsertMeta("property", "og:type", meta.ogType ?? "website");
    upsertMeta("property", "og:site_name", "Streamnco");
    if (meta.ogImage) {
      upsertMeta("property", "og:image", meta.ogImage);
    }

    // Twitter Card
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", `${ogTitle} | Streamnco`);
    upsertMeta("name", "twitter:description", ogDesc);
    if (meta.ogImage) {
      upsertMeta("name", "twitter:image", meta.ogImage);
    }

    // Canonical
    if (meta.canonical) {
      upsertLink("canonical", meta.canonical);
    }

    // Restore on unmount
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [meta]);
}
