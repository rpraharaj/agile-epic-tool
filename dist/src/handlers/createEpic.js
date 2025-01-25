"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEpicHandler = createEpicHandler;
// src/handlers/createEpic.ts
const openRouter_1 = require("../services/openRouter");
const googleGemini_1 = require("../services/googleGemini");
const utils_1 = require("./utils");
async function createEpicHandler(request, env) {
    // Extract body from JSON
    const body = await request.json();
    const title = body.reqTitle || "";
    const desc = body.reqDescription || "";
    const instr = body.reqInstructions || "";
    const apiChoice = body.apiChoice || "google_gemini";
    if (!title.trim()) {
        return jsonError("Requirement Brief cannot be empty.");
    }
    // Build prompt:
    const prompt = `You are an expert in Agile methodologies. The user provides a Requirement Brief, Description, and any custom instructions.\n` +
        `Generate a fully fleshed-out Agile Epic in strictly valid JSON:\n\n` +
        `{\n` +
        `  "epic": {\n` +
        `    "title": "",\n` +
        `    "id": "EPIC-XYZ",\n` +
        `    "description": "",\n` +
        `    "business_value": "",\n` +
        `    "goals": ["Goal 1"],\n` +
        `    "stakeholders": ["Stakeholder 1"],\n` +
        `    "high_level_features": ["Feature 1"],\n` +
        `    "acceptance_criteria": ["Criterion 1"],\n` +
        `    "metrics": ["Metric 1"],\n` +
        `    "constraints": ["Constraint 1"],\n` +
        `    "dependencies": ["Dependency 1"],\n` +
        `    "milestones": ["Milestone 1"],\n` +
        `    "risks": ["Risk 1"],\n` +
        `    "nfrs": ["NFR 1"]\n` +
        `  }\n` +
        `}\n\n` +
        `Title: "${title}"\n` +
        `Description: "${desc}"\n` +
        `Instructions: "${instr}"\n` +
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
    // Parse the returned JSON
    let epicData;
    try {
        epicData = (0, utils_1.parseJsonOrThrow)(llmResponse, "EPIC from LLM");
    }
    catch (err) {
        return jsonError(err.message, 500);
    }
    if (!epicData.epic) {
        return jsonError("JSON missing 'epic' key.");
    }
    return new Response(JSON.stringify({ success: true, data: epicData }), { status: 200 });
}
function jsonError(msg, status = 400) {
    return new Response(JSON.stringify({ success: false, data: msg }), {
        status,
        headers: { "Content-Type": "application/json" }
    });
}
