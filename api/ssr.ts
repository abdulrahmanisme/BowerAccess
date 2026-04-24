import { Readable } from "node:stream";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { IncomingMessage, ServerResponse } from "node:http";

type WaitUntilContext = {
  waitUntil?: (promise: Promise<unknown>) => void;
};

type ServerEntry = {
  fetch: (request: Request, env?: unknown, ctx?: WaitUntilContext) => Promise<Response>;
};

let cachedEntry: ServerEntry | null = null;

async function getServerEntry() {
  if (!cachedEntry) {
    const builtServerPath = path.join(process.cwd(), "dist/server/server.js");
    const entryUrl = pathToFileURL(builtServerPath).href;
    const entryModule = (await import(entryUrl)) as { default?: ServerEntry };
    cachedEntry = entryModule.default ?? (entryModule as unknown as ServerEntry);
  }

  return cachedEntry;
}

function toRequest(req: IncomingMessage & { url?: string; method?: string; headers: Record<string, string | string[] | undefined> }) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const forwardedHost = req.headers["x-forwarded-host"];
  const proto = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
  const host = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost;
  const resolvedProto = proto || "https";
  const resolvedHost = host || req.headers.host || "localhost";
  const url = new URL(req.url || "/", `${resolvedProto}://${resolvedHost}`);

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "undefined") continue;
    headers.set(key, Array.isArray(value) ? value.join(",") : value);
  }

  const method = req.method || "GET";
  const hasBody = method !== "GET" && method !== "HEAD";

  return new Request(url.toString(), {
    method,
    headers,
    body: hasBody ? (req as unknown as BodyInit) : undefined,
    duplex: hasBody ? "half" : undefined,
  });
}

export default async function handler(
  req: IncomingMessage & { url?: string; method?: string; headers: Record<string, string | string[] | undefined> },
  res: ServerResponse,
) {
  const entry = await getServerEntry();

  if (!entry?.fetch) {
    res.statusCode = 500;
    res.end("SSR entry not available.");
    return;
  }

  const request = toRequest(req);
  const response = await entry.fetch(request);

  res.statusCode = response.status;

  const headersWithSetCookie = response.headers as unknown as { getSetCookie?: () => string[] };
  const setCookies = headersWithSetCookie.getSetCookie?.();
  if (setCookies?.length) {
    res.setHeader("set-cookie", setCookies);
  }

  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") return;
    res.setHeader(key, value);
  });

  if (!response.body) {
    res.end();
    return;
  }

  const nodeStream = Readable.fromWeb(response.body as unknown as ReadableStream<Uint8Array>);
  nodeStream.pipe(res);
}
