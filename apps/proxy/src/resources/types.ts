import type { Request } from 'express';

export interface ProtectedResourceInfo {
  id?: string;
  type?: string;
  priceCkb?: number;
}

export interface ResourceResolver {
  name: string;
  matches(req: Request): boolean;
  resolve(req: Request): Promise<ProtectedResourceInfo | undefined>;
}

export interface ResourceResolverRegistry {
  register(resolver: ResourceResolver): void;
  resolve(req: Request): Promise<ProtectedResourceInfo | undefined>;
}
