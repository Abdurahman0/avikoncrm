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
