# L402 Payment Proxy on Fiber Network

## TL;DR

> **Project**: Build an L402 (Lightning HTTP 402) payment proxy on Fiber Network with an Astro frontend demo showing paid blog articles.
>
> **Architecture**: pnpm workspace with Express proxy (L402 middleware + Fiber integration) and Astro web frontend (React islands for payment UI).
>
> **Deliverables**:
> - `apps/proxy`: Express server with L402 middleware, invoice creation, preimage verification
> - `apps/web`: Astro + React islands, article preview/paywall UI, payment flow
> - `packages/types`: Shared TypeScript interfaces
> - Demo: 3 paid articles with payment flow
>
> **Estimated Effort**: Medium (~8-12 hours)
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Bootstrap → Types → Fiber SDK Verification → L402 Middleware → Invoice Service → Astro Frontend → Payment UI → Integration

---

## Context

### Original Request
> "开个新坑，已经在project root 里了，这个项目想去探索 l402 在fiber上的集成，大概是要做一个nodejs 的项目，通过后端一层proxy去控制资源和请求生成invoice这些。fiber sdk就用 @fiber-pay/sdk 的 0.1.0版，脚手架需要用typescript和pnpm，走workspace吧， 还有一个现代化的前端，可以看看是不是 astro这种博客可以适合接入作为一个例子？"

### Interview Summary
**Key Discussions**:
- **Frontend**: Astro + React Islands (SSR mode) — chosen over Next.js for content-focused demo
- **Demo Scene**: Paid blog articles — users pay CKB to unlock full content
- **Fiber Node**: Local development (localhost:8227)
- **SDK**: @fiber-pay/sdk v0.1.0 — user confirmed exists at npm

### Metis Review
**Identified Gaps** (addressed):
- **@fiber-pay/sdk availability**: Assumed available per user, with Fiber RPC fallback documented
- **Astro SSR vs Proxy separation**: Clarified — Proxy runs standalone Express (port 3001), Astro handles frontend only (port 4321)
- **State management**: In-memory Map for MVP (Redis explicitly excluded)
- **WebSocket vs Polling**: Polling only for MVP (3-second intervals)
- **Anonymous only**: No user accounts (reduces scope)
- **Static articles**: File-based MDX content (no database for MVP)

---

## Work Objectives

### Core Objective
Build a working L402 payment proxy that integrates with Fiber Network to gate blog articles behind micropayments, demonstrating the complete flow: request → 402 challenge → invoice payment → content access.

### Concrete Deliverables
- `apps/proxy/src/middleware/l402.ts` — L402 challenge issuance and validation
- `apps/proxy/src/services/invoice.ts` — Fiber invoice creation via @fiber-pay/sdk
- `apps/proxy/src/services/article.ts` — Article content management with paywall logic
- `apps/web/src/pages/articles/[id].astro` — Article page with preview/paywall
- `apps/web/src/components/PaymentGate.tsx` — React island for payment flow
- 3 demo articles in `apps/web/content/articles/`

### Definition of Done
- [ ] `curl localhost:3001/api/articles/1` without auth returns 402 + invoice
- [ ] Same request with valid `Authorization: L402 <macaroon>:<preimage>` returns full article
- [ ] Frontend shows preview, payment button, unlocks content after payment
- [ ] Complete payment flow tested against local Fiber node

### Must Have
- L402 middleware (402 challenge, macaroon + preimage verification)
- Fiber invoice integration (@fiber-pay/sdk or RPC fallback)
- Astro frontend with article display
- React payment UI island
- 3 demo articles with previews
- In-memory session store
- Polling-based payment status updates

### Must NOT Have (Guardrails)
- **Redis** — In-memory only for MVP
- **User accounts/authentication** — Anonymous L402 only
- **WebSocket real-time updates** — Polling only
- **Refund mechanism** — Out of scope
- **Production deployment configs** — Local dev only
- **Multiple pricing tiers** — Fixed price per article
- **Admin panel** — Manual file editing
- **Separate l402-middleware package** — Keep in apps/proxy until proven reusable

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: NO (greenfield project)
- **Automated tests**: TDD — Each task follows RED → GREEN → REFACTOR
- **Framework**: vitest (unit), playwright (e2e)

### QA Policy
Every task MUST include agent-executed QA scenarios:
- **Backend**: Use Bash (curl) — Send requests, assert status + headers + body
- **Frontend/UI**: Use Playwright — Navigate, interact, assert DOM, screenshot
- **Integration**: Bash (curl) against running services

Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation + Verification):
├── Task 1: Project bootstrap (pnpm workspace, TypeScript config) [quick]
├── Task 2: Types package (shared interfaces) [quick]
├── Task 3: Fiber SDK verification spike [quick]
└── Task 4: Vitest + test utilities setup [quick]

Wave 2 (Backend Core - MAX PARALLEL):
├── Task 5: L402 middleware scaffold (types, structure) [quick]
├── Task 6: Invoice service (Fiber integration) [unspecified-high]
├── Task 7: Macaroon service (minting, verification) [quick]
├── Task 8: Article service (content loading, paywall logic) [quick]
└── Task 9: L402 middleware full implementation (challenge + verify) [deep]

Wave 3 (Frontend + Integration):
├── Task 10: Astro scaffold + configuration [quick]
├── Task 11: Article pages + MDX content [quick]
├── Task 12: React PaymentGate island [visual-engineering]
├── Task 13: L402 client fetch interceptor [quick]
└── Task 14: Integration wiring (proxy + web) [unspecified-high]

Wave 4 (Content + Polish):
├── Task 15: 3 demo articles [writing]
├── Task 16: Error handling + UX polish [visual-engineering]
├── Task 17: Documentation (README, setup guide) [writing]
└── Task 18: End-to-end tests (Playwright) [unspecified-high]

Wave FINAL (Verification):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)

Critical Path: Task 1 → Task 2 → Task 3 → Task 6 → Task 9 → Task 14 → Task 18 → F1-F4
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|------------|--------|
| 1 | — | 2, 3, 4 |
| 2 | 1 | 5, 6, 8 |
| 3 | 1 | 6 |
| 4 | 1 | 5, 6, 7, 8, 9 |
| 5 | 2, 4 | 9 |
| 6 | 2, 3, 4 | 9 |
| 7 | 2, 4 | 9 |
| 8 | 2, 4 | 9, 11 |
| 9 | 5, 6, 7 | 14 |
| 10 | 1 | 11, 12, 13 |
| 11 | 8, 10 | 14, 15 |
| 12 | 10 | 14, 16 |
| 13 | 10 | 14 |
| 14 | 9, 11, 12, 13 | 16, 18 |
| 15 | 11 | 16 |
| 16 | 12, 14, 15 | 18 |
| 17 | — | — (parallel) |
| 18 | 14, 16 | F1-F4 |

---

## TODOs

- [x] 1. Project Bootstrap (pnpm workspace + TypeScript)

  **What to do**:
  - Initialize pnpm workspace root with `package.json`
  - Create `pnpm-workspace.yaml` with `apps/*` and `packages/*` globs
  - Add root `tsconfig.base.json` with strict settings
  - Create folder structure: `apps/proxy`, `apps/web`, `packages/types`
  - Add `.gitignore` (node_modules, dist, .astro, etc.)
  - Add `README.md` with project overview

  **Must NOT do**:
  - Install any app-specific dependencies (only root-level tooling)
  - Configure specific frameworks yet (Express, Astro come later)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - **Reason**: Simple file creation and configuration

  **Parallelization**:
  - **Can Run In Parallel**: NO (foundation task)
  - **Blocks**: Tasks 2, 3, 4, 10, 17

  **References**:
  - Pattern: Standard pnpm workspace structure
  - Example: `pnpm init` + workspace config

  **Acceptance Criteria**:
  - [ ] `pnpm -v` works in project root
  - [ ] `pnpm-workspace.yaml` exists with correct globs
  - [ ] `tsconfig.base.json` extends `@tsconfig/node20`
  - [ ] Directory structure `apps/proxy`, `apps/web`, `packages/types` exists

  **QA Scenarios**:
  ```
  Scenario: Workspace structure valid
    Tool: Bash
    Steps:
      1. Run: cat pnpm-workspace.yaml
      2. Assert: Output contains "apps/*" and "packages/*"
      3. Run: ls apps/ && ls packages/
      4. Assert: Directories proxy, web, types exist
    Expected Result: All workspace directories present
    Evidence: .sisyphus/evidence/task-1-structure.txt
  ```

  **Commit**: YES
  - Message: `chore: bootstrap pnpm workspace with TypeScript config`
  - Files: All root config files

---

- [x] 2. Types Package (Shared Interfaces)

  **What to do**:
  - Create `packages/types/package.json` with `"main": "./dist/index.js"`
  - Add `packages/types/tsconfig.json` extending base
  - Define TypeScript interfaces:
    - `Article` (id, title, content, preview, price)
    - `Invoice` (paymentHash, invoiceAddress, amount, expiry)
    - `L402Token` (macaroon, preimage)
    - `PaymentSession` (id, articleId, invoice, status, createdAt)
  - Export all from `packages/types/src/index.ts`
  - Configure build output to `dist/`

  **Must NOT do**:
  - Add runtime logic (types only)
  - Depend on external packages (pure types)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - **Reason**: Type definitions only

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 3, 4)
  - **Blocked By**: Task 1
  - **Blocks**: Tasks 5, 6, 8

  **Acceptance Criteria**:
  - [ ] `packages/types/package.json` exists
  - [ ] All interfaces defined in `src/index.ts`
  - [ ] `pnpm build` (from types dir) outputs to `dist/`
  - [ ] Types can be imported: `import { Article } from '@fiber-l402/types'`

  **QA Scenarios**:
  ```
  Scenario: Types package builds
    Tool: Bash
    Preconditions: Task 1 complete
    Steps:
      1. Run: cd packages/types && pnpm build
      2. Assert: dist/index.js and dist/index.d.ts created
      3. Run: node -e "const t = require('./dist/index.js'); console.log(typeof t.Article)"
    Expected Result: Build succeeds, types exported
    Evidence: .sisyphus/evidence/task-2-types.txt
  ```

  **Commit**: YES
  - Message: `feat(types): add shared Article, Invoice, L402 interfaces`
  - Files: `packages/types/*`

---

- [x] 3. Fiber SDK Verification Spike

  **What to do**:
  - Add `@fiber-pay/sdk` dependency to temporary test package
  - Write spike test: Import SDK, check available exports
  - Document the SDK API (createInvoice, getPayment, etc.)
  - If SDK unavailable, document Fiber RPC fallback approach
  - Test connection to localhost:8227 (if Fiber node running)

  **Must NOT do**:
  - Build full integration yet (verification only)
  - Commit SDK credentials if any

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - **Reason**: Investigation task

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 2, 4)
  - **Blocked By**: Task 1
  - **Blocks**: Task 6

  **Acceptance Criteria**:
  - [ ] SDK imports without error OR documented fallback approach
  - [ ] API surface documented in `docs/fiber-sdk.md`
  - [ ] Connection test to localhost:8227 (success or documented failure)

  **QA Scenarios**:
  ```
  Scenario: SDK available
    Tool: Bash
    Steps:
      1. Run: pnpm add @fiber-pay/sdk
      2. Run: node -e "const sdk = require('@fiber-pay/sdk'); console.log(Object.keys(sdk))"
      3. Assert: SDK exports documented methods
    Expected Result: SDK imports and has expected API
    Evidence: .sisyphus/evidence/task-3-sdk.txt
  ```

  **Commit**: YES (documentation only, no SDK in main deps yet)
  - Message: `docs: document Fiber SDK API and fallback options`
  - Files: `docs/fiber-sdk.md`

---

- [x] 4. Vitest + Test Utilities Setup

  **What to do**:
  - Install `vitest`, `@vitest/coverage-v8` at root
  - Create `vitest.config.ts` with workspace support
  - Add `vitest.workspace.ts` for monorepo
  - Configure test scripts in root `package.json`
  - Create `packages/test-utils` with shared helpers:
    - `createMockFiberNode()` — mock Fiber RPC responses
    - `generateTestMacaroon()` — create test tokens
    - `createTestArticle()` — fixture factory
  - Add `test:unit`, `test:integration`, `test:e2e` scripts

  **Must NOT do**:
  - Write actual tests yet (setup only)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - **Reason**: Configuration task

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 2, 3)
  - **Blocked By**: Task 1
  - **Blocks**: Tasks 5, 6, 7, 8, 9

  **Acceptance Criteria**:
  - [ ] `vitest.config.ts` exists
  - [ ] `pnpm test` runs vitest
  - [ ] `packages/test-utils` can be imported
  - [ ] Mock helpers work in a sample test

  **QA Scenarios**:
  ```
  Scenario: Vitest runs
    Tool: Bash
    Steps:
      1. Run: pnpm test
      2. Assert: Vitest starts with 0 tests (setup only)
      3. Run: pnpm vitest run --reporter=verbose
      4. Assert: No configuration errors
    Expected Result: Test framework operational
    Evidence: .sisyphus/evidence/task-4-vitest.txt
  ```

  **Commit**: YES
  - Message: `chore(test): setup vitest with workspace and test utilities`
  - Files: `vitest.config.ts`, `packages/test-utils/*`

---

- [x] 5. L402 Middleware Scaffold (Types, Structure)

  **What to do**:
  - Create `apps/proxy/package.json` with Express, macaroon deps
  - Add `apps/proxy/tsconfig.json`
  - Create middleware structure:
    - `apps/proxy/src/types/l402.ts` — L402-specific types
    - `apps/proxy/src/middleware/l402.ts` — Middleware stub
  - Define interfaces:
    - `L402Config` (rootKey, expirySeconds)
    - `L402Challenge` (macaroon, invoice)
    - `L402Request` (express.Request + l402 context)
  - Add stub middleware function (no logic yet)

  **Must NOT do**:
  - Implement actual verification logic (Task 9)
  - Connect to Fiber yet (Task 6)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - **Reason**: Type definitions and structure

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 6, 7, 8)
  - **Blocked By**: Tasks 2, 4
  - **Blocks**: Task 9

  **Acceptance Criteria**:
  - [ ] `apps/proxy` package structure exists
  - [ ] Express + macaroon in dependencies
  - [ ] Type definitions compile
  - [ ] Middleware stub can be imported

  **QA Scenarios**:
  ```
  Scenario: Proxy package compiles
    Tool: Bash
    Steps:
      1. Run: cd apps/proxy && pnpm install
      2. Run: npx tsc --noEmit
      3. Assert: No TypeScript errors
    Expected Result: Clean compilation
    Evidence: .sisyphus/evidence/task-5-proxy-structure.txt
  ```

  **Commit**: YES
  - Message: `feat(proxy): scaffold L402 middleware types and structure`
  - Files: `apps/proxy/*` (excluding service implementations)

---

- [ ] 6. Invoice Service (Fiber Integration)

  **What to do**:
  - Create `apps/proxy/src/services/invoice.ts`
  - Implement `InvoiceService` class:
    - `createInvoice(amount, description)` → calls Fiber SDK/RPC
    - `getPaymentStatus(paymentHash)` → checks if paid
    - `parseInvoiceAddress(address)` → extracts payment hash
  - Handle @fiber-pay/sdk OR Fiber RPC fallback:
    ```typescript
    // Try SDK first, fallback to direct RPC
    const invoice = await this.sdk?.createInvoice(...) ?? 
                    await this.rpcCall('new_invoice', ...);
    ```
  - Add error handling for node unreachable
  - Write unit tests with mocked Fiber responses

  **Must NOT do**:
  - Implement payment verification (Task 9)
  - Handle macaroon logic (Task 7)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []
  - **Reason**: Complex integration with external system

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 5, 7, 8)
  - **Blocked By**: Tasks 2, 3, 4
  - **Blocks**: Task 9

  **Acceptance Criteria**:
  - [ ] `InvoiceService` creates invoices via Fiber
  - [ ] Unit tests pass with mocks
  - [ ] Handles SDK unavailable (fallback to RPC)
  - [ ] Error handling for node connection failures

  **QA Scenarios**:
  ```
  Scenario: Create invoice via Fiber
    Tool: Bash
    Steps:
      1. Run: pnpm test apps/proxy/src/services/invoice.test.ts
      2. Assert: Tests pass with mocked Fiber response
      3. If Fiber node running:
         - Run: curl -X POST http://localhost:8227 ... (create invoice)
         - Assert: Returns valid invoice address
    Expected Result: Invoice creation works
    Evidence: .sisyphus/evidence/task-6-invoice.txt
  ```

  **Commit**: YES
  - Message: `feat(proxy): add InvoiceService with Fiber SDK integration`
  - Files: `apps/proxy/src/services/invoice.ts`, `*.test.ts`

---

- [x] 7. Macaroon Service (Minting, Verification)

  **What to do**:
  - Create `apps/proxy/src/services/macaroon.ts`
  - Implement `MacaroonService` class:
    - `mint(identifier, paymentHash, caveats)` → create macaroon
    - `verify(macaroon, preimage, rootKey)` → validate token
    - `extractCaveats(macaroon)` → parse restrictions
  - Use `macaroon` npm package:
    - Root key from env or generated
    - First-party caveats: payment_hash, expiry, article_id
  - Implement SHA256 verification: `hash(preimage) === paymentHash`
  - Handle base64 encoding/decoding
  - Write unit tests

  **Must NOT do**:
  - Connect to HTTP middleware yet (Task 9)
  - Handle business logic (pricing, article access)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - **Reason**: Cryptographic operations, well-defined

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 5, 6, 8)
  - **Blocked By**: Tasks 2, 4
  - **Blocks**: Task 9

  **Acceptance Criteria**:
  - [ ] Can mint macaroon with caveats
  - [ ] Can verify valid preimage against payment hash
  - [ ] Rejects invalid/expired tokens
  - [ ] Unit tests cover happy path and failures

  **QA Scenarios**:
  ```
  Scenario: Macaroon mint and verify
    Tool: Bash
    Steps:
      1. Run: pnpm test apps/proxy/src/services/macaroon.test.ts
      2. Assert: All tests pass
      3. Manual test: 
         - Mint macaroon with payment_hash caveat
         - Verify with matching preimage → passes
         - Verify with wrong preimage → fails
    Expected Result: Cryptographic verification correct
    Evidence: .sisyphus/evidence/task-7-macaroon.txt
  ```

  **Commit**: YES
  - Message: `feat(proxy): add MacaroonService for token minting and verification`
  - Files: `apps/proxy/src/services/macaroon.ts`, `*.test.ts`

---

- [x] 8. Article Service (Content Loading, Paywall Logic)

  **What to do**:
  - Create `apps/proxy/src/services/article.ts`
  - Implement `ArticleService` class:
    - `loadAll()` → load MDX/markdown files from disk
    - `getById(id)` → return article metadata
    - `getPreview(id)` → return truncated content
    - `getFullContent(id)` → return complete article (requires auth)
  - Store articles as JSON/MDX files in `apps/proxy/content/articles/`
  - Each article: id, title, author, price (CKB), preview, content
  - In-memory cache (Map) for loaded articles
  - Write unit tests

  **Must NOT do**:
  - Database integration (static files only)
  - Handle payment gating (middleware does this)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - **Reason**: File I/O operations

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 5, 6, 7)
  - **Blocked By**: Tasks 2, 4
  - **Blocks**: Task 9, 11

  **Acceptance Criteria**:
  - [ ] Loads articles from `content/articles/`
  - [ ] Returns preview (first 200 chars) vs full content
  - [ ] Caches loaded articles
  - [ ] Unit tests with mock files

  **QA Scenarios**:
  ```
  Scenario: Article loading
    Tool: Bash
    Steps:
      1. Create test article file
      2. Run: pnpm test apps/proxy/src/services/article.test.ts
      3. Assert: Service loads and returns articles
      4. Assert: Preview is truncated version
    Expected Result: Content loading works
    Evidence: .sisyphus/evidence/task-8-article.txt
  ```

  **Commit**: YES
  - Message: `feat(proxy): add ArticleService for content loading`
  - Files: `apps/proxy/src/services/article.ts`, `content/articles/`, `*.test.ts`

---

- [ ] 9. L402 Middleware Full Implementation

  **What to do**:
  - Complete `apps/proxy/src/middleware/l402.ts`
  - Implement full Express middleware:
    ```typescript
    async function l402Middleware(req, res, next) {
      const auth = req.headers['authorization'];
      
      // No auth → Issue 402 challenge
      if (!auth || !auth.startsWith('L402 ')) {
        const challenge = await createChallenge(req);
        return res.status(402)
          .set('WWW-Authenticate', `L402 macaroon="${challenge.macaroon}", invoice="${challenge.invoice}"`)
          .json({ error: 'Payment Required', invoice: challenge.invoice });
      }
      
      // Parse and verify
      const [, token] = auth.split(' ');
      const [macaroon, preimage] = token.split(':');
      const valid = await verifyL402(macaroon, preimage);
      
      if (!valid) {
        return res.status(401).json({ error: 'Invalid payment proof' });
      }
      
      req.l402 = { valid: true, preimage };
      next();
    }
    ```
  - Integrate with InvoiceService, MacaroonService
  - Add rate limiting (in-memory, per IP)
  - Write integration tests

  **Must NOT do**:
  - Add HTTP server startup (Task 14)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []
  - **Reason**: Core business logic, security-critical

  **Parallelization**:
  - **Can Run In Parallel**: NO (combines previous work)
  - **Blocked By**: Tasks 5, 6, 7
  - **Blocks**: Task 14

  **Acceptance Criteria**:
  - [ ] No auth → Returns 402 with macaroon + invoice
  - [ ] Valid auth → Attaches req.l402, calls next()
  - [ ] Invalid auth → Returns 401
  - [ ] Rate limiting prevents abuse
  - [ ] Integration tests pass

  **QA Scenarios**:
  ```
  Scenario: 402 challenge issued
    Tool: Bash
    Steps:
      1. Start proxy server (if not running)
      2. Run: curl -i http://localhost:3001/api/test
      3. Assert: Status 402
      4. Assert: Header contains 'WWW-Authenticate: L402'
      5. Assert: Body contains invoice address
    Expected Result: Challenge issued correctly
    Evidence: .sisyphus/evidence/task-9-402-challenge.txt

  Scenario: Valid L402 access
    Tool: Bash
    Steps:
      1. Get challenge (previous scenario)
      2. Pay invoice (simulate or real)
      3. Run: curl -H "Authorization: L402 <macaroon>:<preimage>" http://localhost:3001/api/test
      4. Assert: Status 200
    Expected Result: Access granted with valid proof
    Evidence: .sisyphus/evidence/task-9-valid-access.txt

  Scenario: Invalid preimage rejected
    Tool: Bash
    Steps:
      1. Run: curl -H "Authorization: L402 fake:fake" http://localhost:3001/api/test
      2. Assert: Status 401
      3. Assert: Body contains error message
    Expected Result: Invalid proof rejected
    Evidence: .sisyphus/evidence/task-9-invalid-rejected.txt
  ```

  **Commit**: YES
  - Message: `feat(proxy): implement full L402 middleware with challenge and verification`
  - Files: `apps/proxy/src/middleware/l402.ts`, `*.test.ts`

---

- [ ] 10. Astro Scaffold + Configuration

  **What to do**:
  - Create `apps/web/package.json` with Astro, React, @astrojs/react
  - Add `apps/web/astro.config.mjs`:
    - Enable React islands
    - Configure SSR output (output: 'server')
    - Port 4321 (Astro default)
  - Create `apps/web/tsconfig.json`
  - Setup folder structure:
    - `src/pages/` — Astro routes
    - `src/components/` — React islands
    - `src/layouts/` — Page layouts
    - `content/articles/` — Article MDX files
  - Add base layout and index page
  - Verify dev server starts

  **Must NOT do**:
  - Article pages yet (Task 11)
  - Payment components yet (Task 12)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - **Reason**: Framework setup

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 5-9 backend work)
  - **Blocked By**: Task 1
  - **Blocks**: Tasks 11, 12, 13

  **Acceptance Criteria**:
  - [ ] `pnpm dev` in apps/web starts Astro server
  - [ ] Homepage loads at http://localhost:4321
  - [ ] React islands enabled and working
  - [ ] SSR mode configured

  **QA Scenarios**:
  ```
  Scenario: Astro dev server runs
    Tool: Bash
    Steps:
      1. Run: cd apps/web && pnpm dev &
      2. Wait 3 seconds
      3. Run: curl http://localhost:4321
      4. Assert: Returns HTML with status 200
      5. Kill dev server
    Expected Result: Astro server operational
    Evidence: .sisyphus/evidence/task-10-astro.txt
  ```

  **Commit**: YES
  - Message: `feat(web): scaffold Astro with React islands and SSR`
  - Files: `apps/web/*` (config files, base layout, index page)

---

- [ ] 11. Article Pages + MDX Content

  **What to do**:
  - Create `apps/web/src/pages/articles/[id].astro` — Dynamic route
  - Implement article page:
    - Fetch article metadata from proxy API
    - Show preview content always
    - Show full content only if paid (client-side check)
    - Include PaymentGate component for unpaid
  - Create `apps/web/content/articles/` with 3 sample articles:
    - `bitcoin-lightning-history.mdx`
    - `fiber-network-overview.mdx`
    - `l402-protocol-explained.mdx`
  - Each article: frontmatter (title, author, date, price) + content
  - Style with basic CSS/Tailwind
  - Add articles list page (`/articles`)

  **Must NOT do**:
  - Payment flow UI (Task 12 handles this)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - **Reason**: Content and routing

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 10, uses Task 8 data)
  - **Blocked By**: Tasks 8, 10
  - **Blocks**: Tasks 14, 15

  **Acceptance Criteria**:
  - [ ] `/articles` lists all articles
  - [ ] `/articles/1` shows article with preview
  - [ ] Preview displays correctly
  - [ ] MDX renders properly

  **QA Scenarios**:
  ```
  Scenario: Article page loads
    Tool: Playwright
    Steps:
      1. Start web server
      2. Navigate to /articles/1
      3. Assert: Article title visible
      4. Assert: Preview content visible
      5. Screenshot: article-preview.png
    Expected Result: Article page renders
    Evidence: .sisyphus/evidence/task-11-article-page.png
  ```

  **Commit**: YES
  - Message: `feat(web): add article pages with MDX content`
  - Files: `apps/web/src/pages/articles/*`, `apps/web/content/articles/*`

---

- [ ] 12. React PaymentGate Island

  **What to do**:
  - Create `apps/web/src/components/PaymentGate.tsx`
  - Implement payment flow UI:
    - Display invoice address (QR code or copy)
    - Show payment amount
    - "Check Payment" button with loading state
    - Success state (content unlocked)
    - Error state (payment failed/expired)
  - Add polling for payment status (3-second intervals)
  - Cache preimage in localStorage for session persistence
  - Handle L402 retry flow:
    1. Store 402 response (macaroon)
    2. User pays via wallet
    3. Get preimage from wallet
    4. Retry request with `Authorization: L402 macaroon:preimage`
  - Style with Tailwind or CSS modules
  - Write component tests

  **Must NOT do**:
  - Direct wallet integration (users copy/pay manually)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []
  - **Reason**: UI components, React state management

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 11, 13)
  - **Blocked By**: Task 10
  - **Blocks**: Tasks 14, 16

  **Acceptance Criteria**:
  - [ ] Component renders invoice QR
  - [ ] Polling checks payment status
  - [ ] Unlocks content on successful payment
  - [ ] Handles errors gracefully

  **QA Scenarios**:
  ```
  Scenario: Payment gate displays
    Tool: Playwright
    Steps:
      1. Navigate to unpaid article
      2. Assert: PaymentGate component visible
      3. Assert: Invoice address displayed
      4. Assert: QR code or copy button present
      5. Screenshot: payment-gate.png
    Expected Result: Payment UI renders
    Evidence: .sisyphus/evidence/task-12-payment-gate.png
  ```

  **Commit**: YES
  - Message: `feat(web): add PaymentGate React island with polling`
  - Files: `apps/web/src/components/PaymentGate.tsx`, `*.test.tsx`

---

- [ ] 13. L402 Client Fetch Interceptor

  **What to do**:
  - Create `apps/web/src/lib/l402-client.ts`
  - Implement `fetchWithL402(url, options)`:
    ```typescript
    async function fetchWithL402(url, options = {}) {
      // Try cached credentials first
      const cached = getCachedToken(url);
      if (cached) {
        const res = await fetch(url, {
          ...options,
          headers: { ...options.headers, 'Authorization': `L402 ${cached.macaroon}:${cached.preimage}` }
        });
        if (res.status !== 402) return res;
      }
      
      // Get challenge
      const challenge = await fetch(url, options);
      if (challenge.status !== 402) return challenge;
      
      // Extract macaroon + invoice
      const wwwAuth = challenge.headers.get('WWW-Authenticate');
      const { macaroon, invoice } = parseL402Header(wwwAuth);
      
      // Return challenge info for UI handling
      return { status: 'L402_REQUIRED', macaroon, invoice };
    }
    ```
  - Handle localStorage caching
  - Export helper utilities
  - Write unit tests

  **Must NOT do**:
  - Wallet integration (stays manual for MVP)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - **Reason**: Client-side utilities

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 11, 12)
  - **Blocked By**: Task 10
  - **Blocks**: Task 14

  **Acceptance Criteria**:
  - [ ] fetchWithL402 handles 402 responses
  - [ ] Caches credentials in localStorage
  - [ ] Retries with cached token
  - [ ] Unit tests pass

  **QA Scenarios**:
  ```
  Scenario: Client handles 402
    Tool: Bash + mock server
    Steps:
      1. Mock server returns 402 with WWW-Authenticate
      2. Use fetchWithL402
      3. Assert: Returns challenge data (macaroon, invoice)
      4. Mock server accepts valid auth
      5. Retry with token
      6. Assert: Returns success response
    Expected Result: Client L402 flow works
    Evidence: .sisyphus/evidence/task-13-client.txt
  ```

  **Commit**: YES
  - Message: `feat(web): add L402 client fetch interceptor with caching`
  - Files: `apps/web/src/lib/l402-client.ts`, `*.test.ts`

---

- [ ] 14. Integration Wiring (Proxy + Web)

  **What to do**:
  - Wire up proxy endpoints:
    - `GET /api/articles` → list articles (public)
    - `GET /api/articles/:id` → article with preview (public)
    - `GET /api/articles/:id/content` → full content (L402 protected)
  - Update Astro article page to use real API:
    - Fetch article data from proxy
    - Use PaymentGate for payment flow
    - Call protected endpoint after payment
  - Setup CORS in proxy (allow localhost:4321)
  - Create `apps/proxy/src/server.ts` — Express server startup
  - Add dev scripts to run both services
  - Test end-to-end flow

  **Must NOT do**:
  - Production deployment configs

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []
  - **Reason**: Integration complexity

  **Parallelization**:
  - **Can Run In Parallel**: NO (final integration)
  - **Blocked By**: Tasks 9, 11, 12, 13
  - **Blocks**: Tasks 16, 18

  **Acceptance Criteria**:
  - [ ] Proxy and web run together
  - [ ] Article list loads from API
  - [ ] Payment flow unlocks content
  - [ ] End-to-end tests pass

  **QA Scenarios**:
  ```
  Scenario: End-to-end payment flow
    Tool: Bash + Playwright
    Steps:
      1. Start proxy (port 3001) and web (port 4321)
      2. Open browser to /articles/1
      3. Assert: Preview shown, payment gate visible
      4. Get invoice from UI
      5. Pay via Fiber node CLI
      6. Click "Check Payment" in UI
      7. Assert: Content unlocks
      8. Screenshot: unlocked-content.png
    Expected Result: Full flow works
    Evidence: .sisyphus/evidence/task-14-e2e-flow.png
  ```

  **Commit**: YES
  - Message: `feat: integrate proxy and web with full L402 flow`
  - Files: `apps/proxy/src/server.ts`, `apps/web/src/pages/articles/*` (updates)

---

- [ ] 15. 3 Demo Articles

  **What to do**:
  - Write 3 complete articles in `apps/web/content/articles/`:
    1. **"The History of Bitcoin Lightning Network"** (price: 100 CKB)
       - 800+ words covering 2015-2024
       - Preview: First 2 paragraphs
       
    2. **"Fiber Network: CKB's Layer 2"** (price: 150 CKB)
       - Technical overview of Fiber
       - Preview: Introduction + architecture diagram placeholder
       
    3. **"L402: The Protocol for Paid APIs"** (price: 200 CKB)
       - L402 spec explanation with code examples
       - Preview: Motivation + high-level flow
  - Each article includes:
    - Frontmatter: title, author, date, price, tags
    - Rich content with headings, code blocks, emphasis
    - Preview clearly marked (first X characters)

  **Must NOT do**:
  - Images (text-only for simplicity)

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: []
  - **Reason**: Content creation

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 16, 17)
  - **Blocked By**: Task 11
  - **Blocks**: Task 16

  **Acceptance Criteria**:
  - [ ] 3 articles in `content/articles/`
  - [ ] Each has price in frontmatter
  - [ ] Each has clear preview/full boundary
  - [ ] Content renders correctly

  **QA Scenarios**:
  ```
  Scenario: Articles render
    Tool: Playwright
    Steps:
      1. Navigate to each article
      2. Assert: Title, author, date visible
      3. Assert: Preview text shown
      4. Assert: Price displayed
      5. Screenshot: articles-list.png
    Expected Result: All articles render
    Evidence: .sisyphus/evidence/task-15-articles.png
  ```

  **Commit**: YES
  - Message: `content: add 3 demo articles for L402 showcase`
  - Files: `apps/web/content/articles/*`

---

- [ ] 16. Error Handling + UX Polish

  **What to do**:
  - Add comprehensive error handling:
    - Proxy: Graceful Fiber node down (503 with retry-after)
    - Web: Network errors, payment failures, timeouts
  - Improve UX:
    - Loading states for async operations
    - Error messages with actionable guidance
    - Success confirmations
    - Mobile responsiveness
  - Add copy-to-clipboard for invoice
  - Show payment countdown timer (invoice expiry)
  - Add "How to Pay" help section
  - Style polish with consistent colors/spacing

  **Must NOT do**:
  - Major feature additions

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []
  - **Reason**: UI/UX refinement

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 15, 17)
  - **Blocked By**: Task 14
  - **Blocks**: Task 18

  **Acceptance Criteria**:
  - [ ] Error boundaries handle crashes
  - [ ] Network errors show user-friendly messages
  - [ ] Loading states visible
  - [ ] Mobile layout works

  **QA Scenarios**:
  ```
  Scenario: Error states handled
    Tool: Playwright
    Steps:
      1. Stop proxy server
      2. Navigate to article
      3. Assert: Error message shown ("Service unavailable")
      4. Start proxy
      5. Refresh
      6. Assert: Content loads
    Expected Result: Graceful error handling
    Evidence: .sisyphus/evidence/task-16-errors.png
  ```

  **Commit**: YES
  - Message: `feat(web): add error handling, loading states, and UX polish`
  - Files: `apps/web/src/components/*` (updates), `apps/web/src/lib/error-handling.ts`

---

- [ ] 17. Documentation (README, Setup Guide)

  **What to do**:
  - Write comprehensive `README.md`:
    - Project overview and architecture
    - Prerequisites (Node.js, pnpm, Fiber node)
    - Installation steps
    - Development workflow
    - Testing commands
    - Project structure explanation
  - Add `docs/setup.md`:
    - Fiber node installation
    - Local development setup
    - Configuration options
  - Add `docs/architecture.md`:
    - L402 flow diagram
    - Component interaction
    - Security considerations
  - Add JSDoc to key functions

  **Must NOT do**:
  - Production deployment docs

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: []
  - **Reason**: Documentation

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 15, 16)
  - **Blocked By**: None (can start early)
  - **Blocks**: None

  **Acceptance Criteria**:
  - [ ] README has clear setup instructions
  - [ ] Architecture documented
  - [ ] Code has JSDoc comments
  - [ ] New developer can follow setup

  **QA Scenarios**:
  ```
  Scenario: Documentation complete
    Tool: Manual review
    Steps:
      1. Review README for completeness
      2. Verify all commands work as documented
      3. Check architecture diagram accuracy
    Expected Result: Documentation accurate and complete
    Evidence: .sisyphus/evidence/task-17-docs-review.txt
  ```

  **Commit**: YES
  - Message: `docs: add comprehensive README and architecture documentation`
  - Files: `README.md`, `docs/*`

---

- [ ] 18. End-to-End Tests (Playwright)

  **What to do**:
  - Install Playwright: `pnpm add -D @playwright/test`
  - Configure `playwright.config.ts` for monorepo
  - Write E2E test suite:
    - `homepage.spec.ts` — Articles list, navigation
    - `article.spec.ts` — Preview display, payment flow
    - `payment.spec.ts` — Full L402 payment and unlock
    - `error.spec.ts` — Error handling, recovery
  - Setup test fixtures:
    - Mock articles
    - Test Fiber node or mocks
  - Add `test:e2e` script
  - Run tests against running services

  **Must NOT do**:
  - Test against production

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []
  - **Reason**: E2E testing setup

  **Parallelization**:
  - **Can Run In Parallel**: NO (final verification)
  - **Blocked By**: Tasks 14, 16
  - **Blocks**: F1-F4

  **Acceptance Criteria**:
  - [ ] Playwright installed and configured
  - [ ] 4 test specs covering main flows
  - [ ] Tests pass against local services
  - [ ] Screenshots captured for evidence

  **QA Scenarios**:
  ```
  Scenario: E2E test suite runs
    Tool: Bash
    Steps:
      1. Run: pnpm test:e2e
      2. Assert: All tests pass
      3. Check: Screenshots in test-results/
    Expected Result: E2E tests comprehensive
    Evidence: .sisyphus/evidence/task-18-e2e-results.txt
  ```

  **Commit**: YES
  - Message: `test: add Playwright E2E test suite`
  - Files: `playwright.config.ts`, `e2e/*`, `.github/workflows/e2e.yml` (optional)

---

## Final Verification Wave

- [x] F1. **Plan Compliance Audit** — `oracle` — **COMPLETE**
  **Verdict: REJECT (with notes)**
  - Must Have: 6/7 ✅ (PaymentGate uses manual entry vs polling)
  - Must NOT Have: 7/8 ✅ (per-article pricing vs fixed price)
  - Evidence: 16/16 files present
  - Issues: 2 minor deviations from plan specs

- [x] F2. **Code Quality Review** — `unspecified-high` — **COMPLETE**
  **Verdict: REJECT (1 fixable issue)**
  - Build: PASS ✅
  - TypeScript: Clean (no as any, no @ts-ignore) ✅
  - Tests: 19 unit tests passing ✅
  - Issue: e2e/article.spec.ts:17 syntax error (space in method name)

- [x] F3. **Real Manual QA** — `unspecified-high` — **COMPLETE**
  **Verdict: CONDITIONAL APPROVE**
  - Scenarios: 4/5 passing ✅
  - Health check: PASS ✅
  - Article list: PASS ✅
  - Article detail: PASS ✅
  - L402 challenge: NEEDS Fiber node (returns 500 without it)
  - Web frontend: PASS ✅

- [x] F4. **Scope Fidelity Check** — `deep` — **COMPLETE**
  **Verdict: APPROVE**
  - Tasks: 16/18 fully compliant, 2 partial
  - Cross-task contamination: CLEAN ✅
  - Scope creep: None significant ✅
  - Unaccounted files: 1 minor (PaymentGate.css)

---

## Commit Strategy

- **Task 1**: `chore: bootstrap pnpm workspace with TypeScript config`
- **Task 2**: `feat(types): add shared Article, Invoice, L402 interfaces`
- **Task 3**: `docs: document Fiber SDK API and fallback options`
- **Task 4**: `chore(test): setup vitest with workspace and test utilities`
- **Task 5**: `feat(proxy): scaffold L402 middleware types and structure`
- **Task 6**: `feat(proxy): add InvoiceService with Fiber SDK integration`
- **Task 7**: `feat(proxy): add MacaroonService for token minting and verification`
- **Task 8**: `feat(proxy): add ArticleService for content loading`
- **Task 9**: `feat(proxy): implement full L402 middleware with challenge and verification`
- **Task 10**: `feat(web): scaffold Astro with React islands and SSR`
- **Task 11**: `feat(web): add article pages with MDX content`
- **Task 12**: `feat(web): add PaymentGate React island with polling`
- **Task 13**: `feat(web): add L402 client fetch interceptor with caching`
- **Task 14**: `feat: integrate proxy and web with full L402 flow`
- **Task 15**: `content: add 3 demo articles for L402 showcase`
- **Task 16**: `feat(web): add error handling, loading states, and UX polish`
- **Task 17**: `docs: add comprehensive README and architecture documentation`
- **Task 18**: `test: add Playwright E2E test suite`

---

## Success Criteria

### Verification Commands

```bash
# Project builds
pnpm install && pnpm build

# Tests pass
pnpm test

# Services start
pnpm dev:proxy  # port 3001
pnpm dev:web    # port 4321

# L402 flow works
curl -i http://localhost:3001/api/articles/1/content
# → 402 with WWW-Authenticate: L402 macaroon="...", invoice="..."

# After payment:
curl -H "Authorization: L402 <macaroon>:<preimage>" http://localhost:3001/api/articles/1/content
# → 200 with full article content
```

### Final Checklist

- [ ] All 18 tasks complete
- [ ] All F1-F4 verification agents approve
- [ ] 3 demo articles accessible via L402
- [ ] Full payment flow tested end-to-end
- [ ] Documentation complete
- [ ] Code quality checks pass
