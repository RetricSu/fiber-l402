export interface Article {
    id: string;
    title: string;
    author: string;
    date: string;
    price: number;
    preview: string;
    content: string;
    tags: string[];
}
export interface Invoice {
    paymentHash: string;
    invoiceAddress: string;
    amount: string;
    description: string;
    expiry: number;
    createdAt: number;
}
export interface L402Token {
    macaroon: string;
    preimage: string;
}
export interface PaymentSession {
    id: string;
    articleId: string;
    invoice: Invoice;
    status: 'pending' | 'paid' | 'expired';
    createdAt: number;
    paidAt?: number;
}
export interface L402Challenge {
    macaroon: string;
    invoice: string;
}
export interface L402Config {
    rootKey: string;
    expirySeconds: number;
    priceCkb: number;
}
//# sourceMappingURL=index.d.ts.map