"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleGeminiApiCall = googleGeminiApiCall;
// src/services/googleGemini.ts
const utils_1 = require("../handlers/utils");
/**
 * Calls Google Gemini with the given prompt. Accepts an array of keys,
 * then tries them one by one to avoid rate-limit errors.
 * The keys come from env.GOOGLE_GEMINI_API_KEYS, split by commas.
 */
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
            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                const msg = body?.error?.message || `HTTP ${response.status}`;
                // If 429 or rate-limit, try next key
                if (response.status === 429 || /rate limit/i.test(msg)) {
                    lastError = new Error(`Rate limit for key: ${key}`);
                    continue;
                }
                // Otherwise, stop here
                throw new Error(`Gemini API error: ${msg}`);
            }
            const jsonData = await response.json();
            const text = jsonData?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) {
                lastError = new Error("No text in Gemini response.");
                continue;
            }
            const cleaned = (0, utils_1.removeControlChars)(text).replace(/```json|```/g, "");
            return cleaned.trim();
        }
        catch (err) {
            lastError = err;
        }
    }
    // If we tried all keys without success
    if (lastError) {
        throw lastError;
    }
    else {
        throw new Error("An unknown error occurred with Google Gemini API.");
    }
}
