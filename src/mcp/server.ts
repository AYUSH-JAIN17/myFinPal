import { Server } from "@modelcontextprotocol/sdk/server/index.js";

// ==================== SERVER INSTANCE ====================

export const server = new Server(
  {
    name: "myfinpal",
    version: "1.0.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  }
);
