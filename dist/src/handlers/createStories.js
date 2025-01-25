"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStoriesHandler = createStoriesHandler;
// src/handlers/createStories.ts
const openRouter_1 = require("../services/openRouter");
const googleGemini_1 = require("../services/googleGemini");
const utils_1 = require("./utils");
async function createStoriesHandler(request, env) {
    try {
        const body = await request.json();
        const featureDataStr = body.featureData || "";
        const apiChoice = body.apiChoice || "google_gemini";
        if (!featureDataStr.trim()) {
            return jsonError("No feature data received.");
        }
        let featureData;
        try {
            featureData = (0, utils_1.parseJsonOrThrow)(featureDataStr, "Invalid Feature JSON");
        }
        catch (err) {
            return jsonError(err.message, 400);
        }
        const prompt = `You are an expert in Agile methodology. Based on this FEATURE JSON:\n` +
            `${JSON.stringify(featureData, null, 2)}\n\n` +
            `Generate multiple user stories in strictly valid JSON:\n` +
            `{\n` +
            `  "stories": [\n` +
            `    {\n` +
            `      "title": "",\n` +
            `      "id": "STORY-XYZ",\n` +
            `      "description": "",\n` +
            `      "acceptance_criteria": ["Criterion 1"],\n` +
            `      "nfrs": ["NFR 1"]\n` +
            `    }\n` +
            `  ]\n` +
            `}\n` +
            `Return only JSON, no extra text.`;
        let llmResponse;
        try {
            if (apiChoice === "google_gemini") {
                const apiKeys = env.GOOGLE_GEMINI_API_KEYS?.split(",") ?? [];
                llmResponse = await (0, googleGemini_1.googleGeminiApiCall)(prompt, 1500, apiKeys);
            }
            else {
                const apiKey = env.OPENROUTER_API_KEY;
                llmResponse = await (0, openRouter_1.openRouterApiCall)(prompt, 1500, apiKey);
            }
        }
        catch (err) {
            return jsonError(err.message, 500);
        }
        let storiesData;
        try {
            storiesData = (0, utils_1.parseJsonOrThrow)(llmResponse, "Stories JSON from LLM");
        }
        catch (err) {
            return jsonError(err.message, 500);
        }
        if (!storiesData.stories) {
            return jsonError("JSON missing 'stories' key.");
        }
        return new Response(JSON.stringify({ success: true, data: storiesData.stories }), { status: 200 });
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
