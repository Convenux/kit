# Convenux kit

Code more than one Convenux app needs, in one place. Design tokens and chrome stay in
[`@convenux/design-system`](https://github.com/Convenux/design-system); this is behaviour.

## JavaScript — `@convenux/kit`

| import | what | used by |
|---|---|---|
| `@convenux/kit/i18n` | languages, `translator()` (`t`, `tn`), `negotiate`, `inLanguage`, `alternateLanguages`, `dateRange` | app, convenux.com, db.convenux.com |
| `@convenux/kit/catalogs` | `catalogProblems()`: phrases a catalog lacks, keeps for nothing, or breaks (Node, for tests) | the same three |
| `@convenux/kit/react` | `rich()`: elements inside a translated sentence | the two sites |
| `@convenux/kit/next/client` | `createI18n(loaders)` → `I18nProvider`, `useI18n`, `LanguageSwitch`; `PostHogInit` | the two sites |
| `@convenux/kit/next/proxy` | `languageProxy()`: one address, one language | the two sites |
| `@convenux/kit/logo` | `LogoFit`, `logoTile()`, `logoLook()`, `initials()` | all four |
| `@convenux/kit/og` | `inlineLogo()` (public addresses only), `coverStops()`, `oklch()` (Node) | the two sites |
| `@convenux/kit/signature` | `sign()` / `verify()` for `Convenux-Signature` (Web Crypto) | db.convenux.com, the newsletter worker |

```bash
npm test && npm run typecheck   # node:test, no build needed
npm publish                     # builds dist/ first
```

## PHP — `convenux/kit`

Required straight from this repository:

```json
"repositories": [{ "type": "vcs", "url": "https://github.com/Convenux/kit" }],
"require": { "convenux/kit": "^0.1" }
```

- `Convenux\Kit\Signature` — sign and verify `Convenux-Signature`.
- `Convenux\Kit\Identity\Resolver` — who is signing in: the linked identity, else the account
  with the same verified email, else a new one. Both the platform API and the app API sign
  people into the same `users` table through it.
- `Convenux\Kit\Identity\IsAccount` (on each app's `User`), `SocialAccount`, `VerifiedEmail`.
- `Convenux\Kit\Http\Etag` — an ETag from the body, and the 304.
- `Convenux\Kit\Http\Proxies::TRUSTED` — Cloudflare's ranges and Docker's private ones, for `trustProxies()`.
- `Convenux\Kit\Http\SingleValues` — middleware refusing a query parameter sent as a list (`q[]=x`) with a 422.

`fixtures/signature.json` holds test vectors both test suites check, so the two
implementations cannot drift apart.

```bash
composer install && vendor/bin/phpunit
```

JavaScript and PHP share one version: tag `vX.Y.Z`, then `npm publish`.
