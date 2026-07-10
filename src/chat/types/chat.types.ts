export const CHAT_MESSAGE_TYPES = [
  'text',
  'image',
  'video',
  'audio',
  'call',
] as const;

export type ChatMessageType = (typeof CHAT_MESSAGE_TYPES)[number];

export type ChatMessageDto = {
  message_id: number;
  thread_id: number;
  sender_id: number;
  message_type: ChatMessageType;
  text: string | null;
  media_url: string | null;
  media_mime_type: string | null;
  media_duration_ms: number | null;
  media_size_bytes: number | null;
  is_deleted: boolean;
  edited_at: string | null;
  created_at: string;
};

export type ChatThreadSummaryDto = {
  thread_id: number;
  peer_user_id: number;
  peer_username: string | null;
  peer_image_url: string | null;
  peer_country_flag: string | null;
  peer_badge_id: string;
  peer_role: string;
  last_message: ChatMessageDto | null;
  unread_count: number;
  peer_last_read_at: string | null;
  updated_at: string;
};

export type ChatThreadsPageDto = {
  items: ChatThreadSummaryDto[];
  has_more: boolean;
};

export type ChatMessagesPageDto = {
  items: ChatMessageDto[];
  has_more: boolean;
  peer_last_read_at: string | null;
};

export type MessagesSeenPayload = {
  thread_id: number;
  reader_user_id: number;
  last_read_at: string;
};

export type SupportUserDto = {
  user_id: number;
  username: string | null;
  image_url: string | null;
  country_flag: string | null;
  badge_id: string;
  role: string;
};

export type SupportUsersPageDto = {
  items: SupportUserDto[];
  has_more: boolean;
};

export type ChatTypingPayload = {
  thread_id: number;
  user_id: number;
  is_typing: boolean;
};

export type ChatRedisEvent =
  | {
      type: 'chat:message';
      thread_id: number;
      user_one_id: number;
      user_two_id: number;
      payload: ChatMessageDto;
    }
  | {
      type: 'chat:message_updated';
      thread_id: number;
      user_one_id: number;
      user_two_id: number;
      payload: ChatMessageDto;
    }
  | {
      type: 'chat:message_deleted';
      thread_id: number;
      user_one_id: number;
      user_two_id: number;
      payload: ChatMessageDto;
    }
  | {
      type: 'messages_seen';
      peer_user_id: number;
      payload: MessagesSeenPayload;
    };
