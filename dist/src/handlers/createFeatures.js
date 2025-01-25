"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFeaturesHandler = createFeaturesHandler;
// src/handlers/createFeatures.ts
const openRouter_1 = require("../services/openRouter");
const googleGemini_1 = require("../services/googleGemini");
const utils_1 = require("./utils");
async function createFeaturesHandler(request, env) {
    try {
        const body = await request.json();
        const epicDataStr = body.epicData || "";
        const apiChoice = body.apiChoice || "google_gemini";
        if (!epicDataStr.trim()) {
            return jsonError("No epic data received.");
        }
        let epicData;
        try {
            epicData = (0, utils_1.parseJsonOrThrow)(epicDataStr, "Invalid EPIC JSON");
        }
        catch (err) {
            return jsonError(err.message);
        }
        const prompt = `You are an expert in Agile methodology. Based on this EPIC JSON:\n` +
            `${JSON.stringify(epicData, null, 2)}\n\n` +
            `Generate multiple Features in strictly valid JSON:\n` +
            `{\n` +
            `  "features": [\n` +
            `    {\n` +
            `      "title": "",\n` +
            `      "id": "FEATURE-XYZ",\n` +
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
                llmResponse = await (0, googleGemini_1.googleGeminiApiCall)(prompt, 2000, apiKeys);
            }
            else {
                const apiKey = env.OPENROUTER_API_KEY;
                llmResponse = await (0, openRouter_1.openRouterApiCall)(prompt, 2000, apiKey);
            }
        }
        catch (err) {
            return jsonError(err.message, 500);
        }
        let featuresData;
        try {
            featuresData = (0, utils_1.parseJsonOrThrow)(llmResponse, "Features JSON from LLM");
        }
        catch (err) {
            return jsonError(err.message, 500);
        }
        if (!featuresData.features) {
            return jsonError("JSON missing 'features' key.");
        }
        return new Response(JSON.stringify({ success: true, data: featuresData.features }), { status: 200 });
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
