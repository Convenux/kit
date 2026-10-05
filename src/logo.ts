/**
 * How a mark sits in a square, read once by the platform for every client (`logo_fit`):
 * square or wide, whether it bleeds (an icon made to be masked), and the plate behind
 * it: `light`, `dark` or its own colour as #rrggbb.
 */
export type LogoFit = { square: boolean; bleed?: boolean; plate: string };

export type Plate = "light" | "dark" | `#${string}`;

/**
 * A logo in a square tile: on its plate, inset unless it bleeds. A known-wide wordmark gets
 * no square at all (null): shrunk into one it is unreadable. An unread logo (no fit) sits
 * whole and inset on light, which suits most marks.
 */
export function logoTile(fit: LogoFit | null | undefined): { plate: Plate; inset: boolean } | null {
  if (fit && !fit.square) return null;
  const plate = fit?.plate === "dark" ? "dark" : /^#[0-9a-f]{6}$/i.test(fit?.plate ?? "") ? (fit!.plate as Plate) : "light";
  return { plate, inset: !fit?.bleed };
}

/** `<img>` props for a tile, or null to draw initials. `dark` is the page's dark plate colour. */
export function logoLook(logo: string | null | undefined, fit: LogoFit | null | undefined, dark = "#121217") {
  const tile = logoTile(fit);
  if (!logo || !tile) return null;
  return {
    src: logo,
    style: {
      backgroundColor: tile.plate === "dark" ? dark : tile.plate === "light" ? "#ffffff" : tile.plate,
      objectFit: tile.inset ? ("contain" as const) : ("cover" as const),
      padding: tile.inset ? "8%" : 0,
    },
  };
}

/** Two letters for a name with no usable mark: "Dutch Comic Con" → "DC". */
export function initials(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "??";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[1]![0]!).toUpperCase();
}
