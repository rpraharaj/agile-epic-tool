import { openRouterApiCall } from "../services/openRouter";
import { googleGeminiApiCall } from "../services/googleGemini";
import { parseJsonOrThrow } from "./utils";
export async function addSingleStoryHandler(request, env) {
    const body = (await request.json());
    const featureDataStr = body.featureData ?? "";
    const existingStoriesStr = body.existingStories ?? "[]";
    const apiChoice = body.apiChoice ?? "google_gemini";
    if (!featureDataStr.trim()) {
        return jsonError("No feature data received for single story generation.");
    }
    let featureData, existingStories;
    try {
        featureData = parseJsonOrThrow(featureDataStr, "Invalid Feature JSON");
        existingStories = parseJsonOrThrow(existingStoriesStr, "Existing stories JSON error");
    }
    catch (err) {
        return jsonError(err.message, 400);
    }
    const prompt = `We have a Feature and existing Stories. Generate exactly ONE new Story...`;
    let llmResponse;
    try {
        if (apiChoice === "google_gemini") {
            const apiKeys = env.GOOGLE_GEMINI_API_KEYS?.split(",") ?? [];
            llmResponse = await googleGeminiApiCall(prompt, 1000, apiKeys);
        }
        else {
            const apiKey = env.OPENROUTER_API_KEY;
            llmResponse = await openRouterApiCall(prompt, 1000, apiKey);
        }
    }
    catch (err) {
        return jsonError(err.message, 500);
    }
    let newStory;
    try {
        newStory = parseJsonOrThrow(llmResponse, "Single Story from LLM");
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
function jsonError(msg, status = 400) {
    return new Response(JSON.stringify({ success: false, data: msg }), {
        status,
        headers: { "Content-Type": "application/json" }
    });
}
