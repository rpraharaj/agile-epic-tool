import { openRouterApiCall } from "../services/openRouter";
import { googleGeminiApiCall } from "../services/googleGemini";
import { parseJsonOrThrow } from "./utils";

interface RewriteContentRequestBody {
  originalContent?: string;
  rewritePrompt?: string;
  type?: string;       // "epic", "feature", or "story"
  apiChoice?: string;  // "google_gemini" or "openrouter"
}

export async function rewriteContentHandler(request: Request, env: any): Promise<Response> {
  const body = (await request.json()) as RewriteContentRequestBody;

  const originalContent = body.originalContent ?? "";
  const rewritePrompt = body.rewritePrompt ?? "";
  const type = body.type ?? "";
  const apiChoice = body.apiChoice ?? "google_gemini";

  if (!originalContent.trim() || !rewritePrompt.trim() || !type.trim()) {
    return jsonError("Missing original content, rewrite prompt, or content type.");
  }

  // Choose format instructions based on type...
  let formatInstructions = "";
  switch (type.toLowerCase()) {
    case "epic":
      formatInstructions = "...";
      break;
    case "feature":
      formatInstructions = "...";
      break;
    case "story":
      formatInstructions = "...";
      break;
    default:
      return jsonError("Invalid content type for rewrite.");
  }

  const finalPrompt =
    `${rewritePrompt}\n\n` +
    `Please produce a revised version...\n\n` +
    formatInstructions +
    `\nReturn only JSON. No extra explanation.`;

  let llmResponse: string;
  try {
    if (apiChoice === "google_gemini") {
      const apiKeys = env.GOOGLE_GEMINI_API_KEYS?.split(",") ?? [];
      llmResponse = await googleGeminiApiCall(finalPrompt, 1500, apiKeys);
    } else {
      const apiKey = env.OPENROUTER_API_KEY;
      llmResponse = await openRouterApiCall(finalPrompt, 1500, apiKey);
    }
  } catch (err: any) {
    return jsonError(err.message, 500);
  }

  let decoded;
  try {
    decoded = parseJsonOrThrow(llmResponse, "Rewrite JSON from LLM");
  } catch (err: any) {
    return jsonError(err.message, 500);
  }

  return new Response(JSON.stringify({ success: true, data: decoded }), {
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
