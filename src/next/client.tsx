"use client";

import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { createContext, use, useEffect, useMemo, type ReactNode } from "react";

import { type Catalog, type I18n, isLanguage, type Language, LANGUAGES, NAMES, translator } from "../i18n.ts";

type Loaders = Record<Exclude<Language, "en">, () => Promise<{ default: Catalog }>>;

/**
 * The page's language for Client Components. Each catalog is its own chunk, fetched once,
 * rather than inlined into every page. Call it from the app's own "use client" module with
 * that app's catalog imports, and re-export the three pieces.
 */
export function createI18n(loaders: Loaders) {
  const Context = createContext<I18n>(translator("en", {}));
  const loaded = new Map<Language, Promise<Catalog>>();
  const none: Promise<Catalog> = Promise.resolve({});

  const catalog = (lang: Language): Promise<Catalog> => {
    if (lang === "en") return none;
    if (!loaded.has(lang)) loaded.set(lang, loaders[lang]().then((module) => module.default));
    return loaded.get(lang)!;
  };

  function I18nProvider({ lang, children }: { lang: Language; children: ReactNode }) {
    const words = use(catalog(lang));
    const value = useMemo(() => translator(lang, words), [lang, words]);
    return <Context value={value}>{children}</Context>;
  }

  const useI18n = (): I18n => use(Context);

  /** Every language, named in itself. Plain links through `/<lang>/…`, so the proxy stores the choice. */
  function LanguageSwitch() {
    const { lang, t } = useI18n();
    const parts = usePathname().split("/");
    const rest = (isLanguage(parts[1]) ? parts.slice(2) : parts.slice(1)).join("/");
    return (
      <nav aria-label={t("Language")}>
        <ul className="flex flex-wrap gap-4 text-[12.5px] font-semibold">
          {LANGUAGES.map((code) => (
            <li key={code}>
              <a
                href={`/${code}${rest ? `/${rest}` : ""}`}
                hrefLang={code}
                lang={code}
                aria-current={code === lang ? "true" : undefined}
                className={code === lang ? "text-fg" : "text-fg-4 hover:text-fg"}
              >
                {NAMES[code]}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  return { I18nProvider, useI18n, LanguageSwitch };
}

/**
 * Cookieless PostHog: nothing stored on the visitor's device, nobody identified,
 * no autocapture. Off without NEXT_PUBLIC_POSTHOG_KEY.
 */
export function PostHogInit({ apiKey, host }: { apiKey: string | undefined; host?: string }) {
  useEffect(() => {
    if (!apiKey || posthog.__loaded) return;
    posthog.init(apiKey, {
      api_host: host ?? "https://eu.i.posthog.com",
      cookieless_mode: "always",
      person_profiles: "identified_only",
      autocapture: false,
      capture_pageview: "history_change",
      capture_pageleave: true,
    });
  }, [apiKey, host]);
  return null;
}
