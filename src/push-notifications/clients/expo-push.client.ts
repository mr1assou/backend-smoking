import { Injectable, Logger } from '@nestjs/common';

import {
  EXPO_PUSH_SEND_URL,
  PUSH_ANDROID_CHANNEL_ID,
} from '../constants/push-notification.constants';

export type ExpoPushPayload = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string | number>;
};

type ExpoTicket = {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
};

@Injectable()
export class ExpoPushClient {
  private readonly logger = new Logger(ExpoPushClient.name);

  async sendBatch(messages: ExpoPushPayload[]): Promise<void> {
    if (messages.length === 0) return;

    const chunks = chunk(messages, 100);

    for (const batch of chunks) {
      const body = batch.map((message) => ({
        to: message.to,
        title: message.title,
        body: message.body,
        sound: 'default',
        priority: 'high',
        channelId: PUSH_ANDROID_CHANNEL_ID,
        data: {
          type: 'streak',
          ...message.data,
        },
      }));

      const res = await fetch(EXPO_PUSH_SEND_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        this.logger.warn(`Expo push HTTP ${res.status}: ${text}`);
        continue;
      }

      const json = (await res.json()) as { data?: ExpoTicket[] };
      for (const ticket of json.data ?? []) {
        if (ticket.status === 'error') {
          this.logger.warn(
            `Expo push ticket error: ${ticket.message ?? 'unknown'} (${ticket.details?.error ?? 'n/a'})`,
          );
        }
      }
    }
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}
