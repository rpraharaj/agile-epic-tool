"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openRouterApiCall = openRouterApiCall;
// src/services/openRouter.ts
const utils_1 = require("../handlers/utils");
/**
 * Calls the OpenRouter (DeepSeek) LLM with the given prompt.
 * The `apiKey` is retrieved from env.OPENROUTER_API_KEY in the handlers.
 */
async function openRouterApiCall(prompt, maxTokens, apiKey) {
    if (!apiKey) {
        throw new Error("OpenRouter API key is missing (env.OPENROUTER_API_KEY).");
    }
    const requestBody = {
        model: "deepseek/deepseek-chat",
        messages: [
            {
                role: "system",
                content: "You are an expert in Agile methodologies."
            },
            {
                role: "user",
                content: prompt
            }
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
    if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const msg = errJson?.error?.message ||
            `OpenRouter error (status: ${response.status}).`;
        throw new Error(msg);
    }
    const jsonData = await response.json();
    const content = jsonData?.choices?.[0]?.message?.content;
    if (!content) {
        throw new Error("No content in OpenRouter response.");
    }
    const cleaned = (0, utils_1.removeControlChars)(content).replace(/```json|```/g, "");
    return cleaned.trim();
}
