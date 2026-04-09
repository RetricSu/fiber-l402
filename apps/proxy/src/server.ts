import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {
  L402Middleware,
  DefaultResourceResolverRegistry,
} from '@fiber-pay/sdk';
import { ArticleService } from './services/article.js';
import { ArticleContentResolver } from './resources/resolvers/article-content.js';
import type { Article } from './types/article.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. server-to-server or Postman)
    if (!origin) return callback(null, true);
    
    const isAllowed = 
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) || 
      /^https:\/\/.*\.vercel\.app$/.test(origin) ||
      origin === process.env.WEB_URL;
      
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());

// Services
const articleService = new ArticleService();
const resourceResolverRegistry = new DefaultResourceResolverRegistry([
  new ArticleContentResolver(articleService),
]);

const l402Middleware = new L402Middleware({
  rootKey: process.env.L402_ROOT_KEY,
  rpcUrl: process.env.FIBER_RPC_URL,
  priceCkb: Number(process.env.ARTICLE_PRICE_CKB || '0.1'),
  expirySeconds: parseInt(process.env.L402_EXPIRY_SECONDS || '3600', 10),
  resourceResolver: resourceResolverRegistry,
});

// Helper to strip content field for public responses
function withoutContent(article: Article): Omit<Article, 'content'> {
  const { content: _, ...metadata } = article;
  return metadata;
}

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'fiber-l402-proxy' });
});

// List all articles (public - no content)
app.get('/api/articles', async (_req, res) => {
  try {
    const articles = await articleService.loadAll();
    const metadata = articles.map(withoutContent);
    res.json(metadata);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to load articles',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get article metadata (public - no content)
app.get('/api/articles/:id', async (req, res) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const article = await articleService.getById(id);
    if (!article) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }
    res.json(withoutContent(article));
  } catch (error) {
    res.status(500).json({
      error: 'Failed to load article',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get full article content (L402 protected)
app.get('/api/articles/:id/content', l402Middleware.handle.bind(l402Middleware), async (req, res) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const article = await articleService.getById(id);
    if (!article) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }
    res.json(article);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to load article content',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.listen(port, () => {
  console.log(`L402 Proxy server running on port ${port}`);
});
