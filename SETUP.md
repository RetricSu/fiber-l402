# Setup Guide

Complete guide for setting up the Fiber L402 Payment Proxy project.

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 20+ | JavaScript runtime |
| pnpm | 9+ | Package manager |
| Git | Latest | Version control |

### Optional (for full functionality)

| Software | Purpose |
|----------|---------|
| Fiber Node | Payment channel operations |
| CKB Node | Blockchain connectivity |

### Verify Prerequisites

```bash
# Check Node.js version
node --version  # Should be v20.x.x or higher

# Check pnpm version
pnpm --version  # Should be 9.x.x or higher
```

## Step-by-Step Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd fiber-l402
```

### 2. Install Dependencies

```bash
# Install all dependencies for the monorepo
pnpm install
```

This will install dependencies for:
- Root workspace
- `apps/proxy` - Payment proxy service
- `apps/web` - Web dashboard
- `packages/types` - Shared TypeScript types

### 3. Configure Environment Variables

#### Proxy Configuration

Create `apps/proxy/.env`:

```bash
cd apps/proxy
cp .env.example .env
```

Edit `.env` with your values:

```env
# Proxy Configuration
PORT=3001
L402_ROOT_KEY=your-32-byte-hex-key-here-64charslong
ARTICLE_PRICE_CKB=100
L402_EXPIRY_SECONDS=3600
FIBER_RPC_URL=http://127.0.0.1:8227

# Web Configuration  
WEB_URL=http://localhost:4321
PROXY_URL=http://localhost:3001
```

**Important:** Generate a secure root key:

```bash
# Generate a 32-byte hex key (64 characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Web Configuration

Create `apps/web/.env`:

```bash
cd apps/web
cp .env.example .env  # if exists, or create manually
```

```env
PROXY_URL=http://localhost:3001
```

### 4. Build the Project

```bash
# Build all packages
pnpm build
```

This compiles:
- TypeScript types package
- Proxy server
- Web dashboard

### 5. Start Development Servers

```bash
# From the project root
pnpm dev
```

This starts both services:
- **Proxy API**: http://localhost:3001
- **Web Dashboard**: http://localhost:4321

You should see output like:
```
[@fiber-l402/proxy] L402 Proxy server running on port 3001
[@fiber-l402/web]   🚀  astro  v5.x.x ready in 123 ms
[@fiber-l402/web]   └─ Local:    http://localhost:4321/
```

## Testing the Payment Flow

### 1. Browse Articles

1. Open http://localhost:4321/articles
2. You should see a list of available articles
3. Click on any article to view details

### 2. Test Free Content

Articles display:
- Title, author, date
- Preview text
- Price in CKB

### 3. Test Payment Flow

Without a real Fiber node, you can test the flow:

1. Click "Unlock for X CKB" button
2. You should see a payment challenge with:
   - Invoice address (simulated)
   - Instructions for payment
   - Preimage input field

3. The system will accept any preimage for testing:
   - Enter: `0x1234...` (any hex string)
   - Click "Verify Payment"
   - Content should unlock

### 4. Verify Persistence

1. Refresh the page
2. Content should remain unlocked (cached in localStorage)
3. Check browser DevTools → Application → LocalStorage

### 5. Test Error Handling

**Proxy Unreachable:**
1. Stop the proxy server (Ctrl+C)
2. Navigate to an article
3. Should see: "The content server is currently unreachable"

**Invalid Article:**
1. Visit `/articles/nonexistent`
2. Should see: "Article not found"

## Production Deployment

### Build for Production

```bash
# Build all packages
pnpm build

# Start production servers
# Proxy
cd apps/proxy
pnpm start

# Web (served by Astro)
cd apps/web
pnpm preview
```

### Docker Deployment (Optional)

```dockerfile
# Dockerfile for proxy
FROM node:20-alpine
WORKDIR /app
COPY apps/proxy/package.json ./
RUN npm install
COPY apps/proxy/dist ./dist
EXPOSE 3001
CMD ["node", "dist/server.js"]
```

## Troubleshooting

### Port Conflicts

If ports 3001 or 4321 are in use:

```bash
# Find and kill processes
lsof -ti:3001 | xargs kill -9
lsof -ti:4321 | xargs kill -9
```

### Dependency Issues

```bash
# Clean and reinstall
pnpm clean
pnpm install
pnpm build
```

### Type Errors

```bash
# Run type checking
pnpm typecheck
```

### Test Failures

```bash
# Run tests with verbose output
pnpm test -- --reporter=verbose
```

## Next Steps

- Read the [API Documentation](./docs/api.md)
- Learn about [L402 Protocol](./docs/l402.md)
- Set up a [Fiber Node](https://github.com/nervosnetwork/fiber)

## Support

For issues and questions:
- GitHub Issues: [project/issues]
- Documentation: [docs/](./docs/)
