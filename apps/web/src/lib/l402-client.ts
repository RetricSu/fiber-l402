export interface L402Credentials {
  macaroon: string;
  preimage: string;
}

export async function fetchWithL402(
  url: string,
  options: RequestInit = {},
  credentials?: L402Credentials
): Promise<Response> {
  // If we have cached credentials, try with auth first
  if (credentials) {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `L402 ${credentials.macaroon}:${credentials.preimage}`,
      },
    });

    // If successful or not 402, return response
    if (response.status !== 402) {
      return response;
    }
  }

  // Try without auth (will return 402 with challenge)
  return fetch(url, options);
}

export function getCachedCredentials(articleId: string): L402Credentials | null {
  if (typeof window === 'undefined') return null;
  const cached = localStorage.getItem(`l402-${articleId}`);
  return cached ? JSON.parse(cached) : null;
}

export function cacheCredentials(articleId: string, credentials: L402Credentials): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`l402-${articleId}`, JSON.stringify(credentials));
}

export function clearCredentials(articleId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`l402-${articleId}`);
}
