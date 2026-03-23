import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ArticleService } from './article.js';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('ArticleService', () => {
  let tempDir: string;
  let service: ArticleService;

  beforeEach(() => {
    // Create temp directory for test articles
    tempDir = join(tmpdir(), `article-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    
    // Create test article
    writeFileSync(
      join(tempDir, 'test-article.md'),
      `---
id: "test-article"
title: "Test Article"
author: "Test Author"
date: "2024-03-23"
price: 150
tags: ["test", "vitest"]
---

# Test Article

This is the first paragraph.

## More Content

This is additional content.
`
    );

    service = new ArticleService(tempDir);
  });

  afterEach(() => {
    // Cleanup
    try {
      rmSync(tempDir, { recursive: true });
    } catch {}
  });

  describe('loadAll', () => {
    it('should load all articles from directory', async () => {
      const articles = await service.loadAll();
      expect(articles).toHaveLength(1);
      expect(articles[0].id).toBe('test-article');
      expect(articles[0].title).toBe('Test Article');
    });

    it('should cache articles on subsequent calls', async () => {
      await service.loadAll();
      const articles2 = await service.loadAll();
      expect(articles2).toHaveLength(1);
    });
  });

  describe('getById', () => {
    it('should return article by id', async () => {
      const article = await service.getById('test-article');
      expect(article).toBeDefined();
      expect(article?.title).toBe('Test Article');
      expect(article?.price).toBe(150);
    });

    it('should return null for unknown id', async () => {
      const article = await service.getById('unknown');
      expect(article).toBeNull();
    });
  });

  describe('getPreview', () => {
    it('should return article with generated preview', async () => {
      const article = await service.getPreview('test-article');
      expect(article).toBeDefined();
      expect(article?.preview).toContain('This is the first paragraph');
    });
  });

  describe('getFullContent', () => {
    it('should return full content', async () => {
      const content = await service.getFullContent('test-article');
      expect(content).toContain('# Test Article');
      expect(content).toContain('## More Content');
    });
  });
});
