import type { Conversation } from '../../../types/domain';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function normalizeVisibleText(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  // Treat "invisible" filler characters as empty (e.g. Telegram first_name might be a blank-like char).
  const visibleProbe = trimmed.replace(
    /[\s\u00A0\u200B-\u200D\uFEFF\u1160\u3164\u2800]/gu,
    '',
  );

  return visibleProbe.length > 0 ? trimmed : '';
}

export function getConversationDisplayName(
  session: Conversation,
  fallbackUnknown: string,
): string {
  // Phone calls: prefer the linked CRM client's name over the raw "Tel: +998..." title.
  if (session.channel === 'phone') {
    const clientName = normalizeVisibleText(session.client?.fullName ?? '');
    if (clientName) {
      return clientName;
    }

    const phoneTitle = normalizeVisibleText(session.title ?? '');
    const phoneNumber = normalizeVisibleText(session.external_id ?? '');
    return phoneTitle || phoneNumber || fallbackUnknown;
  }

  const title = normalizeVisibleText(session.title ?? '');
  if (title) {
    return title;
  }

  const platformUserId = normalizeVisibleText(session.external_id ?? '');

  if (session.channel === 'instagram') {
    return platformUserId || fallbackUnknown;
  }

  const stateRecord = asRecord(session.state_data);
  const firstName = normalizeVisibleText(stateRecord?.customer_name);

  // Telegram: title -> first_name -> platform_user_id
  return firstName || platformUserId || fallbackUnknown;
}

