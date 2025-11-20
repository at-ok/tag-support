declare module 'web-push' {
  export interface PushSubscription {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  }

  export interface WebPushError {
    statusCode?: number;
    headers?: Record<string, string>;
    body?: string;
  }

  export function setVapidDetails(subject: string, publicKey: string, privateKey: string): void;

  export function sendNotification(
    subscription: PushSubscription,
    payload?: string,
    options?: Record<string, unknown>
  ): Promise<void>;

  export function generateVAPIDKeys(): {
    publicKey: string;
    privateKey: string;
  };
}
