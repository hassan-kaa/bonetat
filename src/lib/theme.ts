// The active color theme. Each theme (globals.css, [data-theme="…"]) sets the site's main color AND the
// logo's three gradient stops. To compare: change THEME, refresh. The static icons (browser tab, app icons)
// are images: regenerate them for the final choice.
export const THEMES = {
  orange: { browserBar: "#E2550F" },
  turquoise: { browserBar: "#0A6E7A" },
  sidibousaid: { browserBar: "#1747C8" },
  burgundy: { browserBar: "#8E1838" },
  violet: { browserBar: "#3B1CC9" },
} as const;

export type Theme = keyof typeof THEMES;

// Chosen 2026-10-11: turquoise (logo #35D6CF → #0A6E7A → #12A8AE). Other themes kept for comparison.
export const THEME: Theme = "turquoise";
