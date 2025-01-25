"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
const router_1 = require("./router");
exports.default = {
    async fetch(request, env, ctx) {
        // If it's an /api route, handle it in handleRequest. Otherwise let static serve
        const url = new URL(request.url);
        if (url.pathname.startsWith("/api")) {
            const response = await (0, router_1.handleRequest)(request, env);
            if (response) {
                return response;
            }
        }
        // Wrangler will automatically serve static assets for other paths
        // so just return a default 404 if not found:
        return new Response("Not found", { status: 404 });
    }
};
