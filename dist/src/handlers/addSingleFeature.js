"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addSingleFeatureHandler = addSingleFeatureHandler;
// src/handlers/addSingleFeature.ts
const openRouter_1 = require("../services/openRouter");
const googleGemini_1 = require("../services/googleGemini");
const utils_1 = require("./utils");
async function addSingleFeatureHandler(request, env) {
    try {
        const body = await request.json();
        const epicDataStr = body.epicData || "";
        const existingFeaturesStr = body.existingFeatures || "[]";
        const apiChoice = body.apiChoice || "google_gemini";
        if (!epicDataStr.trim()) {
            return jsonError("No EPIC data received.");
        }
        let epicData, existingFeatures;
        try {
            epicData = (0, utils_1.parseJsonOrThrow)(epicDataStr, "EPIC JSON error");
            existingFeatures = (0, utils_1.parseJsonOrThrow)(existingFeaturesStr, "Existing features JSON error");
        }
        catch (err) {
            return jsonError(err.message, 400);
        }
        const prompt = `We have an EPIC and these existing Features. Generate exactly ONE new Feature,\n` +
            `distinct from the existing ones, that helps deliver the EPIC. Return valid JSON:\n` +
            `{\n` +
            `  "title": "",\n` +
            `  "id": "FEATURE-XYZ",\n` +
            `  "description": "",\n` +
            `  "acceptance_criteria": ["Criterion 1"],\n` +
            `  "nfrs": ["NFR 1"]\n` +
            `}\n` +
            `No extra text.\n\n` +
            `EPIC:\n${JSON.stringify(epicData, null, 2)}\n\n` +
            `EXISTING FEATURES:\n${JSON.stringify(existingFeatures, null, 2)}`;
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
        let newFeature;
        try {
            newFeature = (0, utils_1.parseJsonOrThrow)(llmResponse, "Single Feature from LLM");
        }
        catch (err) {
            return jsonError(err.message, 500);
        }
        if (!newFeature.title) {
            return jsonError("JSON missing 'title' for new Feature.");
        }
        return new Response(JSON.stringify({ success: true, data: newFeature }), {
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
