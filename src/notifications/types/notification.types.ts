export const NOTIFICATION_TYPES = [
  'comment',
  'reply',
  'upvote',
  'downvote',
  'post',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationActorDto = {
  user_id: number;
  username: string | null;
  image_url: string | null;
  country_flag: string | null;
};

export type NotificationDto = {
  notification_id: number;
  type: NotificationType;
  actor: NotificationActorDto;
  post_id: number | null;
  comment_id: number | null;
  text: string | null;
  is_read: boolean;
  created_at: string;
};

export type NotificationListDto = {
  items: NotificationDto[];
  has_more: boolean;
  unread_count: number;
};

export type NotificationRedisEvent = {
  type: 'notification:new';
  recipient_id: number;
  payload: NotificationDto;
};
