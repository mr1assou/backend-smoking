import type { ChatMessageType } from '../../chat/types/chat.types';

const PREVIEW_MAX_LENGTH = 120;

function messagePreview(
  messageType: ChatMessageType,
  text: string | null,
): string {
  if (messageType === 'text') {
    const preview = text?.trim();
    return preview
      ? preview.slice(0, PREVIEW_MAX_LENGTH)
      : 'a message';
  }

  const mediaLabels: Record<Exclude<ChatMessageType, 'text'>, string> = {
    image: 'a photo',
    video: 'a video',
    audio: 'a voice message',
  };

  return mediaLabels[messageType];
}

export function buildChatPushCopy(params: {
  senderUsername: string | null;
  messageType: ChatMessageType;
  text: string | null;
}): { title: string; body: string } {
  const username = params.senderUsername?.trim() || 'Someone';
  const message = messagePreview(params.messageType, params.text);

  return {
    title: 'Quitify',
    body: `${username} send you ${message}`,
  };
}
