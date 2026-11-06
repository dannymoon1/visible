import { Outfit, Figtree, IBM_Plex_Mono } from "next/font/google";

// The brand faces (CLAUDE.md → Type), shared by the public site and the apps:
// Outfit for headings (it matches the logo), Figtree for reading, Plex Mono
// for numbers and money.
export const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

export const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-plex-mono",
  display: "swap",
  // Only numbers use it, so don't hold up the first view
  preload: false,
});

export const brandFonts = `${outfit.variable} ${figtree.variable} ${plexMono.variable}`;
