/**
 * Country -> flag key for the round flag drawn over a card thumbnail
 * (Figma: flag + country name bottom-left).
 *
 * The flag IMAGES are not here. Each `kh-flag-<key>` class carries its URL in
 * `sections/knowledge-hub/CountryBadge.astro`'s <style>, so a URL ships once
 * per Embed instead of once per card: with ~45 cards, an <img src> per flag
 * was enough to push the Resources paste from two parts to three.
 *
 * To add a country: put its Webflow asset URL in a new `.kh-flag-<key>` rule in
 * CountryBadge.astro and add the key here. A country with no entry renders no
 * badge (nothing breaks).
 *
 * `Global` has no flag of its own; the design overlaps several flags with no
 * name, so it maps to a list.
 */
export const flagKey: Record<string, string> = {
  India: 'india',
  UAE: 'uae',
  'Saudi Arabia': 'saudi-arabia',
  Malaysia: 'malaysia',
  Oman: 'oman',
  Europe: 'europe',
  France: 'france',
  Belgium: 'belgium',
  Philippines: 'philippines',
  Singapore: 'singapore',
  Spain: 'spain',
  Germany: 'germany',
};

/** Overlapped for `Global`, in draw order. */
export const globalFlagKeys: string[] = ['india', 'uae', 'malaysia', 'france'];
