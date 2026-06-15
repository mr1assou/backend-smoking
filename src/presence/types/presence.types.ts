export type PresenceConnectResult = {
  wentOnline: boolean;
};

export type PresenceDisconnectResult = {
  userId: number | null;
  wentOffline: boolean;
};

export type PresenceSocketUser = {
  userId: number;
  email: string;
};

export type PresenceUpdatePayload = {
  userId: number;
  isOnline: boolean;
};

export type PresenceSnapshotPayload = {
  onlineUserIds: number[];
};
