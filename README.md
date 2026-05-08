# Fiber L402

An L402 paywall demo built on Fiber Network.

> **Note:** This repository implements L402 at the **application level** — using `@fiber-pay/sdk` to manually handle invoice generation, payment verification, and settlement in the Express backend. This approach requires more boilerplate and custom middleware.
>
> For a **simplified, native x402 approach**, see our new demo: [fiber-x402-blog](https://github.com/RetricSu/fiber-x402-blog) — it leverages Fiber Network's built-in x402 module (fnn native) and requires significantly less code.

## Historical Context

This was our first L402 paywall implementation. It uses `@fiber-pay/sdk@0.2.0` directly and is aligned with Fiber node `0.8.x`. The custom L402 middleware in `apps/proxy/` handles the full payment flow: issuing macaroons, generating invoices, verifying preimages, and serving paid content.

## Project Structure

```text
fiber-l402/
├── apps/
│   ├── proxy/           # Express API + custom L402 middleware
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

```
GET /api/articles/:id/content
  -> 402 WWW-Authenticate: L402 macaroon=..., invoice=...
  -> pay invoice with Fiber
  -> retry with Authorization: L402 <macaroon>[:<preimage>]
  -> 200 + full article content
```

## New Demo: fiber-x402-blog

We now recommend **[fiber-x402-blog](https://github.com/RetricSu/fiber-x402-blog)** for new projects. It uses Fiber Network's **native x402 module** (built into fnn), which eliminates the need for custom L402 middleware.

Key differences:

| | fiber-l402 (this repo) | fiber-x402-blog |
|---|---|---|
| **L402 implementation** | Application-level via `@fiber-pay/sdk` | Native x402 module in fnn |
| **Backend complexity** | Express proxy with custom middleware | Astro API routes only |
| **Node requirement** | Standard Fiber node `0.8.x` | Fiber node with x402 PR ([fiber#1301](https://github.com/nervosnetwork/fiber/pull/1301)) |
| **Code size** | Larger (manual invoice/verify/settle) | Smaller (delegates to fnn endpoints) |

If you're starting fresh, use [fiber-x402-blog](https://github.com/RetricSu/fiber-x402-blog). This repo remains as a reference for application-level L402 implementations.

## Notes

- `pnpm test` runs Vitest unit/integration tests only.
- Playwright specs in `e2e/` should be run with Playwright tooling.

## License

MIT
