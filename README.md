# Fiber L402

基于 [Fiber Network](https://github.com/nervosnetwork/fiber) 的 L402 付费协议实现，包含通用 SDK 和一个博客付费阅读的示例应用。

## 项目结构

```
fiber-l402/
├── packages/
│   └── sdk/             # @fiber-l402/sdk — 通用 L402 SDK
├── apps/
│   ├── proxy/           # 付费博客后端（Express，端口 3001）
│   └── web/             # 前端（Astro + React，端口 4321）
└── e2e/                 # E2E 测试
```

## L402 SDK (`@fiber-l402/sdk`)

一个框架无关的 L402 协议 SDK，可以脱离本项目独立使用。第三方开发者可以用它快速给自己的 API 加上付费逻辑。

### 包含内容

| 模块 | 说明 |
|------|------|
| **Types** | `Invoice`, `L402Token`, `L402Config`, `ProtectedResourceInfo` 等类型定义 |
| **MacaroonService** | Macaroon 签发、验证、caveat 提取 |
| **InvoiceService** | 通过 `@fiber-pay/sdk` 创建/查询 Fiber Network invoice |
| **L402Middleware** | Express 中间件，处理 402 challenge 和 token 验证 |
| **ResourceResolver** | 资源解析器接口和默认 Registry 实现 |

### 快速集成

```bash
# 如果发布到 npm 后
npm install @fiber-l402/sdk
```

#### 1. 最简用法 — 用中间件保护你的 Express 路由

```typescript
import express from 'express';
import { createL402Middleware } from '@fiber-l402/sdk';

const app = express();

// 一行代码保护路由
app.get('/api/premium/*', createL402Middleware({
  rootKey: process.env.L402_ROOT_KEY,   // 32 字节 hex
  priceCkb: 0.1,                        // 单次价格 (CKB)
  expirySeconds: 3600,                  // 过期时间
}));

app.get('/api/premium/data', (req, res) => {
  res.json({ secret: 'paid content here' });
});
```

#### 2. 按资源动态定价

```typescript
import { L402Middleware, DefaultResourceResolverRegistry } from '@fiber-l402/sdk';
import type { ResourceResolver, ProtectedResourceInfo } from '@fiber-l402/sdk';

// 实现你自己的资源解析器
const myResolver: ResourceResolver = {
  name: 'my-resource',
  matches: (req) => req.path.startsWith('/api/data/'),
  resolve: async (req) => ({
    id: req.params.id,
    type: 'dataset',
    priceCkb: 0.5,  // 每个资源可以不同定价
  }),
};

const registry = new DefaultResourceResolverRegistry([myResolver]);

const middleware = new L402Middleware({
  rootKey: process.env.L402_ROOT_KEY,
  resourceResolver: registry,
});

app.get('/api/data/:id', middleware.handle.bind(middleware), handler);
```

#### 3. 单独使用 Macaroon / Invoice 服务

```typescript
import { MacaroonService, InvoiceService } from '@fiber-l402/sdk';

// Macaroon 签发和验证
const macaroon = new MacaroonService(process.env.L402_ROOT_KEY);
const { macaroon: token } = macaroon.mint({
  identifier: 'order-123',
  paymentHash: '0x...',
  expirySeconds: 3600,
});
const result = macaroon.verify(token, preimage);

// Invoice 创建
const invoice = new InvoiceService({ rpcUrl: 'http://127.0.0.1:8227' });
const inv = await invoice.createInvoice({
  amount: '0x5F5E100',  // 1 CKB
  currency: 'Fibt',
});
```

### 架构层级

```
@fiber-pay/sdk        ← Fiber 网络 RPC 通信
  └─ @fiber-l402/sdk  ← L402 协议层（本 SDK）
       └─ 你的应用     ← 业务逻辑
```

## 示例应用：付费博客

### 环境变量

复制 `.env.example` → `.env` 并配置：

| 变量 | 说明 |
|------|------|
| `L402_ROOT_KEY` | 32 字节 hex，用于 macaroon 签名 |
| `ARTICLE_PRICE_CKB` | 文章价格（默认 0.1 CKB） |
| `FIBER_RPC_URL` | Fiber 节点 RPC 地址 |

### 运行

```bash
pnpm install
pnpm dev

# Web:   http://localhost:4321
# Proxy: http://localhost:3001
```

### L402 付费流程

```
请求付费内容 → 402 + macaroon + invoice
            → 用户通过 Fiber 支付
            → 带 L402 token 重新请求 → 200 返回内容
```

## License

MIT
