"use strict";
// src/handlers/utils.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeControlChars = removeControlChars;
exports.parseJsonOrThrow = parseJsonOrThrow;
/**
 * Basic utility to remove control characters from LLM outputs.
 */
function removeControlChars(str) {
    // Removes ASCII control characters: 0x00–0x1F and 0x7F
    return str.replace(/[\x00-\x1F\x7F]/g, "");
}
/**
 * Helper to parse JSON safely. Throws on error.
 */
function parseJsonOrThrow(jsonStr, contextMsg) {
    try {
        return JSON.parse(jsonStr);
    }
    catch (e) {
        throw new Error(`Invalid JSON${contextMsg ? ` (${contextMsg})` : ""}: ${e.message}`);
    }
}
