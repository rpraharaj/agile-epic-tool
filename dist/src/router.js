"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleRequest = handleRequest;
// src/router.ts
const createEpic_1 = require("./handlers/createEpic");
const createFeatures_1 = require("./handlers/createFeatures");
const createStories_1 = require("./handlers/createStories");
const addSingleFeature_1 = require("./handlers/addSingleFeature");
const addSingleStory_1 = require("./handlers/addSingleStory");
const rewriteContent_1 = require("./handlers/rewriteContent");
/**
 * Very minimal routing logic.
 */
async function handleRequest(request, env) {
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
        return await (0, createEpic_1.createEpicHandler)(request, env);
    }
    // POST /api/create-features
    if (method === "POST" && pathname === "/api/create-features") {
        return await (0, createFeatures_1.createFeaturesHandler)(request, env);
    }
    // POST /api/create-stories
    if (method === "POST" && pathname === "/api/create-stories") {
        return await (0, createStories_1.createStoriesHandler)(request, env);
    }
    // POST /api/add-single-feature
    if (method === "POST" && pathname === "/api/add-single-feature") {
        return await (0, addSingleFeature_1.addSingleFeatureHandler)(request, env);
    }
    // POST /api/add-single-story
    if (method === "POST" && pathname === "/api/add-single-story") {
        return await (0, addSingleStory_1.addSingleStoryHandler)(request, env);
    }
    // POST /api/rewrite-content
    if (method === "POST" && pathname === "/api/rewrite-content") {
        return await (0, rewriteContent_1.rewriteContentHandler)(request, env);
    }
    // If no match
    return new Response("Not found", { status: 404 });
}
