# MyFinPal

A personal finance management application with an MCP server, REST API, and Angular frontend.

## Features

- **Transactions** - Track income and expenses with auto-categorization
- **Budgets** - Set monthly spending limits with alerts
- **Savings Goals** - Create goals and track progress
- **Recurring** - Automate subscriptions and regular payments
- **Analytics** - Spending insights and charts
- **Multi-Currency** - 12 currencies with live exchange rates
- **MCP Server** - Use with AI assistants via Model Context Protocol

## Quick Start

### Prerequisites
- Node.js 18+
- npm 9+

### Installation

```bash
# Install dependencies
npm install
cd frontend && npm install && cd ..

# Build
npm run build
cd frontend && npm run build
```

### Running

```bash
# Start API server (Terminal 1)
npm run start:api

# Start frontend (Terminal 2)
cd frontend && npm start
```

### MCP Server

```bash
npm run start:mcp
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Build backend |
| `npm run start:api` | Start REST API (port 3000) |
| `npm run start:mcp` | Start MCP server |

## License

MIT
