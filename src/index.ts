import { handleRequest } from "./router";
import { getAssetFromKV, serveSinglePageApp } from '@cloudflare/kv-asset-handler';

interface Env {
  ENVIRONMENT: string;
  __STATIC_CONTENT: KVNamespace;
  __STATIC_CONTENT_MANIFEST: string;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    console.log("ENV KEYS =>", Object.keys(env));

    try {
      const url = new URL(request.url);

      // API Routes
      if (url.pathname.startsWith("/api")) {
        const response = await handleRequest(request, env);
        return response || new Response("Not found", { status: 404 });
      }

      // Static Assets with SPA fallback
      return await getAssetFromKV(
        {
          request,
          waitUntil: ctx.waitUntil.bind(ctx),
        },
        {
          ASSET_NAMESPACE: env.__STATIC_CONTENT,
          ASSET_MANIFEST: env.__STATIC_CONTENT_MANIFEST,
          mapRequestToAsset: serveSinglePageApp // 👈 Critical for SPAs
        }
      );
    } catch (e) {
      // Custom 404 handling
      return new Response("Page not found", { 
        status: 404,
        headers: { "Content-Type": "text/html" }
      });
    }
  },
};