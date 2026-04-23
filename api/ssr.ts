import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Readable } from "node:stream";

type ServerEntry = {
  fetch: (request: Request, env?: unknown, ctx?: { waitUntil?: (promise: Promise<unknown>) => void }) => Promise<Response>;
};

let cachedEntry: ServerEntry | null = null;

async function getServerEntry() {
  if (!cachedEntry) {
    const entryModule = await import(new URL("../dist/server/index.js", import.meta.url).toString());
    cachedEntry = (entryModule.default ?? entryModule) as ServerEntry;
  }

  return cachedEntry;
}

function toRequest(req: VercelRequest) {
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
  const body = method === "GET" || method === "HEAD" ? undefined : req;

  return new Request(url.toString(), {
    method,
    headers,
    body,
    duplex: body ? "half" : undefined,
  });
}

export const config = {
  runtime: "nodejs18.x",
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const entry = await getServerEntry();

  if (!entry?.fetch) {
    res.status(500).send("SSR entry not available.");
    return;
  }

  const request = toRequest(req);
  const response = await entry.fetch(request);

  res.statusCode = response.status;

  const headers = response.headers as unknown as { getSetCookie?: () => string[] };
  const setCookies = headers.getSetCookie?.();
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
