// src/index.ts
import { handleRequest } from "./router";

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    // If it's an /api route, handle it in handleRequest. Otherwise let static serve
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api")) {
      const response = await handleRequest(request, env);
      if (response) {
        return response;
      }
    }

    // Wrangler will automatically serve static assets for other paths
    // so just return a default 404 if not found:
    return new Response("Not found", { status: 404 });
  }
};
