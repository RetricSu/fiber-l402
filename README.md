# Fiber L402

An L402 paywall demo built on Fiber Network.

This repository no longer maintains a custom `@fiber-l402/sdk` package. The app now uses `@fiber-pay/sdk@0.2.0` directly and is aligned with Fiber node `0.8.x`.

## Project Structure

```text
fiber-l402/
├── apps/
│   ├── proxy/           # Express API + L402 middleware
│   └── web/             # Astro + React frontend
├── docs/
│   └── fiber-sdk.md     # Fiber SDK usage notes
└── e2e/                 # Playwright E2E tests
```

## Stack

- `@fiber-pay/sdk@0.2.0` for Fiber RPC + L402 primitives
- Express backend (`apps/proxy`)
- Astro + React frontend (`apps/web`)

## Quick Start

### 1. Install

```bash
pnpm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` at repository root:

```env
PORT=3001
L402_ROOT_KEY=<64-char-hex>
ARTICLE_PRICE_CKB=0.1
L402_EXPIRY_SECONDS=3600
FIBER_RPC_URL=http://127.0.0.1:8229

WEB_URL=http://localhost:4321
PROXY_URL=http://localhost:3001
```

Generate a random L402 root key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Run

```bash
pnpm dev
```

- Web: `http://localhost:4321`
- Proxy: `http://localhost:3001`

## L402 Flow

```text
GET /api/articles/:id/content
  -> 402 WWW-Authenticate: L402 macaroon=..., invoice=...
  -> pay invoice with Fiber
  -> retry with Authorization: L402 <macaroon>[:<preimage>]
  -> 200 + full article content
```

## Notes

- `pnpm test` runs Vitest unit/integration tests only.
- Playwright specs in `e2e/` should be run with Playwright tooling.

## License

MIT
