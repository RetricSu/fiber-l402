import {
  callJsonRpc,
  type GetPaymentResult,
  type NodeInfoResult,
  type SendPaymentResult,
} from '@fiber-pay/sdk/browser';

interface SendPaymentParams {
  invoice: string;
  allow_self_payment?: boolean;
}

interface GetPaymentParams {
  payment_hash: string;
}

export class FiberRpcBrowserClient {
  private readonly url: string;

  constructor(url: string) {
    this.url = url;
  }

  nodeInfo(): Promise<NodeInfoResult> {
    return callJsonRpc<NodeInfoResult>(this.url, 'node_info', []);
  }

  sendPayment(params: SendPaymentParams): Promise<SendPaymentResult> {
    return callJsonRpc<SendPaymentResult>(this.url, 'send_payment', [params]);
  }

  getPayment(params: GetPaymentParams): Promise<GetPaymentResult> {
    return callJsonRpc<GetPaymentResult>(this.url, 'get_payment', [params]);
  }
}
