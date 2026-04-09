# Setup Guide

Complete setup guide for the Fiber L402 demo (Fiber node 0.8.x + `@fiber-pay/sdk@0.2.0`).

## Prerequisites

- Node.js 20+
- pnpm 9+
- Optional: a running Fiber node for real invoice/payment flow

Check versions:

```bash
node --version
pnpm --version
```

## Install

```bash
git clone <repository-url>
cd fiber-l402
pnpm install
```

## Environment

Create `.env` in the repository root (copy from `.env.example`):

```env
PORT=3001
L402_ROOT_KEY=your-32-byte-hex-key-here-64charslong
ARTICLE_PRICE_CKB=0.1
L402_EXPIRY_SECONDS=3600
FIBER_RPC_URL=http://127.0.0.1:8229

WEB_URL=http://localhost:4321
PROXY_URL=http://localhost:3001
```

Generate a valid root key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Run In Development

```bash
pnpm dev
```

Services:

- Proxy API: http://localhost:3001
- Web app: http://localhost:4321

## Verify

```bash
pnpm typecheck
pnpm test
```

Run E2E separately with Playwright:

```bash
pnpm exec playwright test
```

## Troubleshooting

Port already in use:

```bash
lsof -ti:3001 | xargs kill -9
lsof -ti:4321 | xargs kill -9
```

Reinstall dependencies:

```bash
rm -rf node_modules apps/*/node_modules
pnpm install
```
