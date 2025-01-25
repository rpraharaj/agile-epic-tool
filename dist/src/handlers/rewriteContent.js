"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rewriteContentHandler = rewriteContentHandler;
// src/handlers/rewriteContent.ts
const openRouter_1 = require("../services/openRouter");
const googleGemini_1 = require("../services/googleGemini");
const utils_1 = require("./utils");
async function rewriteContentHandler(request, env) {
    try {
        const body = await request.json();
        const originalContent = body.originalContent || "";
        const rewritePrompt = body.rewritePrompt || "";
        const type = body.type || "";
        const apiChoice = body.apiChoice || "google_gemini";
        if (!originalContent.trim() || !rewritePrompt.trim() || !type.trim()) {
            return jsonError("Missing original content, rewrite prompt, or content type.");
        }
        let formatInstructions;
        switch (type.toLowerCase()) {
            case "epic":
                formatInstructions =
                    "Return valid JSON with the structure:\n" +
                        "{\n" +
                        "  \"epic\": {\n" +
                        "    \"title\": \"\",\n" +
                        "    \"id\": \"EPIC-XYZ\",\n" +
                        "    \"description\": \"\",\n" +
                        "    \"business_value\": \"\",\n" +
                        "    \"goals\": [\"Goal 1\"],\n" +
                        "    \"stakeholders\": [\"Stakeholder 1\"],\n" +
                        "    \"high_level_features\": [\"Feature 1\"],\n" +
                        "    \"acceptance_criteria\": [\"Criterion 1\"],\n" +
                        "    \"metrics\": [\"Metric 1\"],\n" +
                        "    \"constraints\": [\"Constraint 1\"],\n" +
                        "    \"dependencies\": [\"Dependency 1\"],\n" +
                        "    \"milestones\": [\"Milestone 1\"],\n" +
                        "    \"risks\": [\"Risk 1\"],\n" +
                        "    \"nfrs\": [\"NFR 1\"]\n" +
                        "  }\n" +
                        "}";
                break;
            case "feature":
                formatInstructions =
                    "Return valid JSON for a single Feature:\n" +
                        "{\n" +
                        "  \"title\": \"\",\n" +
                        "  \"id\": \"FEATURE-XYZ\",\n" +
                        "  \"description\": \"\",\n" +
                        "  \"acceptance_criteria\": [\"Criterion 1\"],\n" +
                        "  \"nfrs\": [\"NFR 1\"]\n" +
                        "}";
                break;
            case "story":
                formatInstructions =
                    "Return valid JSON for a single Story:\n" +
                        "{\n" +
                        "  \"title\": \"\",\n" +
                        "  \"id\": \"STORY-XYZ\",\n" +
                        "  \"description\": \"\",\n" +
                        "  \"acceptance_criteria\": [\"Criterion 1\"],\n" +
                        "  \"nfrs\": [\"NFR 1\"]\n" +
                        "}";
                break;
            default:
                return jsonError("Invalid content type for rewrite.");
        }
        const finalPrompt = `${rewritePrompt}\n\n` +
            `Please produce a revised version in the correct JSON structure below.\n` +
            `You can reword or refine as needed to improve quality.\n\n` +
            formatInstructions +
            `\nReturn only JSON. No extra explanation.`;
        let llmResponse;
        try {
            if (apiChoice === "google_gemini") {
                const apiKeys = env.GOOGLE_GEMINI_API_KEYS?.split(",") ?? [];
                llmResponse = await (0, googleGemini_1.googleGeminiApiCall)(finalPrompt, 1500, apiKeys);
            }
            else {
                const apiKey = env.OPENROUTER_API_KEY;
                llmResponse = await (0, openRouter_1.openRouterApiCall)(finalPrompt, 1500, apiKey);
            }
        }
        catch (err) {
            return jsonError(err.message, 500);
        }
        let decoded;
        try {
            decoded = (0, utils_1.parseJsonOrThrow)(llmResponse, "Rewrite JSON from LLM");
        }
        catch (err) {
            return jsonError(err.message, 500);
        }
        return new Response(JSON.stringify({ success: true, data: decoded }), {
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
