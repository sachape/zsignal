import { useEffect } from "react";

export interface PageMeta {
  title: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: "website" | "profile" | "article";
  ogUrl?: string;
  canonical?: string;
  /** Optional JSON-LD object(s) to inject as <script type="application/ld+json"> */
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
  /** Optional <meta name="robots"> directive (e.g. "noindex,nofollow") */
  robots?: string;
}

const DEFAULT_TITLE = "Streamnco — Analyse ta chaîne Twitch";
const DEFAULT_DESC =
  "Analyse ta chaîne Twitch gratuitement. StreamScore, progression vers l'affiliation, benchmarks concurrents — tout automatiquement.";

const JSONLD_ATTR = "data-page-meta-jsonld";

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

function clearJsonLd(): void {
  document
    .querySelectorAll(`script[${JSONLD_ATTR}]`)
    .forEach((el) => el.remove());
}

function injectJsonLd(
  data: Record<string, unknown> | Array<Record<string, unknown>>,
): void {
  const arr = Array.isArray(data) ? data : [data];
  for (const item of arr) {
    const el = document.createElement("script");
    el.setAttribute("type", "application/ld+json");
    el.setAttribute(JSONLD_ATTR, "true");
    el.textContent = JSON.stringify(item);
    document.head.appendChild(el);
  }
}

export function usePageMeta(meta: PageMeta | null): void {
  useEffect(() => {
    if (!meta) return;

    document.title = `${meta.title} | Streamnco`;

    const desc = meta.description ?? DEFAULT_DESC;
    upsertMeta("name", "description", desc);

    const ogTitle = meta.ogTitle ?? meta.title;
    const ogDesc = meta.ogDescription ?? desc;
    upsertMeta("property", "og:title", `${ogTitle} | Streamnco`);
    upsertMeta("property", "og:description", ogDesc);
    upsertMeta("property", "og:type", meta.ogType ?? "website");
    upsertMeta("property", "og:site_name", "Streamnco");
    if (meta.ogUrl) {
      upsertMeta("property", "og:url", meta.ogUrl);
    }
    if (meta.ogImage) {
      upsertMeta("property", "og:image", meta.ogImage);
    }

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", `${ogTitle} | Streamnco`);
    upsertMeta("name", "twitter:description", ogDesc);
    if (meta.ogImage) {
      upsertMeta("name", "twitter:image", meta.ogImage);
    }

    if (meta.canonical) {
      upsertLink("canonical", meta.canonical);
    }

    if (meta.robots) {
      upsertMeta("name", "robots", meta.robots);
    }

    clearJsonLd();
    if (meta.jsonLd) {
      injectJsonLd(meta.jsonLd);
    }

    return () => {
      document.title = DEFAULT_TITLE;
      clearJsonLd();
    };
  }, [meta]);
}
