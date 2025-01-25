"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addSingleStoryHandler = addSingleStoryHandler;
// src/handlers/addSingleStory.ts
const openRouter_1 = require("../services/openRouter");
const googleGemini_1 = require("../services/googleGemini");
const utils_1 = require("./utils");
async function addSingleStoryHandler(request, env) {
    try {
        const body = await request.json();
        const featureDataStr = body.featureData || "";
        const existingStoriesStr = body.existingStories || "[]";
        const apiChoice = body.apiChoice || "google_gemini";
        if (!featureDataStr.trim()) {
            return jsonError("No feature data received for single story generation.");
        }
        let featureData, existingStories;
        try {
            featureData = (0, utils_1.parseJsonOrThrow)(featureDataStr, "Invalid Feature JSON");
            existingStories = (0, utils_1.parseJsonOrThrow)(existingStoriesStr, "Existing stories JSON error");
        }
        catch (err) {
            return jsonError(err.message, 400);
        }
        const prompt = `We have a Feature and existing Stories. Generate exactly ONE new Story,\n` +
            `distinct from existing ones, that helps break down the feature into small tasks.\n` +
            `Return valid JSON:\n` +
            `{\n` +
            `  "title": "",\n` +
            `  "id": "STORY-XYZ",\n` +
            `  "description": "",\n` +
            `  "acceptance_criteria": ["Criterion 1"],\n` +
            `  "nfrs": ["NFR 1"]\n` +
            `}\n` +
            `No extra text.\n\n` +
            `FEATURE:\n${JSON.stringify(featureData, null, 2)}\n\n` +
            `EXISTING STORIES:\n${JSON.stringify(existingStories, null, 2)}`;
        let llmResponse;
        try {
            if (apiChoice === "google_gemini") {
                const apiKeys = env.GOOGLE_GEMINI_API_KEYS?.split(",") ?? [];
                llmResponse = await (0, googleGemini_1.googleGeminiApiCall)(prompt, 1000, apiKeys);
            }
            else {
                const apiKey = env.OPENROUTER_API_KEY;
                llmResponse = await (0, openRouter_1.openRouterApiCall)(prompt, 1000, apiKey);
            }
        }
        catch (err) {
            return jsonError(err.message, 500);
        }
        let newStory;
        try {
            newStory = (0, utils_1.parseJsonOrThrow)(llmResponse, "Single Story from LLM");
        }
        catch (err) {
            return jsonError(err.message, 500);
        }
        if (!newStory.title) {
            return jsonError("JSON missing 'title' for new Story.");
        }
        return new Response(JSON.stringify({ success: true, data: newStory }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    }
    catch (err) {
        return jsonError(err.message, 500);
    }
}
function jsonError(msg, status = 400) {
    return new Response(JSON.stringify({ success: false, data: msg }), {
        status,
        headers: { "Content-Type": "application/json" }
    });
}
