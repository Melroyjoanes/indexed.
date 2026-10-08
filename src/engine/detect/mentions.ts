/**
 * Finding companies in an answer.
 *
 * 1. Hide look-alike names first (Corvane Logistics is a different company),
 *    keeping the text the same length so positions still line up.
 * 2. Match each company's name, spelling variants and website, allowing an
 *    optional space or hyphen between letters ("Route Lyne", "Route-Lyne").
 * 3. Catch unlisted misspellings ("Corvaine") by comparing capitalised words
 *    of six or more letters with each company's name.
 *
 * Citations are never passed in here: a company that only appears in the
 * sources doesn't count as mentioned.
 */
import type { Settings } from "../types";
import { similarity } from "./similarity";

export const MASK_CHAR = "░";

export interface Hit {
  brand: string;
  start: number;
  end: number;
  surface: string;
  how: "name" | "website" | "fuzzy";
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Letters of a name with an optional space or hyphen allowed between each. */
function flex(word: string): string {
  return [...word.replace(/[\s-]/g, "")].map(escape).join("[\\s\\-]?");
}

interface BrandPatterns {
  key: string;
  name: RegExp;
  lookalikes: RegExp[];
}

const cache = new WeakMap<Settings, BrandPatterns[]>();

function patterns(settings: Settings): BrandPatterns[] {
  const hit = cache.get(settings);
  if (hit) return hit;
  const out = Object.values(settings.brands).map((b) => {
    const domain = b.website.toLowerCase().replace(/^www\./, "");
    const stem = domain.split(".")[0] ?? "";
    const short = b.name.split(/\s+/)[0] ?? b.name;
    const variants = [b.name, short, b.name.replace(/ /g, ""), stem, domain, ...b.aliases].filter(
      Boolean,
    );
    const unique = [...new Set(variants)].sort((x, y) => y.length - x.length);
    const alt = unique.map((v) => (v.includes(".") ? escape(v) : flex(v))).join("|");
    return {
      key: b.key,
      name: new RegExp(`(?<![A-Za-z0-9])(?:${alt})(?![A-Za-z0-9])`, "gi"),
      lookalikes: b.lookalikes.map(
        (l) => new RegExp(`(?<![A-Za-z0-9])${flex(l)}(?![A-Za-z0-9])`, "gi"),
      ),
    };
  });
  cache.set(settings, out);
  return out;
}

/** Replaces look-alike company names with placeholder characters of the same length. */
export function maskLookalikes(text: string, settings: Settings): string {
  // work on UTF-16 indices to stay aligned with RegExp indices
  const out = text.split("");
  for (const p of patterns(settings)) {
    for (const rx of p.lookalikes) {
      for (const m of text.matchAll(rx)) {
        for (let i = m.index; i < m.index + m[0].length; i++) out[i] = MASK_CHAR;
      }
    }
  }
  return out.join("");
}

const WORD = /[A-Za-z][A-Za-z-]{4,}/g;

function fuzzyHits(masked: string, settings: Settings, taken: [number, number][]): Hit[] {
  const hits: Hit[] = [];
  const stems = Object.values(settings.brands).map((b) => ({
    key: b.key,
    stem: (b.name.split(/\s+/)[0] ?? "").toLowerCase(),
  }));
  for (const m of masked.matchAll(WORD)) {
    const w = m[0];
    if (!/[A-Z]/.test(w[0]!) || w.length < 6) continue;
    if (taken.some(([s, e]) => s <= m.index && m.index < e)) continue;
    const lw = w.toLowerCase();
    for (const { key, stem } of stems) {
      if (stem.length < 6 || lw === stem) continue;
      if (lw.slice(0, 3) === stem.slice(0, 3) && similarity(lw, stem) >= 0.8) {
        hits.push({
          brand: key,
          start: m.index,
          end: m.index + w.length,
          surface: w,
          how: "fuzzy",
        });
        break;
      }
    }
  }
  return hits;
}

export function findMentions(text: string, settings: Settings): { hits: Hit[]; masked: string } {
  const masked = maskLookalikes(text, settings);
  const hits: Hit[] = [];
  for (const p of patterns(settings)) {
    for (const m of masked.matchAll(p.name)) {
      hits.push({
        brand: p.key,
        start: m.index,
        end: m.index + m[0].length,
        surface: text.slice(m.index, m.index + m[0].length),
        how: m[0].includes(".") ? "website" : "name",
      });
    }
  }
  hits.push(
    ...fuzzyHits(
      masked,
      settings,
      hits.map((h) => [h.start, h.end]),
    ),
  );
  hits.sort((a, b) => a.start - b.start);
  return { hits, masked };
}

/** 1 for the first company named, 2 for the next new one, and so on. */
export function positions(hits: Hit[]): Map<string, number> {
  const order = new Map<string, number>();
  for (const h of hits) if (!order.has(h.brand)) order.set(h.brand, order.size + 1);
  return order;
}
