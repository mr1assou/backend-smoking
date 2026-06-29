export const EXPO_PUSH_SEND_URL = 'https://exp.host/--/api/v2/push/send';

export const PUSH_ANDROID_CHANNEL_ID = 'default';

/** US Eastern — handles EST / EDT automatically. */
export const PUSH_TIMEZONE = 'America/New_York';

export const PUSH_SCHEDULE = {
  streak: {
    cron: '0 9 * * *',
    label: '9:00 AM streak',
  },
  tip: {
    cron: '30 12 * * *',
    label: '12:30 PM motivation',
  },
  money: {
    cron: '30 17 * * *',
    label: '5:30 PM money',
  },
  motivation: {
    cron: '30 20 * * *',
    label: '8:30 PM motivation',
  },
} as const;
