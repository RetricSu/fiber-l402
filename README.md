# Fiber L402 Payment Proxy

A monorepo for building L402 (Lightning 402) payment proxies on the [Fiber Network](https://github.com/nervosnetwork/fiber) for CKB.

## Overview

Fiber L402 enables pay-per-use API access using Fiber Network payment channels. This project provides:

- **Payment Gateway**: L402 payment proxy for API monetization
- **Web Dashboard**: Management interface for payments and channels
- **TypeScript SDK**: Type definitions and utilities

## Tech Stack

| Component | Technology |
|-----------|------------|
| Language | TypeScript 5.6+ |
| Runtime | Node.js 20+ |
| Package Manager | pnpm 9+ |
| Blockchain | CKB + Fiber Network |
| Frontend | Astro + React |
| Backend | Express.js |
| Testing | Vitest + Playwright |

## Project Structure

```
fiber-l402/
├── apps/
│   ├── proxy/          # L402 payment proxy service (port 3001)
│   └── web/            # Management dashboard (port 4321)
├── packages/
│   └── types/          # Shared TypeScript definitions
├── e2e/                # Playwright E2E tests
├── docs/               # Documentation
└── .sisyphus/          # Task tracking & evidence
```

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web Client    │────▶│  L402 Proxy     │────▶│  Fiber Node     │
│   (Astro)       │     │  (Express)      │     │  (CKB Network)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                        │
        │                        ▼
        │               ┌─────────────────┐
        └──────────────▶│  Article Store  │
                        │  (JSON files)   │
                        └─────────────────┘
```

**Data Flow:**
1. User requests paid content from Web Client
2. Proxy returns 402 Payment Required with L402 challenge (macaroon + invoice)
3. User pays via Fiber Network and submits preimage
4. Proxy verifies payment and returns content
5. Credentials are cached locally for future access

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Access to a Fiber Network node (for full functionality)

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Development

```bash
# Start all services in development mode
pnpm dev

# Services will be available at:
# - Web dashboard: http://localhost:4321
# - Proxy API: http://localhost:3001
```

### Testing

```bash
# Run unit tests
pnpm test:unit

# Run integration tests
pnpm test:integration

# Run E2E tests (requires dev servers running)
pnpm test:e2e

# Run all tests with coverage
pnpm test:coverage
```

## Environment Variables

### Proxy (`apps/proxy/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Proxy server port |
| `L402_ROOT_KEY` | - | 32-byte hex key for macaroon signing (64 chars) |
| `ARTICLE_PRICE_CKB` | 100 | Default article price in CKB |
| `L402_EXPIRY_SECONDS` | 3600 | Payment challenge expiry time |
| `FIBER_RPC_URL` | http://127.0.0.1:8227 | Fiber node RPC endpoint |
| `WEB_URL` | http://localhost:4321 | Allowed CORS origin |

### Web (`apps/web/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PROXY_URL` | http://localhost:3001 | Proxy API base URL |

## API Endpoints

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/articles` | List all articles (metadata only) |
| GET | `/api/articles/:id` | Get article metadata |

### Protected Endpoints (L402)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/articles/:id/content` | Get full article content (requires L402 payment) |

### L402 Payment Flow

1. Request content without auth → 402 Payment Required
   ```json
   {
     "macaroon": "...",
     "invoice": "..."
   }
   ```

2. Pay invoice via Fiber Network

3. Request with auth header → 200 OK
   ```
   Authorization: L402 <macaroon>:<preimage>
   ```

## Documentation

- [Setup Guide](./SETUP.md) - Detailed installation and configuration
- [Architecture](./docs/architecture.md) - System design and data flow
- [API Reference](./docs/api.md) - Complete API documentation

## License

MIT
