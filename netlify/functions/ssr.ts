import path from "node:path";
import { pathToFileURL } from "node:url";

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
    try {
      const entryModule = (await import(entryUrl)) as { default?: ServerEntry };
      cachedEntry = entryModule.default ?? (entryModule as unknown as ServerEntry);
    } catch (error) {
      console.error("Failed to load server entry:", error);
      throw error;
    }
  }

  return cachedEntry;
}

export default async (request: Request) => {
  try {
    const entry = await getServerEntry();

    if (!entry?.fetch) {
      console.error("SSR entry not available");
      return new Response("Internal Server Error", { status: 500 });
    }

    const response = await entry.fetch(request);
    return response;
  } catch (error) {
    console.error("SSR Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
};
