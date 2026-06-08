"use client";

import { useEffect } from "react";
import { polyfillCountryFlagEmojis } from "country-flag-emoji-polyfill";

/**
 * Windows doesn't ship country-flag emoji glyphs, so flags show as 2-letter
 * codes there. This injects the "Twemoji Country Flags" web font (flag glyphs
 * only) so flags render on every platform. Other text falls through to the
 * normal font stack.
 */
export default function FlagFont() {
  useEffect(() => {
    polyfillCountryFlagEmojis();
  }, []);

  return null;
}
