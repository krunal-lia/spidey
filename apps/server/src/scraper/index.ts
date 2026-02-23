import * as cheerio from "cheerio";
import { createHash } from "crypto";

export interface ScrapeResult {
  text: string;
  hash: string;
  statusCode: number;
}

export async function scrapePage(url: string): Promise<ScrapeResult> {
  const response = await fetch(url, {
    headers: {
      // Mimic a real browser to avoid bot blocks on ticket sites
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
    signal: AbortSignal.timeout(15_000),
  });

  const html = await response.text();
  const $ = cheerio.load(html);

  // Remove noise: scripts, styles, hidden elements, nav/footer boilerplate
  $("script, style, noscript, [aria-hidden='true']").remove();
  $("nav, footer, header").remove();

  // Extract visible text, normalise whitespace
  const text = $("body")
    .text()
    .replace(/\s+/g, " ")
    .trim();

  const hash = createHash("sha256").update(text).digest("hex");

  return { text, hash, statusCode: response.status };
}

export function findKeywords(text: string, keywords: string): string[] {
  const keywordList = keywords
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);

  const lowerText = text.toLowerCase();
  return keywordList.filter((kw) => lowerText.includes(kw));
}
