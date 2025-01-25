import { openRouterApiCall } from "../services/openRouter";
import { googleGeminiApiCall } from "../services/googleGemini";
import { parseJsonOrThrow } from "./utils";
export async function createFeaturesHandler(request, env) {
    const body = (await request.json());
    const epicDataStr = body.epicData ?? "";
    const apiChoice = body.apiChoice ?? "google_gemini";
    if (!epicDataStr.trim()) {
        return jsonError("No epic data received.");
    }
    let epicData;
    try {
        epicData = parseJsonOrThrow(epicDataStr, "Invalid EPIC JSON");
    }
    catch (err) {
        return jsonError(err.message);
    }
    // Build LLM prompt...
    const prompt = `You are an expert in Agile...`; // etc.
    let llmResponse;
    try {
        if (apiChoice === "google_gemini") {
            const apiKeys = env.GOOGLE_GEMINI_API_KEYS?.split(",") ?? [];
            llmResponse = await googleGeminiApiCall(prompt, 2000, apiKeys);
        }
        else {
            const apiKey = env.OPENROUTER_API_KEY;
            llmResponse = await openRouterApiCall(prompt, 2000, apiKey);
        }
    }
    catch (err) {
        return jsonError(err.message, 500);
    }
    let featuresData;
    try {
        featuresData = parseJsonOrThrow(llmResponse, "Features JSON from LLM");
    }
    catch (err) {
        return jsonError(err.message, 500);
    }
    if (!featuresData.features) {
        return jsonError("JSON missing 'features' key.");
    }
    return new Response(JSON.stringify({ success: true, data: featuresData.features }), { status: 200 });
}
function jsonError(msg, status = 400) {
    return new Response(JSON.stringify({ success: false, data: msg }), {
        status,
        headers: { "Content-Type": "application/json" }
    });
}
