import { openRouterApiCall } from "../services/openRouter";
import { googleGeminiApiCall } from "../services/googleGemini";
import { parseJsonOrThrow } from "./utils";

/**
 * Define an interface that matches the JSON body 
 * we expect from the front-end.
 */
interface CreateEpicRequestBody {
  reqTitle?: string;
  reqDescription?: string;
  reqInstructions?: string;
  apiChoice?: string; // "google_gemini" or "openrouter"
}

export async function createEpicHandler(request: Request, env: any): Promise<Response> {
  // Cast the unknown result of request.json() to our interface
  const body = (await request.json()) as CreateEpicRequestBody;

  const title = body.reqTitle ?? "";
  const desc = body.reqDescription ?? "";
  const instr = body.reqInstructions ?? "";
  const apiChoice = body.apiChoice ?? "google_gemini";

  if (!title.trim()) {
    return jsonError("Requirement Brief cannot be empty.");
  }

  const prompt =
    `You are an expert in Agile...` + // (rest of prompt, omitted for brevity)
    `Title: "${title}"\n` +
    `Description: "${desc}"\n` +
    `Instructions: "${instr}"\n`;

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

  let epicData;
  try {
    epicData = parseJsonOrThrow(llmResponse, "EPIC from LLM");
  } catch (err: any) {
    return jsonError(err.message, 500);
  }

  if (!epicData.epic) {
    return jsonError("JSON missing 'epic' key.");
  }

  return new Response(JSON.stringify({ success: true, data: epicData }), { status: 200 });
}

function jsonError(msg: string, status = 400): Response {
  return new Response(JSON.stringify({ success: false, data: msg }), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
