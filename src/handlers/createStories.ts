import { openRouterApiCall } from "../services/openRouter";
import { googleGeminiApiCall } from "../services/googleGemini";
import { parseJsonOrThrow } from "./utils";

interface CreateStoriesRequestBody {
  featureData?: string; // JSON string of the Feature
  apiChoice?: string;
}

export async function createStoriesHandler(request: Request, env: any): Promise<Response> {
  const body = (await request.json()) as CreateStoriesRequestBody;

  const featureDataStr = body.featureData ?? "";
  const apiChoice = body.apiChoice ?? "google_gemini";

  if (!featureDataStr.trim()) {
    return jsonError("No feature data received.");
  }

  let featureData;
  try {
    featureData = parseJsonOrThrow(featureDataStr, "Invalid Feature JSON");
  } catch (err: any) {
    return jsonError(err.message, 400);
  }

  const prompt = `You are an expert in Agile...`; // etc.

  let llmResponse: string;
  try {
    if (apiChoice === "google_gemini") {
      const apiKeys = env.GOOGLE_GEMINI_API_KEYS?.split(",") ?? [];
      llmResponse = await googleGeminiApiCall(prompt, 1500, apiKeys);
    } else {
      const apiKey = env.OPENROUTER_API_KEY;
      llmResponse = await openRouterApiCall(prompt, 1500, apiKey);
    }
  } catch (err: any) {
    return jsonError(err.message, 500);
  }

  let storiesData;
  try {
    storiesData = parseJsonOrThrow(llmResponse, "Stories JSON from LLM");
  } catch (err: any) {
    return jsonError(err.message, 500);
  }

  if (!storiesData.stories) {
    return jsonError("JSON missing 'stories' key.");
  }

  return new Response(
    JSON.stringify({ success: true, data: storiesData.stories }),
    { status: 200 }
  );
}

function jsonError(msg: string, status = 400): Response {
  return new Response(JSON.stringify({ success: false, data: msg }), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
