import { openRouterApiCall } from "../services/openRouter";
import { googleGeminiApiCall } from "../services/googleGemini";
import { parseJsonOrThrow } from "./utils";

interface AddSingleFeatureRequestBody {
  epicData?: string;          // JSON string representing the EPIC
  existingFeatures?: string;  // JSON array string of existing features
  apiChoice?: string;
}

export async function addSingleFeatureHandler(request: Request, env: any): Promise<Response> {
  const body = (await request.json()) as AddSingleFeatureRequestBody;

  const epicDataStr = body.epicData ?? "";
  const existingFeaturesStr = body.existingFeatures ?? "[]";
  const apiChoice = body.apiChoice ?? "google_gemini";

  if (!epicDataStr.trim()) {
    return jsonError("No EPIC data received.");
  }

  let epicData, existingFeatures;
  try {
    epicData = parseJsonOrThrow(epicDataStr, "EPIC JSON error");
    existingFeatures = parseJsonOrThrow(existingFeaturesStr, "Existing features JSON error");
  } catch (err: any) {
    return jsonError(err.message, 400);
  }

  const prompt =
    `We have an EPIC and existing Features. Generate exactly ONE new Feature...`;

  let llmResponse: string;
  try {
    if (apiChoice === "google_gemini") {
      const apiKeys = env.GOOGLE_GEMINI_API_KEYS?.split(",") ?? [];
      llmResponse = await googleGeminiApiCall(prompt, 1000, apiKeys);
    } else {
      const apiKey = env.OPENROUTER_API_KEY;
      llmResponse = await openRouterApiCall(prompt, 1000, apiKey);
    }
  } catch (err: any) {
    return jsonError(err.message, 500);
  }

  let newFeature;
  try {
    newFeature = parseJsonOrThrow(llmResponse, "Single Feature from LLM");
  } catch (err: any) {
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

function jsonError(msg: string, status = 400): Response {
  return new Response(JSON.stringify({ success: false, data: msg }), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
