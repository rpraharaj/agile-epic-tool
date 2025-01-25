import { openRouterApiCall } from "../services/openRouter";
import { googleGeminiApiCall } from "../services/googleGemini";
import { parseJsonOrThrow } from "./utils";

/** Match the JSON body from front-end calls to /api/create-features */
interface CreateFeaturesRequestBody {
  epicData?: string;  // JSON string of the Epic
  apiChoice?: string;
}

export async function createFeaturesHandler(request: Request, env: any): Promise<Response> {
  const body = (await request.json()) as CreateFeaturesRequestBody;

  const epicDataStr = body.epicData ?? "";
  const apiChoice = body.apiChoice ?? "google_gemini";

  if (!epicDataStr.trim()) {
    return jsonError("No epic data received.");
  }

  let epicData;
  try {
    epicData = parseJsonOrThrow(epicDataStr, "Invalid EPIC JSON");
  } catch (err: any) {
    return jsonError(err.message);
  }

  // Build LLM prompt...
  const prompt = `You are an expert in Agile...`; // etc.

  let llmResponse: string;
  try {
    if (apiChoice === "google_gemini") {
      const apiKeys = env.GOOGLE_GEMINI_API_KEYS?.split(",") ?? [];
      llmResponse = await googleGeminiApiCall(prompt, 2000, apiKeys);
    } else {
      const apiKey = env.OPENROUTER_API_KEY;
      llmResponse = await openRouterApiCall(prompt, 2000, apiKey);
    }
  } catch (err: any) {
    return jsonError(err.message, 500);
  }

  let featuresData;
  try {
    featuresData = parseJsonOrThrow(llmResponse, "Features JSON from LLM");
  } catch (err: any) {
    return jsonError(err.message, 500);
  }

  if (!featuresData.features) {
    return jsonError("JSON missing 'features' key.");
  }

  return new Response(JSON.stringify({ success: true, data: featuresData.features }), { status: 200 });
}

function jsonError(msg: string, status = 400): Response {
  return new Response(JSON.stringify({ success: false, data: msg }), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
