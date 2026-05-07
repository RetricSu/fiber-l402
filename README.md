# Fiber L402 (Simplified)

A simplified L402 paywall demo using native fnn x402 support.

## Architecture

- **No proxy server** — direct browser-to-fnn x402 communication
- **Static Astro build** — articles embedded at build time
- **Native x402 endpoints** — uses fnn's built-in `/supported`, `/verify`, `/settle`

## Prerequisites

- Node.js 20+
- pnpm 9+
- Running Fiber node with x402 module enabled (RPC module `x402`)

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Set your node's pubkey in `.env`:
```env
PUBLIC_PAY_TO_PUBKEY=your-node-pubkey-hex
```

3. Build and serve:
```bash
pnpm build
cd apps/web && pnpm preview
```

## How It Works

1. Articles are loaded from `src/content/articles/` at build time
2. Each article has a `price` in CKB in its frontmatter
3. When user clicks "Unlock", the frontend:
   - Generates an invoice via the connected node's `new_invoice` RPC
   - User pays the invoice (auto via connected node or manual)
   - Frontend verifies payment via fnn's native `/verify` endpoint
   - Content unlocks and is cached in localStorage

## Differences from Original

- Removed Express proxy server
- Removed L402Middleware and macaroon-based auth
- Removed `@fiber-pay/sdk` server-side dependency
- Uses fnn's native x402 HTTP endpoints instead
- Static build instead of server-rendered

## License

MIT