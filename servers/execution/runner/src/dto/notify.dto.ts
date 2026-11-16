export type NotifyKind = 'state' | 'escalation' | 'presence';

// The envelope of every notification, over MQTT and the webhook; for a
// state notification, time is the time of the state document. Only the
// MQTT will of presence has no time, as it is fixed when the client
// connects.
export type NotificationDto = {
  kind: NotifyKind;
  id: string;
  time: string | null;
  data: unknown;
};

// The presence notice of a runner that leaves, or of its will
export const offlineNotification = (
  id: string,
  time: string | null,
): NotificationDto => ({
  kind: 'presence',
  id,
  time,
  data: { online: false },
});
