/**
 * Smart Import — AI-powered opportunity extraction
 *
 * Takes raw WhatsApp messages or URLs and uses Google Gemini to extract
 * structured opportunity data matching the admin form fields.
 */

import { SECTOR_LIST, type Sector, isValidSector } from "@/lib/sectors";

// ── Types ──────────────────────────────────────────────────────────────

export interface ExtractedOpportunity {
  title: string;
  description: string;
  category: "funding" | "events" | "hiring" | "news" | "something_new";
  sectors: Sector[];
  start_date: string; // YYYY-MM-DD or ""
  end_date: string;   // YYYY-MM-DD or ""
  is_rolling: boolean;
  external_link: string;
  details_bullets: string[];
  funding_stage: string;
  funding_amount: string;
  poster_image_url: string; // OG image or extracted image URL
}

export interface SmartImportResult {
  success: boolean;
  data: ExtractedOpportunity | null;
  error: string | null;
  rawResponse: string | null;
}

export interface ScrapeResult {
  success: boolean;
  text: string;
  title: string;
  ogImage: string;
  error: string | null;
}

// ── URL Detection ──────────────────────────────────────────────────────

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;

export function extractUrls(text: string): string[] {
  const matches = text.match(URL_REGEX);
  return matches ? [...new Set(matches)] : [];
}

export function hasUrl(text: string): boolean {
  return URL_REGEX.test(text);
}

// ── URL Scraping (via Netlify Function) ────────────────────────────────

export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  try {
    const response = await fetch("/.netlify/functions/scrape-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return { success: false, text: "", title: "", ogImage: "", error: errText || `HTTP ${response.status}` };
    }

    const data = await response.json();
    return {
      success: true,
      text: data.text || "",
      title: data.title || "",
      ogImage: data.ogImage || "",
      error: null,
    };
  } catch (err) {
    return {
      success: false,
      text: "",
      title: "",
      ogImage: "",
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

// ── Gemini AI Extraction ───────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an assistant that extracts structured opportunity data from raw text.
The opportunity is typically a FUNDING opportunity (grants, accelerators, VC programs) or an EVENT (conferences, workshops, meetups, hackathons), but can also be hiring, news, or something_new.

Given the following text, extract these fields:
- title: string — name of the fund, event, or opportunity
- description: string — 2-3 sentence summary of the opportunity
- category: one of "funding", "events", "hiring", "news", "something_new"
- sectors: array of matching sector tags. VERY IMPORTANT — read sector rules below.
- start_date: ISO date YYYY-MM-DD or null if unknown
- end_date: ISO date YYYY-MM-DD or null if unknown (this is the deadline or end of event)
- is_rolling: boolean — true if the deadline is described as "rolling", "ongoing", "open", or has no specific end date
- external_link: the most relevant URL for applying/registering, or null
- details_bullets: array of key facts as short strings (location, prize money, eligibility, cohort size, ticket price, etc.)
- startup_stage: string or null — target startup maturity stage. Allowed values: "Idea", "Pre-Seed", "Seed", "Series A", "Series B+", "Growth", "Any Stage"
- funding_amount: string or null — for funding category only (e.g., "₹50L", "$100K", "Up to ₹1Cr")
- poster_image_url: string or null — if there's an obvious image URL for the poster/banner

=== SECTOR TAGGING RULES (CRITICAL) ===
You MUST assign 1-5 sector tags from ONLY this list: ${SECTOR_LIST.join(", ")}.

SECTOR MAPPING GUIDE — use these heuristics to assign the correct sectors:
- "All Sector" → use this ONLY if no specific sector clearly applies 
- "Agritech" → agriculture, farming, crop tech, agri supply chain, farm-to-fork, precision farming
- "AI" → artificial intelligence, machine learning, LLMs, NLP, computer vision, GenAI, data science, deep learning
- "Cleantech" → clean energy, sustainability, green tech, waste management, recycling, circular economy, carbon credits
- "Climatetech" → climate change, carbon capture, environmental tech, climate adaptation, climate resilience
- "Deeptech" → hardware, semiconductors, quantum computing, robotics, advanced materials, biotech, nanotech
- "Ecommerce" → online retail, D2C brands, marketplaces, digital commerce, shopping platforms
- "Edtech" → education technology, learning platforms, online courses, skill development, EdTech
- "Energy" → solar, wind, battery storage, EV charging, power grid, oil & gas, renewable energy
- "Fintech" → payments, banking, insurance tech, lending, neobanks, credit, UPI, blockchain finance, wealth management
- "Food Beverage" → food delivery, restaurants, FMCG food brands, beverages, food processing, cloud kitchens
- "Gaming" → video games, game studios, esports, game development, metaverse gaming
- "Govtech" → government technology, public sector innovation, civic tech, digital governance, e-governance
- "Healthtech" → healthcare, medtech, telemedicine, health data, pharma, medical devices, wellness tech, mental health
- "Hrtech" → HR technology, talent management, recruitment tech, employee engagement, payroll
- "Legaltech" → legal technology, contract management, compliance tech, law practice management
- "Logistics" → supply chain, warehousing, freight, delivery, shipping, last-mile delivery
- "Manufacturing" → industrial tech, factory automation, Industry 4.0, production, 3D printing
- "Media Entertainment" → content creation, streaming, OTT, music, film, publishing, news media, advertising
- "Mobility" → transportation, ride-hailing, autonomous vehicles, electric vehicles, urban mobility, micro-mobility
- "Proptech" → real estate tech, property management, construction tech, smart buildings, co-living
- "Retail" → brick-and-mortar retail, retail analytics, point of sale, retail operations
- "Spacetech" → satellites, space exploration, aerospace, launch vehicles, space data
- "Sportstech" → sports analytics, fitness tech, sports management, athlete tech, sports streaming
- "Travel Hospitality" → travel booking, hotels, tourism, travel tech, hospitality management
- "Web3" → blockchain, crypto, NFTs, DeFi, DAOs, decentralized apps, tokenization
- "Other" → use this ONLY if no specific sector clearly applies

SECTOR ASSIGNMENT RULES:
1. ALWAYS assign at least 1 sector. Use "Other" only as absolute last resort.
2. If the opportunity is an accelerator/incubator, ALWAYS include "Accelerator" AND the domain sector(s).
3. Multi-sector tagging is encouraged — e.g., a solar energy startup accelerator should get ["Accelerator", "Energy", "Cleantech"].
4. Read the entire text carefully for sector clues — company names, industry mentions, target audience, keywords.
5. If the opportunity is sector-agnostic (open to all startups), use ["Accelerator"] for funding or ["Other"] for events.

=== GENERAL RULES ===
1. Dates: Today's date is ${new Date().toISOString().split("T")[0]}. Parse relative dates like "next Friday", "June 15", "15th June 2026" into YYYY-MM-DD format.
2. Currency: Preserve the original currency format (₹, $, etc.)
3. If the text mentions multiple opportunities, extract ONLY the primary/first one.
4. For events: include venue, time, and attendance details in details_bullets.
5. For funding: include eligibility criteria, stage requirements in details_bullets.
6. Respond ONLY with valid JSON. No markdown fencing, no explanation, no extra text.`;

function buildExtractionPrompt(rawText: string, scrapedContent?: string): string {
  let content = "";

  if (scrapedContent) {
    content += `=== SCRAPED PAGE CONTENT ===\n${scrapedContent.slice(0, 8000)}\n\n`;
  }

  content += `=== RAW INPUT ===\n${rawText.slice(0, 4000)}`;

  return `${SYSTEM_PROMPT}\n\n${content}`;
}

function parseGeminiResponse(text: string): ExtractedOpportunity | null {
  // Strip markdown fencing if present
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }

  try {
    const parsed = JSON.parse(cleaned);

    // Validate and sanitize sectors with fuzzy matching
    const rawSectors: string[] = Array.isArray(parsed.sectors)
      ? parsed.sectors.map((s: unknown) => String(s).trim()).filter(Boolean)
      : [];
    const validSectors = rawSectors
      .map((s) => {
        // Exact match first
        if (isValidSector(s)) return s as Sector;
        // Case-insensitive match
        const lower = s.toLowerCase().replace(/[\s_-]+/g, "");
        const match = SECTOR_LIST.find(
          (sector) => sector.toLowerCase().replace(/[\s_-]+/g, "") === lower,
        );
        return match || null;
      })
      .filter((s): s is Sector => s !== null)
      .filter((s, i, arr) => arr.indexOf(s) === i) // dedupe
      .slice(0, 5);

    // Ensure at least one sector per prompt rules
    const finalSectors = validSectors.length > 0 ? validSectors : (["Other"] as Sector[]);

    return {
      title: String(parsed.title || "").trim(),
      description: String(parsed.description || "").trim(),
      category: ["funding", "events", "hiring", "news", "something_new"].includes(parsed.category)
        ? parsed.category
        : "events",
      sectors: finalSectors,
      start_date: parseDateField(parsed.start_date),
      end_date: parseDateField(parsed.end_date),
      is_rolling: Boolean(parsed.is_rolling),
      external_link: String(parsed.external_link || "").trim(),
      details_bullets: Array.isArray(parsed.details_bullets)
        ? parsed.details_bullets.map((b: unknown) => String(b).trim()).filter(Boolean)
        : [],
      funding_stage: parsed.funding_stage ? String(parsed.funding_stage).trim() : "",
      funding_amount: parsed.funding_amount ? String(parsed.funding_amount).trim() : "",
      poster_image_url: String(parsed.poster_image_url || "").trim(),
    };
  } catch {
    return null;
  }
}

function parseDateField(value: unknown): string {
  if (!value || value === "null") return "";
  const str = String(value).trim();
  // Validate YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  // Try parsing other date formats
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }
  return "";
}

const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";
const GEMINI_MODEL_STORAGE = "bower_gemini_model";

export function getGeminiModel(): string {
  return localStorage.getItem(GEMINI_MODEL_STORAGE) || DEFAULT_GEMINI_MODEL;
}

export function setGeminiModel(model: string) {
  localStorage.setItem(GEMINI_MODEL_STORAGE, model.trim());
}

export async function extractWithGemini(
  rawText: string,
  apiKey: string,
  scrapedContent?: string,
): Promise<SmartImportResult> {
  const prompt = buildExtractionPrompt(rawText, scrapedContent);
  const model = getGeminiModel();

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
          },
        }),
      },
    );

    if (!response.ok) {
      const errBody = await response.text();
      return {
        success: false,
        data: null,
        error: `Gemini API error (${response.status}): ${errBody.slice(0, 200)}`,
        rawResponse: errBody,
      };
    }

    const json = await response.json();
    const rawOutput = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const extracted = parseGeminiResponse(rawOutput);
    if (!extracted) {
      return {
        success: false,
        data: null,
        error: "Could not parse AI response into structured data.",
        rawResponse: rawOutput,
      };
    }

    return { success: true, data: extracted, error: null, rawResponse: rawOutput };
  } catch (err) {
    return {
      success: false,
      data: null,
      error: err instanceof Error ? err.message : "Unknown error calling Gemini",
      rawResponse: null,
    };
  }
}

// ── Poster Download & Upload ───────────────────────────────────────────

/**
 * Download an external image via proxy and upload it to Supabase Storage.
 * Returns the Supabase public URL on success, or null on failure.
 */
export async function downloadAndUploadPoster(
  imageUrl: string,
  supabaseClient: {
    storage: {
      from: (bucket: string) => {
        upload: (path: string, file: Blob, options?: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
        getPublicUrl: (path: string) => { data: { publicUrl: string } };
      };
    };
  },
): Promise<{ url: string | null; error: string | null }> {
  if (!imageUrl || imageUrl.trim() === "") {
    return { url: null, error: null }; // No image to download — not an error
  }

  try {
    // Step 1: Download the image via the proxy function
    const proxyResponse = await fetch("/.netlify/functions/proxy-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: imageUrl }),
    });

    if (!proxyResponse.ok) {
      let errorMsg = `Proxy returned HTTP ${proxyResponse.status}`;
      try {
        const errJson = await proxyResponse.json();
        errorMsg = errJson.error || errorMsg;
      } catch {
        // couldn't parse error JSON
      }
      return { url: null, error: errorMsg };
    }

    const contentType = proxyResponse.headers.get("content-type") || "image/jpeg";
    const imageBlob = await proxyResponse.blob();

    if (imageBlob.size === 0) {
      return { url: null, error: "Downloaded image is empty" };
    }

    // Step 2: Determine file extension from content type
    const extMap: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/webp": "webp",
      "image/svg+xml": "svg",
      "image/avif": "avif",
    };
    const extension = extMap[contentType] || "jpg";

    // Step 3: Upload to Supabase Storage
    const filePath = `opportunities/${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabaseClient.storage
      .from("opportunity-posters")
      .upload(filePath, imageBlob, {
        upsert: false,
        cacheControl: "3600",
        contentType,
      });

    if (uploadError) {
      return { url: null, error: `Upload failed: ${uploadError.message}` };
    }

    // Step 4: Get public URL
    const { data } = supabaseClient.storage
      .from("opportunity-posters")
      .getPublicUrl(filePath);

    return { url: data.publicUrl, error: null };
  } catch (err) {
    return {
      url: null,
      error: err instanceof Error ? err.message : "Failed to download poster image",
    };
  }
}

// ── Full Pipeline ──────────────────────────────────────────────────────

export async function runSmartImport(
  rawInput: string,
  geminiApiKey: string,
  onProgress?: (step: string) => void,
): Promise<SmartImportResult & { ogImage?: string }> {
  const urls = extractUrls(rawInput);
  let scrapedContent = "";
  let ogImage = "";

  // If URLs found, try to scrape the first one for richer content
  if (urls.length > 0) {
    onProgress?.(`Scraping ${urls[0]}...`);
    const scrapeResult = await scrapeUrl(urls[0]);
    if (scrapeResult.success) {
      scrapedContent = scrapeResult.text;
      ogImage = scrapeResult.ogImage;
    }
    // If scraping fails, we still proceed with the raw text
  }

  onProgress?.("Extracting opportunity details with AI...");
  const result = await extractWithGemini(rawInput, geminiApiKey, scrapedContent || undefined);

  // If we got an OG image and the AI didn't find one, use the scraped one
  if (result.success && result.data) {
    if (!result.data.poster_image_url && ogImage) {
      result.data.poster_image_url = ogImage;
    }
    // If AI didn't find an external link but we have URLs from the raw text, use the first one
    if (!result.data.external_link && urls.length > 0) {
      result.data.external_link = urls[0];
    }
  }

  return { ...result, ogImage };
}
