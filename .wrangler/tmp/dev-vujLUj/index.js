var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-3iXRdM/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// dist/handlers/utils.js
function removeControlChars(str) {
  return str.replace(/[\x00-\x1F\x7F]/g, "");
}
__name(removeControlChars, "removeControlChars");
function parseJsonOrThrow(jsonStr, contextMsg) {
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    throw new Error(`Invalid JSON${contextMsg ? ` (${contextMsg})` : ""}: ${e.message}`);
  }
}
__name(parseJsonOrThrow, "parseJsonOrThrow");

// dist/services/openRouter.js
async function openRouterApiCall(prompt, maxTokens, apiKey) {
  if (!apiKey) {
    throw new Error("OpenRouter API key is missing (env.OPENROUTER_API_KEY).");
  }
  const requestBody = {
    model: "deepseek/deepseek-chat",
    messages: [
      { role: "system", content: "You are an expert in Agile methodologies." },
      { role: "user", content: prompt }
    ],
    temperature: 0.7,
    max_tokens: maxTokens
  };
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody)
  });
  const jsonData = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = jsonData?.error?.message ?? `OpenRouter error (status: ${response.status}).`;
    throw new Error(msg);
  }
  const content = jsonData?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("No content in OpenRouter response.");
  }
  const cleaned = removeControlChars(content).replace(/```json|```/g, "");
  return cleaned.trim();
}
__name(openRouterApiCall, "openRouterApiCall");

// dist/services/googleGemini.js
async function googleGeminiApiCall(prompt, maxTokens, apiKeys) {
  const modelName = "gemini-2.0-flash-exp";
  if (!apiKeys.length) {
    throw new Error("No Google Gemini API keys found (env.GOOGLE_GEMINI_API_KEYS).");
  }
  let lastError = null;
  for (const key of apiKeys) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`;
    const requestBody = {
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: { maxOutputTokens: maxTokens }
    };
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });
      const jsonData = await response.json().catch(() => ({}));
      if (!response.ok) {
        const msg = jsonData?.error?.message || `HTTP ${response.status}`;
        if (response.status === 429 || /rate limit/i.test(msg)) {
          lastError = new Error(`Rate limit for key: ${key}`);
          continue;
        } else {
          throw new Error(`Gemini API error: ${msg}`);
        }
      }
      const text = jsonData?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        lastError = new Error("No text in Gemini response.");
        continue;
      }
      const cleaned = removeControlChars(text).replace(/```json|```/g, "");
      return cleaned.trim();
    } catch (err) {
      lastError = err;
    }
  }
  if (lastError) {
    throw lastError;
  } else {
    throw new Error("An unknown error occurred with Google Gemini API.");
  }
}
__name(googleGeminiApiCall, "googleGeminiApiCall");

// dist/handlers/createEpic.js
async function createEpicHandler(request, env) {
  const body = await request.json();
  const title = body.reqTitle ?? "";
  const desc = body.reqDescription ?? "";
  const instr = body.reqInstructions ?? "";
  const apiChoice = body.apiChoice ?? "google_gemini";
  if (!title.trim()) {
    return jsonError("Requirement Brief cannot be empty.");
  }
  const prompt = `You are an expert in Agile...Title: "${title}"
Description: "${desc}"
Instructions: "${instr}"
`;
  let llmResponse;
  try {
    if (apiChoice === "google_gemini") {
      const apiKeys = env.GOOGLE_GEMINI_API_KEYS?.split(",") ?? [];
      llmResponse = await googleGeminiApiCall(prompt, 2e3, apiKeys);
    } else {
      const apiKey = env.OPENROUTER_API_KEY;
      llmResponse = await openRouterApiCall(prompt, 2e3, apiKey);
    }
  } catch (err) {
    return jsonError(err.message, 500);
  }
  let epicData;
  try {
    epicData = parseJsonOrThrow(llmResponse, "EPIC from LLM");
  } catch (err) {
    return jsonError(err.message, 500);
  }
  if (!epicData.epic) {
    return jsonError("JSON missing 'epic' key.");
  }
  return new Response(JSON.stringify({ success: true, data: epicData }), { status: 200 });
}
__name(createEpicHandler, "createEpicHandler");
function jsonError(msg, status = 400) {
  return new Response(JSON.stringify({ success: false, data: msg }), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(jsonError, "jsonError");

// dist/handlers/createFeatures.js
async function createFeaturesHandler(request, env) {
  const body = await request.json();
  const epicDataStr = body.epicData ?? "";
  const apiChoice = body.apiChoice ?? "google_gemini";
  if (!epicDataStr.trim()) {
    return jsonError2("No epic data received.");
  }
  let epicData;
  try {
    epicData = parseJsonOrThrow(epicDataStr, "Invalid EPIC JSON");
  } catch (err) {
    return jsonError2(err.message);
  }
  const prompt = `You are an expert in Agile...`;
  let llmResponse;
  try {
    if (apiChoice === "google_gemini") {
      const apiKeys = env.GOOGLE_GEMINI_API_KEYS?.split(",") ?? [];
      llmResponse = await googleGeminiApiCall(prompt, 2e3, apiKeys);
    } else {
      const apiKey = env.OPENROUTER_API_KEY;
      llmResponse = await openRouterApiCall(prompt, 2e3, apiKey);
    }
  } catch (err) {
    return jsonError2(err.message, 500);
  }
  let featuresData;
  try {
    featuresData = parseJsonOrThrow(llmResponse, "Features JSON from LLM");
  } catch (err) {
    return jsonError2(err.message, 500);
  }
  if (!featuresData.features) {
    return jsonError2("JSON missing 'features' key.");
  }
  return new Response(JSON.stringify({ success: true, data: featuresData.features }), { status: 200 });
}
__name(createFeaturesHandler, "createFeaturesHandler");
function jsonError2(msg, status = 400) {
  return new Response(JSON.stringify({ success: false, data: msg }), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(jsonError2, "jsonError");

// dist/handlers/createStories.js
async function createStoriesHandler(request, env) {
  const body = await request.json();
  const featureDataStr = body.featureData ?? "";
  const apiChoice = body.apiChoice ?? "google_gemini";
  if (!featureDataStr.trim()) {
    return jsonError3("No feature data received.");
  }
  let featureData;
  try {
    featureData = parseJsonOrThrow(featureDataStr, "Invalid Feature JSON");
  } catch (err) {
    return jsonError3(err.message, 400);
  }
  const prompt = `You are an expert in Agile...`;
  let llmResponse;
  try {
    if (apiChoice === "google_gemini") {
      const apiKeys = env.GOOGLE_GEMINI_API_KEYS?.split(",") ?? [];
      llmResponse = await googleGeminiApiCall(prompt, 1500, apiKeys);
    } else {
      const apiKey = env.OPENROUTER_API_KEY;
      llmResponse = await openRouterApiCall(prompt, 1500, apiKey);
    }
  } catch (err) {
    return jsonError3(err.message, 500);
  }
  let storiesData;
  try {
    storiesData = parseJsonOrThrow(llmResponse, "Stories JSON from LLM");
  } catch (err) {
    return jsonError3(err.message, 500);
  }
  if (!storiesData.stories) {
    return jsonError3("JSON missing 'stories' key.");
  }
  return new Response(JSON.stringify({ success: true, data: storiesData.stories }), { status: 200 });
}
__name(createStoriesHandler, "createStoriesHandler");
function jsonError3(msg, status = 400) {
  return new Response(JSON.stringify({ success: false, data: msg }), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(jsonError3, "jsonError");

// dist/handlers/addSingleFeature.js
async function addSingleFeatureHandler(request, env) {
  const body = await request.json();
  const epicDataStr = body.epicData ?? "";
  const existingFeaturesStr = body.existingFeatures ?? "[]";
  const apiChoice = body.apiChoice ?? "google_gemini";
  if (!epicDataStr.trim()) {
    return jsonError4("No EPIC data received.");
  }
  let epicData, existingFeatures;
  try {
    epicData = parseJsonOrThrow(epicDataStr, "EPIC JSON error");
    existingFeatures = parseJsonOrThrow(existingFeaturesStr, "Existing features JSON error");
  } catch (err) {
    return jsonError4(err.message, 400);
  }
  const prompt = `We have an EPIC and existing Features. Generate exactly ONE new Feature...`;
  let llmResponse;
  try {
    if (apiChoice === "google_gemini") {
      const apiKeys = env.GOOGLE_GEMINI_API_KEYS?.split(",") ?? [];
      llmResponse = await googleGeminiApiCall(prompt, 1e3, apiKeys);
    } else {
      const apiKey = env.OPENROUTER_API_KEY;
      llmResponse = await openRouterApiCall(prompt, 1e3, apiKey);
    }
  } catch (err) {
    return jsonError4(err.message, 500);
  }
  let newFeature;
  try {
    newFeature = parseJsonOrThrow(llmResponse, "Single Feature from LLM");
  } catch (err) {
    return jsonError4(err.message, 500);
  }
  if (!newFeature.title) {
    return jsonError4("JSON missing 'title' for new Feature.");
  }
  return new Response(JSON.stringify({ success: true, data: newFeature }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
__name(addSingleFeatureHandler, "addSingleFeatureHandler");
function jsonError4(msg, status = 400) {
  return new Response(JSON.stringify({ success: false, data: msg }), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(jsonError4, "jsonError");

// dist/handlers/addSingleStory.js
async function addSingleStoryHandler(request, env) {
  const body = await request.json();
  const featureDataStr = body.featureData ?? "";
  const existingStoriesStr = body.existingStories ?? "[]";
  const apiChoice = body.apiChoice ?? "google_gemini";
  if (!featureDataStr.trim()) {
    return jsonError5("No feature data received for single story generation.");
  }
  let featureData, existingStories;
  try {
    featureData = parseJsonOrThrow(featureDataStr, "Invalid Feature JSON");
    existingStories = parseJsonOrThrow(existingStoriesStr, "Existing stories JSON error");
  } catch (err) {
    return jsonError5(err.message, 400);
  }
  const prompt = `We have a Feature and existing Stories. Generate exactly ONE new Story...`;
  let llmResponse;
  try {
    if (apiChoice === "google_gemini") {
      const apiKeys = env.GOOGLE_GEMINI_API_KEYS?.split(",") ?? [];
      llmResponse = await googleGeminiApiCall(prompt, 1e3, apiKeys);
    } else {
      const apiKey = env.OPENROUTER_API_KEY;
      llmResponse = await openRouterApiCall(prompt, 1e3, apiKey);
    }
  } catch (err) {
    return jsonError5(err.message, 500);
  }
  let newStory;
  try {
    newStory = parseJsonOrThrow(llmResponse, "Single Story from LLM");
  } catch (err) {
    return jsonError5(err.message, 500);
  }
  if (!newStory.title) {
    return jsonError5("JSON missing 'title' for new Story.");
  }
  return new Response(JSON.stringify({ success: true, data: newStory }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
__name(addSingleStoryHandler, "addSingleStoryHandler");
function jsonError5(msg, status = 400) {
  return new Response(JSON.stringify({ success: false, data: msg }), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(jsonError5, "jsonError");

// dist/handlers/rewriteContent.js
async function rewriteContentHandler(request, env) {
  const body = await request.json();
  const originalContent = body.originalContent ?? "";
  const rewritePrompt = body.rewritePrompt ?? "";
  const type = body.type ?? "";
  const apiChoice = body.apiChoice ?? "google_gemini";
  if (!originalContent.trim() || !rewritePrompt.trim() || !type.trim()) {
    return jsonError6("Missing original content, rewrite prompt, or content type.");
  }
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
      return jsonError6("Invalid content type for rewrite.");
  }
  const finalPrompt = `${rewritePrompt}

Please produce a revised version...

` + formatInstructions + `
Return only JSON. No extra explanation.`;
  let llmResponse;
  try {
    if (apiChoice === "google_gemini") {
      const apiKeys = env.GOOGLE_GEMINI_API_KEYS?.split(",") ?? [];
      llmResponse = await googleGeminiApiCall(finalPrompt, 1500, apiKeys);
    } else {
      const apiKey = env.OPENROUTER_API_KEY;
      llmResponse = await openRouterApiCall(finalPrompt, 1500, apiKey);
    }
  } catch (err) {
    return jsonError6(err.message, 500);
  }
  let decoded;
  try {
    decoded = parseJsonOrThrow(llmResponse, "Rewrite JSON from LLM");
  } catch (err) {
    return jsonError6(err.message, 500);
  }
  return new Response(JSON.stringify({ success: true, data: decoded }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
__name(rewriteContentHandler, "rewriteContentHandler");
function jsonError6(msg, status = 400) {
  return new Response(JSON.stringify({ success: false, data: msg }), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(jsonError6, "jsonError");

// dist/router.js
async function handleRequest(request, env) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method.toUpperCase();
  if (!pathname.startsWith("/api")) {
    return;
  }
  if (method === "POST" && pathname === "/api/create-epic") {
    return await createEpicHandler(request, env);
  }
  if (method === "POST" && pathname === "/api/create-features") {
    return await createFeaturesHandler(request, env);
  }
  if (method === "POST" && pathname === "/api/create-stories") {
    return await createStoriesHandler(request, env);
  }
  if (method === "POST" && pathname === "/api/add-single-feature") {
    return await addSingleFeatureHandler(request, env);
  }
  if (method === "POST" && pathname === "/api/add-single-story") {
    return await addSingleStoryHandler(request, env);
  }
  if (method === "POST" && pathname === "/api/rewrite-content") {
    return await rewriteContentHandler(request, env);
  }
  return new Response("Not found", { status: 404 });
}
__name(handleRequest, "handleRequest");

// dist/index.js
var dist_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api")) {
      const response = await handleRequest(request, env);
      if (response) {
        return response;
      }
    }
    return new Response("Not found", { status: 404 });
  }
};

// ../../../../../opt/homebrew/lib/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../../opt/homebrew/lib/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError7 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError7;

// .wrangler/tmp/bundle-3iXRdM/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = dist_default;

// ../../../../../opt/homebrew/lib/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-3iXRdM/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
