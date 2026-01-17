#!/usr/bin/env node

/**
 * MyFinPal - Personal Finance MCP Server
 * 
 * A Model Context Protocol server that helps you track expenses,
 * manage budgets, and get AI-powered financial insights.
 * 
 * @module myfinpal
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { server } from './server.js';
import { registerResourceHandlers } from './resources.js';
import { registerToolHandlers } from './tools.js';
import { registerPromptHandlers } from './prompts.js';

// ==================== REGISTER ALL HANDLERS ====================

registerResourceHandlers();
registerToolHandlers();
registerPromptHandlers();

// ==================== START SERVER ====================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("🚀 MyFinPal MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
