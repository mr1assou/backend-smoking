import type { ChatMessageType } from '../../chat/types/chat.types';
import type { PushLocale } from './push-locale';

const PREVIEW_MAX_LENGTH = 120;

type MediaLabels = Record<Exclude<ChatMessageType, 'text' | 'call'>, string>;

const COPY: Record<
  PushLocale,
  { fallback: string; someone: string; sentYou: string; media: MediaLabels }
> = {
  en: {
    fallback: 'a message',
    someone: 'Someone',
    sentYou: 'sent you',
    media: {
      image: 'a photo',
      video: 'a video',
      audio: 'a voice message',
    },
  },
  fr: {
    fallback: 'un message',
    someone: "Quelqu'un",
    sentYou: 'vous a envoyé',
    media: {
      image: 'une photo',
      video: 'une vidéo',
      audio: 'un message vocal',
    },
  },
};

function messagePreview(
  messageType: ChatMessageType,
  text: string | null,
  locale: PushLocale,
): string {
  const copy = COPY[locale];

  if (messageType === 'text') {
    const preview = text?.trim();
    return preview ? preview.slice(0, PREVIEW_MAX_LENGTH) : copy.fallback;
  }

  if (messageType === 'call') return copy.fallback;

  return copy.media[messageType];
}

export function buildChatPushCopy(params: {
  senderUsername: string | null;
  messageType: ChatMessageType;
  text: string | null;
  locale?: PushLocale;
}): { title: string; body: string } {
  const locale = params.locale ?? 'en';
  const copy = COPY[locale];
  const username = params.senderUsername?.trim() || copy.someone;
  const message = messagePreview(params.messageType, params.text, locale);

  return {
    title: 'Quitify',
    body: `${username} ${copy.sentYou} ${message}`,
  };
}
