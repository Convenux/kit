import { type NextRequest, NextResponse } from "next/server";

import { isLanguage, negotiate } from "../i18n.ts";

const YEAR = 60 * 60 * 24 * 365;

/**
 * One address, one language, so a shared cache can never hand a reader another's: an
 * address without a language is English; a reader whose `lang` cookie or browser asks for
 * another is redirected to `/<lang>/…` (uncached); `/en/…` goes back to the bare address.
 * Pages live under `app/[lang]`, so the English request is rewritten to `/en/…`.
 */
export function languageProxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const first = pathname.split("/")[1];
  const keep = (response: NextResponse, lang: string) => {
    if (request.cookies.get("lang")?.value !== lang) {
      response.cookies.set("lang", lang, {
        path: "/",
        maxAge: YEAR,
        sameSite: "lax",
        secure: request.nextUrl.protocol === "https:",
      });
    }
    return response;
  };

  if (first === "en") return keep(away(request, pathname.slice(3) || "/"), "en");
  if (isLanguage(first)) return keep(NextResponse.next(), first);

  const kept = request.cookies.get("lang")?.value;
  const lang = isLanguage(kept) ? kept : negotiate(request.headers.get("accept-language"));
  if (lang !== "en") return away(request, `/${lang}${pathname === "/" ? "" : pathname}`);
  return NextResponse.rewrite(new URL(`/en${pathname === "/" ? "" : pathname}${search}`, request.url));
}

function away(request: NextRequest, path: string): NextResponse {
  const response = NextResponse.redirect(new URL(`${path}${request.nextUrl.search}`, request.url));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
