// src/services/openRouter.ts
import { removeControlChars } from "../handlers/utils";
/**
 * Calls the OpenRouter (DeepSeek) LLM with the given prompt.
 * The `apiKey` is retrieved from env.OPENROUTER_API_KEY in the handlers.
 */
export async function openRouterApiCall(prompt, maxTokens, apiKey) {
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
    // Similarly cast to any
    const jsonData = (await response.json().catch(() => ({})));
    if (!response.ok) {
        const msg = jsonData?.error?.message ??
            `OpenRouter error (status: ${response.status}).`;
        throw new Error(msg);
    }
    const content = jsonData?.choices?.[0]?.message?.content;
    if (!content) {
        throw new Error("No content in OpenRouter response.");
    }
    const cleaned = removeControlChars(content).replace(/```json|```/g, "");
    return cleaned.trim();
}
