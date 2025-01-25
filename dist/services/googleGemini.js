// src/services/googleGemini.ts
import { removeControlChars } from "../handlers/utils";
/**
 * Calls Google Gemini with the given prompt. Accepts an array of keys,
 * then tries them one by one to avoid rate-limit errors.
 * The keys come from env.GOOGLE_GEMINI_API_KEYS, split by commas.
 */
export async function googleGeminiApiCall(prompt, maxTokens, apiKeys) {
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
            // Cast the parsed JSON to `any` so TS won't complain about missing properties
            const jsonData = (await response.json().catch(() => ({})));
            if (!response.ok) {
                const msg = jsonData?.error?.message || `HTTP ${response.status}`;
                // If rate limit or 429, try next key
                if (response.status === 429 || /rate limit/i.test(msg)) {
                    lastError = new Error(`Rate limit for key: ${key}`);
                    continue;
                }
                else {
                    throw new Error(`Gemini API error: ${msg}`);
                }
            }
            // Extract the text using optional chaining
            const text = jsonData?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) {
                lastError = new Error("No text in Gemini response.");
                continue; // try next key
            }
            // Clean output of any ```json blocks or control chars
            const cleaned = removeControlChars(text).replace(/```json|```/g, "");
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
