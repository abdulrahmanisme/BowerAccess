/**
 * Netlify Function: proxy-image
 *
 * Downloads an image from a URL and returns it as binary.
 * Used by Smart Import to fetch OG images from external sites,
 * bypassing browser CORS restrictions, so they can be uploaded
 * to Supabase Storage.
 */

import type { Context } from "@netlify/functions";

export default async (request: Request, _context: Context) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const { url } = body as { url?: string };

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

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return new Response(JSON.stringify({ error: "Only HTTP/HTTPS URLs are supported" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch the image
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const imageResponse = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BowerAccess/1.0; +https://boweraccess.com)",
        "Accept": "image/*,*/*;q=0.8",
      },
      redirect: "follow",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!imageResponse.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch image: HTTP ${imageResponse.status}` }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    const contentType = imageResponse.headers.get("content-type") || "image/jpeg";

    // Verify it's actually an image
    if (!contentType.startsWith("image/")) {
      return new Response(
        JSON.stringify({ error: `URL did not return an image (got ${contentType})` }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Check size — max 5MB
    const contentLength = imageResponse.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "Image is too large (max 5MB)" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const imageBuffer = await imageResponse.arrayBuffer();

    // Double-check size after download
    if (imageBuffer.byteLength > 5 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "Image is too large (max 5MB)" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Return the image binary with correct content type
    return new Response(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "X-Original-Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const isAbort = message.includes("abort");

    return new Response(
      JSON.stringify({ error: isAbort ? "Image download timed out (15s)" : message }),
      { status: isAbort ? 504 : 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
