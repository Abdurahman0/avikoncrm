import { FaInstagram, FaTelegramPlane } from 'react-icons/fa';
import { FiAlertTriangle, FiEdit3, FiGlobe, FiPhone, FiPhoneCall } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { EmptyState, LoadingState } from '../../../components/shared/page';
import { formatLocalizedDate } from '../../../i18n/date-format';
import { resolveIntlLocale } from '../../../i18n/locale';
import { getConversationDisplayName } from '../utils/conversation-display';
import type { Conversation, EntityId } from '../../../types/domain';

interface ChatSessionListProps {
  sessions: Conversation[];
  selectedSessionId: EntityId | null;
  unreadBySessionId: Record<string, number>;
  isLoading: boolean;
  hasError: boolean;
  onSelectSession: (sessionId: EntityId) => void;
}

const channelClassNameByValue: Record<Conversation['channel'], string> = {
  telegram: 'bg-[rgb(16_185_129_/_0.16)] text-[rgb(5_120_99)]',
  instagram: 'bg-[rgb(225_48_108_/_0.14)] text-[rgb(176_32_87)]',
  web: 'bg-info-bg text-info',
  manual: 'bg-surface-subtle text-text-secondary',
  phone: 'bg-[rgb(139_92_246_/_0.14)] text-[rgb(109_40_217)]',
};

const channelDotClassNameByValue: Record<Conversation['channel'], string> = {
  telegram: 'bg-[rgb(32_156_238_/_0.9)] text-white',
  instagram: 'bg-[rgb(225_48_108_/_0.92)] text-white',
  web: 'bg-info text-white',
  manual: 'bg-neutral text-white',
  phone: 'bg-[rgb(139_92_246_/_0.92)] text-white',
};

const avatarGradientByChannel: Record<Conversation['channel'], string> = {
  telegram: 'from-emerald-500 to-teal-600',
  instagram: 'from-fuchsia-500 to-pink-600',
  web: 'from-teal-500 to-cyan-600',
  manual: 'from-amber-500 to-orange-600',
  phone: 'from-violet-500 to-indigo-600',
};

function formatSessionTime(
  value: string | null,
  language: string,
  locale: string,
  emptyLabel: string,
): string {
  return formatLocalizedDate(value, language, {
    locale,
    withYear: true,
    withTime: true,
    shortMonth: true,
    fallback: emptyLabel,
  });
}

function getSessionTitle(session: Conversation, fallbackUnknown: string): string {
  return getConversationDisplayName(session, fallbackUnknown);
}

function getInitial(title: string): string {
  const normalized = title.trim();
  if (!normalized) {
    return '?';
  }

  return normalized.charAt(0).toUpperCase();
}

function hasAiPause(session: Conversation): boolean {
  if (!session.ai_paused_until) {
    return false;
  }

  return new Date(session.ai_paused_until).getTime() > Date.now();
}

function ChannelIcon({
  channel,
  className,
}: {
  channel: Conversation['channel'];
  className: string;
}) {
  if (channel === 'telegram') {
    return <FaTelegramPlane className={className} />;
  }

  if (channel === 'instagram') {
    return <FaInstagram className={className} />;
  }

  if (channel === 'web') {
    return <FiGlobe className={className} />;
  }

  if (channel === 'phone') {
    return <FiPhone className={className} />;
  }

  return <FiEdit3 className={className} />;
}

function ChatSessionList({
  sessions,
  selectedSessionId,
  unreadBySessionId,
  isLoading,
  hasError,
  onSelectSession,
}: ChatSessionListProps) {
  const { t, i18n } = useTranslation();
  const locale = resolveIntlLocale(i18n.language);
  const labels = {
    loadingTitle: t('chatPage.sessionList.loadingTitle'),
    loadingDescription: t('chatPage.sessionList.loadingDescription'),
    errorTitle: t('chatPage.sessionList.errorTitle'),
    errorDescription: t('chatPage.sessionList.errorDescription'),
    emptyTitle: t('chatPage.sessionList.emptyTitle'),
    emptyDescription: t('chatPage.sessionList.emptyDescription'),
    unknownChat: t('chatPage.sessionList.unknownChat'),
    noTime: t('chatPage.sessionList.noTime'),
    noMessage: t('chatPage.sessionList.noMessage'),
    operatorRequired: t('chatPage.sessionList.operatorRequired'),
    liveCall: t('chatPage.sessionList.liveCall'),
    aiPaused: t('chatPage.workspace.aiPausedStatus'),
  };
  const channelLabels: Record<Conversation['channel'], string> = {
    telegram: 'Telegram',
    instagram: 'Instagram',
    web: t('chatPage.channels.web'),
    manual: t('chatPage.channels.manual'),
    phone: t('chatPage.channels.phone'),
  };
  const stateLabels: Record<Conversation['state'], string> = {
    open: t('chatPage.states.open'),
    pending: t('chatPage.states.pending'),
    resolved: t('chatPage.states.resolved'),
  };

  const liveCallSessions: Conversation[] = [];
  const prioritizedSessions: Conversation[] = [];
  const regularSessions: Conversation[] = [];

  sessions.forEach((session) => {
    if (session.channel === 'phone' && session.operator_needed) {
      liveCallSessions.push(session);
      return;
    }

    if (session.operator_needed) {
      prioritizedSessions.push(session);
      return;
    }

    regularSessions.push(session);
  });

  const visibleSessions = [
    ...liveCallSessions,
    ...prioritizedSessions,
    ...regularSessions,
  ];

  if (isLoading) {
    return (
      <LoadingState
        title={labels.loadingTitle}
        description={labels.loadingDescription}
      />
    );
  }

  if (hasError) {
    return (
      <EmptyState
        title={labels.errorTitle}
        description={labels.errorDescription}
      />
    );
  }

  if (!sessions.length) {
    return (
      <EmptyState
        title={labels.emptyTitle}
        description={labels.emptyDescription}
      />
    );
  }

  return (
    <div className='grid w-full min-w-0 gap-2 pb-1 pr-1'>
      {visibleSessions.map((session) => {
        const isSelected = selectedSessionId === session.id;
        const unreadCount = unreadBySessionId[session.id] ?? 0;
        const aiPaused = hasAiPause(session);
        const title = getSessionTitle(session, labels.unknownChat);
        const isPhone = session.channel === 'phone';
        const isLiveCall = isPhone && session.operator_needed;
        const showPhoneAvatar = isPhone && !session.client;

        return (
          <button
            key={session.id}
            type='button'
            className={[
              'group relative w-full min-w-0 overflow-hidden rounded-2xl border-0 p-3 text-left transition duration-fast',
              'shadow-[0_10px_22px_-18px_rgba(15,23,42,0.9)] ring-1',
              isSelected
                ? 'bg-primary/12 ring-primary/40'
                : 'bg-surface-card/88 ring-border-soft/45 hover:bg-surface-subtle/88',
            ].join(' ')}
            onClick={() => onSelectSession(session.id)}
          >
            {isSelected ? (
              <span className='absolute inset-y-2 left-1 w-1 rounded-pill bg-primary' />
            ) : null}

            <div className='flex min-w-0 items-start gap-3'>
              <span
                className={[
                  'relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[15px] font-bold text-white',
                  `bg-gradient-to-br ${avatarGradientByChannel[session.channel]}`,
                  isLiveCall ? 'ring-2 ring-danger/70 ring-offset-2 ring-offset-surface-card' : '',
                ].join(' ')}
                aria-hidden='true'
              >
                {showPhoneAvatar ? (
                  <FiPhone className='h-5 w-5' />
                ) : (
                  getInitial(title)
                )}
                <span
                  className={[
                    'absolute -bottom-1 -right-1 inline-flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-surface-card',
                    isLiveCall
                      ? 'animate-pulse bg-danger text-white'
                      : channelDotClassNameByValue[session.channel],
                  ].join(' ')}
                >
                  {isLiveCall ? (
                    <FiPhoneCall className='h-2.5 w-2.5' />
                  ) : (
                    <ChannelIcon
                      channel={session.channel}
                      className='h-2.5 w-2.5'
                    />
                  )}
                </span>
              </span>

              <div className='min-w-0 flex-1'>
                <div className='flex min-w-0 items-start justify-between gap-2'>
                  <p className='m-0 truncate text-sm font-semibold text-text-primary'>
                    {title}
                  </p>
                  {unreadCount > 0 ? (
                    <span className='inline-flex min-h-6 min-w-6 shrink-0 items-center justify-center rounded-pill bg-danger px-2 text-[11px] font-bold text-white'>
                      {unreadCount}
                    </span>
                  ) : null}
                </div>

                <div className='mt-1 flex items-center gap-2'>
                  <span className='inline-flex min-h-6 items-center rounded-pill bg-surface-subtle px-2 text-[11px] font-semibold text-text-secondary ring-1 ring-border-soft/45'>
                    {formatSessionTime(
                      session.last_message_at,
                      i18n.language,
                      locale,
                      labels.noTime,
                    )}
                  </span>
                </div>

                <p className='m-0 mt-1.5 truncate text-[12px] text-text-secondary'>
                  {session.last_message ?? labels.noMessage}
                </p>
              </div>
            </div>

            <div className='mt-2.5 flex min-w-0 flex-wrap items-center gap-1.5 pl-[56px] pr-1'>
              <span
                className={[
                  'inline-flex min-h-6 items-center rounded-pill px-2 text-[10px] font-semibold uppercase tracking-[0.08em]',
                  channelClassNameByValue[session.channel],
                ].join(' ')}
              >
                {channelLabels[session.channel]}
              </span>
              <span className='inline-flex min-h-6 items-center rounded-pill bg-surface-card px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-secondary ring-1 ring-border-soft/45'>
                {stateLabels[session.state]}
              </span>
              {isLiveCall ? (
                <span className='inline-flex min-h-6 items-center gap-1 rounded-pill bg-danger/12 px-2 text-[10px] font-bold uppercase tracking-[0.08em] text-danger ring-1 ring-danger/35'>
                  <span className='inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-danger' aria-hidden='true' />
                  <FiPhoneCall className='h-3 w-3' aria-hidden='true' />
                  {labels.liveCall}
                </span>
              ) : session.operator_needed ? (
                <span className='inline-flex min-h-6 items-center gap-1 rounded-pill bg-warning-bg px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-warning ring-1 ring-warning/30'>
                  <FiAlertTriangle className='h-3 w-3' aria-hidden='true' />
                  {labels.operatorRequired}
                </span>
              ) : null}
              {aiPaused ? (
                <span className='inline-flex min-h-6 items-center rounded-pill bg-warning-bg px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-warning'>
                  {labels.aiPaused}
                </span>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default ChatSessionList;
