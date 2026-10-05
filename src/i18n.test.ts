import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { alternateLanguages, dateRange, inLanguage, negotiate, translator } from "./i18n.ts";

describe("negotiate", () => {
  it("takes the browser's first language we speak, by weight", () => {
    assert.equal(negotiate("fr-CH, fr;q=0.9, en;q=0.8"), "fr");
    assert.equal(negotiate("ja, de;q=0.5, nl;q=0.7"), "nl");
    assert.equal(negotiate("es-MX, es;q=0.9"), "es");
    assert.equal(negotiate("it, pt;q=0.9"), "en");
    assert.equal(negotiate(null), "en");
  });
});

describe("translator", () => {
  it("falls back to English, hides a context, and counts the French way", () => {
    const { t, tn } = translator("fr", { "{count} editions": { one: "{count} édition", other: "{count} éditions" } });
    assert.equal(t("Browse"), "Browse");
    assert.equal(t("noun|Review"), "Review");
    assert.equal(t("Starts {when}", { when: "soon" }), "Starts soon");
    assert.equal(tn(0, "{count} edition", "{count} editions"), "0 édition");
    assert.equal(tn(1200, "{count} edition", "{count} editions"), "1\u202f200 éditions");
  });
});

describe("paths", () => {
  it("prefixes every language but English, anchors included", () => {
    assert.equal(inLanguage("/", "en"), "/");
    assert.equal(inLanguage("/", "nl"), "/nl");
    assert.equal(inLanguage("/#faq", "de"), "/de#faq");
    assert.equal(inLanguage("/browse", "es"), "/es/browse");
    assert.deepEqual(alternateLanguages("/support"), {
      en: "/support", nl: "/nl/support", de: "/de/support", fr: "/fr/support", es: "/es/support", "x-default": "/support",
    });
  });
});

describe("dateRange", () => {
  it("says a run of days once, in the locale's order, on the calendar day given", () => {
    assert.equal(dateRange("2026-10-23", "2026-10-25", "en-GB"), "23–25 October 2026");
    assert.equal(dateRange("2026-12-30", "2027-01-02", "en-GB"), "30 December 2026\u2009–\u20092 January 2027");
    assert.equal(dateRange("2026-10-23", null, "en-GB"), "23 October 2026");
    assert.equal(dateRange(null, "2026-10-25", "en-GB"), null);
  });
});
