import { describe, it, expect, vi } from 'vitest';
import type { Request } from 'express';
import { ArticleContentResolver } from './article-content.js';

function makeReq(path: string, id?: string, method: string = 'GET'): Request {
  return {
    path,
    method,
    params: id ? { id } : {},
  } as unknown as Request;
}

describe('ArticleContentResolver', () => {
  it('matches article content GET route only', () => {
    const resolver = new ArticleContentResolver({ getById: vi.fn() } as any);

    expect(resolver.matches(makeReq('/api/articles/a/content', 'a', 'GET'))).toBe(true);
    expect(resolver.matches(makeReq('/api/articles/a/content', 'a', 'POST'))).toBe(false);
    expect(resolver.matches(makeReq('/api/articles/a', 'a', 'GET'))).toBe(false);
  });

  it('returns undefined when id is missing', async () => {
    const resolver = new ArticleContentResolver({ getById: vi.fn() } as any);

    const result = await resolver.resolve(makeReq('/api/articles//content'));
    expect(result).toBeUndefined();
  });

  it('returns normalized protected resource when article exists', async () => {
    const getById = vi.fn().mockResolvedValue({
      id: 'article-1',
      title: 'T',
      author: 'A',
      date: '2024-01-01',
      price: 42,
      preview: 'P',
      content: 'C',
      tags: [],
    });

    const resolver = new ArticleContentResolver({ getById } as any);
    const result = await resolver.resolve(makeReq('/api/articles/article-1/content', 'article-1'));

    expect(getById).toHaveBeenCalledWith('article-1');
    expect(result).toEqual({
      id: 'article-1',
      type: 'article',
      priceCkb: 42,
    });
  });
});
