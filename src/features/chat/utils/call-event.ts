import type { ChatMessage, Conversation } from '../../../types/domain';

export type CallDirection = 'incoming' | 'outgoing' | 'internal';

function readMeta(message: ChatMessage): Record<string, unknown> {
  const meta = message.metadata;
  if (!meta || typeof meta !== 'object') {
    return {};
  }

  return meta as Record<string, unknown>;
}

/** A "call" message is a system log emitted by the IP-telephony (phone) integration. */
export function isCallMessage(message: ChatMessage): boolean {
  if (message.sender_type !== 'system') {
    return false;
  }

  const eventType = readMeta(message).event_type;
  return typeof eventType === 'string' && eventType.startsWith('call_');
}

export function getCallDirection(message: ChatMessage): CallDirection | null {
  const direction = readMeta(message).direction;
  if (direction === 'incoming' || direction === 'outgoing' || direction === 'internal') {
    return direction;
  }

  if (message.direction === 'incoming') {
    return 'incoming';
  }
  if (message.direction === 'outgoing') {
    return 'outgoing';
  }

  return null;
}

export function getCallEventType(message: ChatMessage): string | null {
  const eventType = readMeta(message).event_type;
  return typeof eventType === 'string' ? eventType : null;
}

/** A finished call that was never answered / connected. */
export function isMissedCall(message: ChatMessage): boolean {
  const meta = readMeta(message);
  const eventType = typeof meta.event_type === 'string' ? meta.event_type : '';

  if (eventType === 'call_ended') {
    if (meta.connected === false) {
      return true;
    }

    const duration =
      typeof meta.duration === 'number' ? meta.duration : Number(meta.duration);
    if (meta.connected !== true && (!Number.isFinite(duration) || duration === 0)) {
      return true;
    }
  }

  // Text fallback for the ready-made Uzbek content strings.
  return /javob\s+berilmadi/i.test(message.content);
}

/** The customer phone number backing a phone session (`+998...`). */
export function getSessionPhoneNumber(session: Conversation): string | null {
  const external = (session.external_id ?? '').trim();
  if (external) {
    return external;
  }

  const title = (session.title ?? '').trim();
  const match = title.match(/\+?\d[\d\s()-]{5,}\d/);
  return match ? match[0].trim() : null;
}

/** Live phone call = a phone session currently waiting for an operator. */
export function isLivePhoneCall(session: Conversation): boolean {
  return session.channel === 'phone' && Boolean(session.operator_needed);
}

export function getCallExtension(message: ChatMessage): string | null {
  const extension = readMeta(message).extension;
  if (typeof extension === 'string' && extension.trim()) {
    return extension.trim();
  }
  if (typeof extension === 'number' && Number.isFinite(extension)) {
    return String(extension);
  }
  return null;
}

export function getCallDurationSeconds(message: ChatMessage): number | null {
  const raw = readMeta(message).duration;
  const value = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

/** "68" -> "1:08", "9" -> "0:09", "3720" -> "1:02:00" */
export function formatCallDuration(seconds: number | null): string {
  if (seconds == null || seconds <= 0) {
    return '0:00';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const pad = (value: number) => String(value).padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(secs)}`;
  }

  return `${minutes}:${pad(secs)}`;
}

export type CallStatus = 'live' | 'answered' | 'missed' | 'ongoing';

/** Status of the latest call event on a message. */
export function getCallStatus(message: ChatMessage): CallStatus {
  const eventType = getCallEventType(message);

  if (eventType === 'call_ended') {
    return isMissedCall(message) ? 'missed' : 'answered';
  }

  // started / connecting / answered / recording / transferred = still in progress
  return 'ongoing';
}

export interface CallSummary {
  direction: CallDirection | null;
  status: CallStatus;
  durationSeconds: number | null;
  extension: string | null;
  at: string | null;
  content: string | null;
}

/** Summarize a phone session from its latest call event (for the call log row). */
export function summarizeSessionCall(session: Conversation): CallSummary {
  const message = session.last_message_payload ?? null;

  if (!message) {
    return {
      direction: null,
      status: session.operator_needed ? 'live' : 'ongoing',
      durationSeconds: null,
      extension: null,
      at: session.last_message_at ?? null,
      content: session.last_message ?? null,
    };
  }

  const baseStatus = getCallStatus(message);
  const status: CallStatus =
    session.operator_needed && baseStatus === 'ongoing' ? 'live' : baseStatus;

  return {
    direction: getCallDirection(message),
    status,
    durationSeconds: getCallDurationSeconds(message),
    extension: getCallExtension(message),
    at: message.created_at ?? session.last_message_at ?? null,
    content: message.content || session.last_message || null,
  };
}
