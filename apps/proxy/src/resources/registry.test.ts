import { describe, it, expect, vi } from 'vitest';
import type { Request } from 'express';
import { DefaultResourceResolverRegistry } from './registry.js';
import type { ResourceResolver } from './types.js';

function mockReq(path: string): Request {
  return {
    path,
    method: 'GET',
    params: {},
  } as unknown as Request;
}

describe('DefaultResourceResolverRegistry', () => {
  it('returns first resolved resource from matching resolvers', async () => {
    const resolverA: ResourceResolver = {
      name: 'a',
      matches: () => true,
      resolve: vi.fn().mockResolvedValue(undefined),
    };

    const resolverB: ResourceResolver = {
      name: 'b',
      matches: () => true,
      resolve: vi.fn().mockResolvedValue({ id: 'x', type: 'article', priceCkb: 10 }),
    };

    const registry = new DefaultResourceResolverRegistry([resolverA, resolverB]);
    const result = await registry.resolve(mockReq('/api/articles/x/content'));

    expect(result).toEqual({ id: 'x', type: 'article', priceCkb: 10 });
    expect(resolverA.resolve).toHaveBeenCalledTimes(1);
    expect(resolverB.resolve).toHaveBeenCalledTimes(1);
  });

  it('skips non-matching resolvers', async () => {
    const resolverA: ResourceResolver = {
      name: 'a',
      matches: () => false,
      resolve: vi.fn(),
    };

    const resolverB: ResourceResolver = {
      name: 'b',
      matches: () => true,
      resolve: vi.fn().mockResolvedValue({ id: 'x', type: 'article', priceCkb: 1 }),
    };

    const registry = new DefaultResourceResolverRegistry([resolverA, resolverB]);
    await registry.resolve(mockReq('/api/articles/x/content'));

    expect(resolverA.resolve).not.toHaveBeenCalled();
    expect(resolverB.resolve).toHaveBeenCalledTimes(1);
  });

  it('returns undefined when nothing resolves', async () => {
    const registry = new DefaultResourceResolverRegistry([
      {
        name: 'a',
        matches: () => true,
        resolve: vi.fn().mockResolvedValue(undefined),
      },
    ]);

    const result = await registry.resolve(mockReq('/health'));
    expect(result).toBeUndefined();
  });
});
