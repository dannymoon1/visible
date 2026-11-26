// Where a campaign's customers are (campaign creation plan, screen 5, built
// 26 Nov 2026). Places start from our cities, Uyo and Ikot Ekpene, and
// replace the old Country → Zone → State menus. Only Nigeria for now; other
// countries come back when we launch there. Shared by the builder and the
// server (src/app/api/campaigns/route.ts), so both accept the same places.
//
// Stored as tasks.target_city (null when the campaign covers a whole state
// or the country), tasks.target_state ("All" for anywhere in Nigeria), and
// target_zone and target_country filled in from the state.

import { ALL, REGIONS } from "./campaignOptions";

export const PLACE_COUNTRY = "Nigeria";

// city: null = the whole state; state: null = anywhere in Nigeria
export type Place = { city: string | null; state: string | null };

const NIGERIA = REGIONS[PLACE_COUNTRY] ?? {};

export const NIGERIAN_STATES: string[] = Object.values(NIGERIA).flat().sort((a, b) => a.localeCompare(b));

// Akwa Ibom's towns first (our starting market), then each state's capital
// and other big cities
export const CITIES: { city: string; state: string }[] = [
  { city: "Uyo", state: "Akwa Ibom" },
  { city: "Ikot Ekpene", state: "Akwa Ibom" },
  { city: "Eket", state: "Akwa Ibom" },
  { city: "Oron", state: "Akwa Ibom" },
  { city: "Abak", state: "Akwa Ibom" },
  { city: "Ikot Abasi", state: "Akwa Ibom" },
  { city: "Calabar", state: "Cross River" },
  { city: "Port Harcourt", state: "Rivers" },
  { city: "Lagos", state: "Lagos" },
  { city: "Abuja", state: "FCT (Abuja)" },
  { city: "Ibadan", state: "Oyo" },
  { city: "Kano", state: "Kano" },
  { city: "Kaduna", state: "Kaduna" },
  { city: "Enugu", state: "Enugu" },
  { city: "Owerri", state: "Imo" },
  { city: "Aba", state: "Abia" },
  { city: "Umuahia", state: "Abia" },
  { city: "Onitsha", state: "Anambra" },
  { city: "Awka", state: "Anambra" },
  { city: "Benin City", state: "Edo" },
  { city: "Warri", state: "Delta" },
  { city: "Asaba", state: "Delta" },
  { city: "Yenagoa", state: "Bayelsa" },
  { city: "Abakaliki", state: "Ebonyi" },
  { city: "Jos", state: "Plateau" },
  { city: "Ilorin", state: "Kwara" },
  { city: "Abeokuta", state: "Ogun" },
  { city: "Akure", state: "Ondo" },
  { city: "Osogbo", state: "Osun" },
  { city: "Ado-Ekiti", state: "Ekiti" },
  { city: "Makurdi", state: "Benue" },
  { city: "Lokoja", state: "Kogi" },
  { city: "Minna", state: "Niger" },
  { city: "Lafia", state: "Nasarawa" },
  { city: "Maiduguri", state: "Borno" },
  { city: "Yola", state: "Adamawa" },
  { city: "Bauchi", state: "Bauchi" },
  { city: "Gombe", state: "Gombe" },
  { city: "Jalingo", state: "Taraba" },
  { city: "Damaturu", state: "Yobe" },
  { city: "Sokoto", state: "Sokoto" },
  { city: "Katsina", state: "Katsina" },
  { city: "Birnin Kebbi", state: "Kebbi" },
  { city: "Dutse", state: "Jigawa" },
  { city: "Gusau", state: "Zamfara" },
];

// The chips shown first
export const QUICK_PLACES: { key: string; label: string; place: Place }[] = [
  { key: "uyo", label: "Uyo", place: { city: "Uyo", state: "Akwa Ibom" } },
  { key: "ikot-ekpene", label: "Ikot Ekpene", place: { city: "Ikot Ekpene", state: "Akwa Ibom" } },
  { key: "akwa-ibom", label: "Anywhere in Akwa Ibom", place: { city: null, state: "Akwa Ibom" } },
  { key: "nigeria", label: "Anywhere in Nigeria", place: { city: null, state: null } },
];

// New campaigns start in Uyo, our first city
export const DEFAULT_PLACE: Place = { city: "Uyo", state: "Akwa Ibom" };

export function samePlace(a: Place, b: Place): boolean {
  return a.city === b.city && a.state === b.state;
}

// "Uyo, Akwa Ibom", "Anywhere in Rivers", "Anywhere in Nigeria"
export function placeLabel(p: Place): string {
  if (p.city && p.state) return `${p.city}, ${p.state}`;
  if (p.state) return `Anywhere in ${p.state}`;
  return "Anywhere in Nigeria";
}

export function zoneOf(state: string): string | null {
  for (const [zone, states] of Object.entries(NIGERIA)) if (states.includes(state)) return zone;
  return null;
}

// A place from untrusted input, or null when it isn't one we know
export function checkPlace(city: unknown, state: unknown): Place | null {
  const s = typeof state === "string" && state && state !== ALL ? state : null;
  const c = typeof city === "string" && city ? city : null;
  if (s === null) return c === null ? { city: null, state: null } : null;
  if (!NIGERIAN_STATES.includes(s)) return null;
  if (c === null) return { city: null, state: s };
  return CITIES.some((x) => x.city === c && x.state === s) ? { city: c, state: s } : null;
}

// The task columns for a place
export function placeColumns(p: Place) {
  return {
    target_country: PLACE_COUNTRY,
    target_zone: p.state ? (zoneOf(p.state) ?? ALL) : ALL,
    target_state: p.state ?? ALL,
    target_city: p.city,
  };
}

// Search "Another city": cities and whole states, best matches first
export type PlaceOption = { key: string; label: string; detail: string; place: Place };

export const ALL_PLACE_OPTIONS: PlaceOption[] = [
  ...CITIES.map((c) => ({ key: `city:${c.city}`, label: c.city, detail: c.state, place: { city: c.city, state: c.state } })),
  ...NIGERIAN_STATES.map((s) => ({ key: `state:${s}`, label: `Anywhere in ${s}`, detail: "Whole state", place: { city: null, state: s } })),
];
