/**
 * Netlify Function: scrape-url
 *
 * Fetches the content of a URL and extracts text, title, and OG image.
 * Used by the Smart Import feature to bypass browser CORS restrictions.
 */

import type { Context } from "@netlify/functions";

interface ScrapeRequest {
  url: string;
}

interface ScrapeResponse {
  text: string;
  title: string;
  ogImage: string;
}

function extractMetaContent(html: string, property: string): string {
  // Match both property= and name= attributes
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${property}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function extractTitle(html: string): string {
  const ogTitle = extractMetaContent(html, "og:title");
  if (ogTitle) return ogTitle;

  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return titleMatch?.[1]?.trim() || "";
}

function extractOgImage(html: string): string {
  return extractMetaContent(html, "og:image") || extractMetaContent(html, "twitter:image");
}

function htmlToText(html: string): string {
  let text = html;

  // Remove script and style blocks
  text = text.replace(/<script[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<noscript[\s\S]*?<\/noscript>/gi, "");

  // Convert common elements to readable text
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n\n");
  text = text.replace(/<\/div>/gi, "\n");
  text = text.replace(/<\/h[1-6]>/gi, "\n\n");
  text = text.replace(/<li[^>]*>/gi, "• ");
  text = text.replace(/<\/li>/gi, "\n");

  // Strip remaining HTML tags
  text = text.replace(/<[^>]+>/g, " ");

  // Decode common HTML entities
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/&#x27;/g, "'");
  text = text.replace(/&#x2F;/g, "/");
  text = text.replace(/&rsquo;/g, "'");
  text = text.replace(/&lsquo;/g, "'");
  text = text.replace(/&rdquo;/g, '"');
  text = text.replace(/&ldquo;/g, '"');
  text = text.replace(/&mdash;/g, "—");
  text = text.replace(/&ndash;/g, "–");

  // Clean up whitespace
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.trim();

  // Limit to ~10K chars to avoid overwhelming the AI
  return text.slice(0, 10000);
}

export default async (request: Request, _context: Context) => {
  // Only allow POST
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await request.json()) as ScrapeRequest;
    const { url } = body;

    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "Missing 'url' in request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid URL" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Only allow HTTP/HTTPS
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return new Response(JSON.stringify({ error: "Only HTTP/HTTPS URLs are supported" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch the URL with a reasonable timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const fetchResponse = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BowerAccess/1.0; +https://boweraccess.com)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      redirect: "follow",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!fetchResponse.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch URL: HTTP ${fetchResponse.status}` }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    const contentType = fetchResponse.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      // For non-HTML content, return what we can
      const text = await fetchResponse.text();
      return new Response(
        JSON.stringify({ text: text.slice(0, 10000), title: "", ogImage: "" } satisfies ScrapeResponse),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const html = await fetchResponse.text();

    const result: ScrapeResponse = {
      text: htmlToText(html),
      title: extractTitle(html),
      ogImage: extractOgImage(html),
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const isAbort = message.includes("abort");

    return new Response(
      JSON.stringify({ error: isAbort ? "Request timed out (10s limit)" : message }),
      { status: isAbort ? 504 : 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
