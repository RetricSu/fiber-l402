import type { Request } from 'express';
import type { L402Config, L402Challenge, L402Token } from '@fiber-l402/types';

export interface L402Request extends Request {
  l402?: {
    valid: boolean;
    preimage?: string;
    paymentHash?: string;
    token?: L402Token;
  };
}

export interface L402MiddlewareConfig extends L402Config {
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
}

export interface ChallengeStore {
  get(key: string): L402Challenge | undefined;
  set(key: string, value: L402Challenge): void;
  delete(key: string): void;
  has(key: string): boolean;
}
