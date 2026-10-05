/**
 * Every phrase is keyed by its English, gettext-style: `t("Browse editions")` reads as
 * English where it is written, and anything a catalog lacks falls back to it. One English
 * word with two meanings takes a context, `t("noun|Review")`, that English never shows.
 * React-free, so a proxy, a Server Component and the phone app can all import it.
 */
export const LANGUAGES = ["en", "nl", "de", "fr", "es"] as const;
export type Language = (typeof LANGUAGES)[number];

export const isLanguage = (value: unknown): value is Language => LANGUAGES.includes(value as Language);

/** For Intl. English keeps British dates. */
export const LOCALES: Record<Language, string> = { en: "en-GB", nl: "nl-NL", de: "de-DE", fr: "fr-FR", es: "es-ES" };

/** Each language in itself, for a switcher. */
export const NAMES: Record<Language, string> = { en: "English", nl: "Nederlands", de: "Deutsch", fr: "Français", es: "Español" };

export type Catalog = Record<string, string | { one: string; other: string }>;
export type Vars = Record<string, string | number>;

/** The first language an Accept-Language header asks for that we speak, by its q-weights. */
export function negotiate(header: string | null | undefined): Language {
  const asked = (header ?? "")
    .split(",")
    .map((part) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { lang: tag.trim().slice(0, 2).toLowerCase(), q: q ? Number(q.trim().slice(2)) : 1 };
    })
    .filter((item) => item.q > 0)
    .sort((a, b) => b.q - a.q);
  return (asked.find((item) => isLanguage(item.lang))?.lang as Language | undefined) ?? "en";
}

/** Marks an English phrase for the catalogs without translating it (gettext's N_). */
export const msg = (english: string): string => english;

/** `t`, `tn`, the language and its Intl locale. */
export function translator(lang: Language, catalog: Catalog) {
  const locale = LOCALES[lang];
  const fill = (phrase: string, vars?: Vars) =>
    vars ? phrase.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole)) : phrase;
  // Not Intl.PluralRules, which Hermes does not ship everywhere. French counts 0 as one.
  const isOne = (count: number) => count === 1 || (lang === "fr" && count === 0);

  return {
    lang,
    locale,
    /** `t("Starts {when}", { when })`. */
    t(english: string, vars?: Vars): string {
      const entry = catalog[english];
      return fill(typeof entry === "string" ? entry : english.slice(english.indexOf("|") + 1), vars);
    },
    /** `tn(n, "{count} edition", "{count} editions")`: keyed by the plural; `count` is filled in. */
    tn(count: number, one: string, other: string, vars?: Vars): string {
      const entry = catalog[other];
      const forms = typeof entry === "object" ? entry : { one, other };
      return fill(isOne(count) ? forms.one : forms.other, { count: count.toLocaleString(locale), ...vars });
    },
  };
}

export type I18n = ReturnType<typeof translator>;

/** A site path in one language: English has no prefix. "/#faq" becomes "/nl#faq". */
export const inLanguage = (path: string, lang: Language): string =>
  lang === "en" ? path : path === "/" || path.startsWith("/#") ? `/${lang}${path.slice(1)}` : `/${lang}${path}`;

/** A page in every language, for `hreflang` alternates; the unprefixed English is the default. */
export function alternateLanguages(path: string): Record<Language | "x-default", string> {
  return {
    ...(Object.fromEntries(LANGUAGES.map((code) => [code, inLanguage(path, code)])) as Record<Language, string>),
    "x-default": path,
  };
}

/** "2026-10-23" or an ISO instant as a Date; a bare date is midnight UTC. */
export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * A run of calendar days as one phrase in the locale's own order: "23–25 October 2026",
 * "23.–25. Oktober 2026". Dates are calendar days, so they are formatted in UTC.
 */
export function dateRange(
  from: string | null | undefined,
  to: string | null | undefined,
  locale: string,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" },
): string | null {
  const start = parseDate(from);
  if (!start) return null;
  const end = parseDate(to) ?? start;
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).formatRange(start, end < start ? start : end);
}
