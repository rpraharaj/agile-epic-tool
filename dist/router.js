// src/router.ts
import { createEpicHandler } from "./handlers/createEpic";
import { createFeaturesHandler } from "./handlers/createFeatures";
import { createStoriesHandler } from "./handlers/createStories";
import { addSingleFeatureHandler } from "./handlers/addSingleFeature";
import { addSingleStoryHandler } from "./handlers/addSingleStory";
import { rewriteContentHandler } from "./handlers/rewriteContent";
/**
 * Very minimal routing logic.
 */
export async function handleRequest(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method.toUpperCase();
    // Serve static files from public/ if using Wrangler site config
    // That automatically happens if site = { bucket = "./public" } is set
    // so let's route /api calls here, otherwise pass through to static.
    if (!pathname.startsWith("/api")) {
        // The Worker will serve static content automatically
        return;
    }
    // POST /api/create-epic
    if (method === "POST" && pathname === "/api/create-epic") {
        return await createEpicHandler(request, env);
    }
    // POST /api/create-features
    if (method === "POST" && pathname === "/api/create-features") {
        return await createFeaturesHandler(request, env);
    }
    // POST /api/create-stories
    if (method === "POST" && pathname === "/api/create-stories") {
        return await createStoriesHandler(request, env);
    }
    // POST /api/add-single-feature
    if (method === "POST" && pathname === "/api/add-single-feature") {
        return await addSingleFeatureHandler(request, env);
    }
    // POST /api/add-single-story
    if (method === "POST" && pathname === "/api/add-single-story") {
        return await addSingleStoryHandler(request, env);
    }
    // POST /api/rewrite-content
    if (method === "POST" && pathname === "/api/rewrite-content") {
        return await rewriteContentHandler(request, env);
    }
    // If no match
    return new Response("Not found", { status: 404 });
}
