import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
	FiDownload,
	FiPhone,
	FiPhoneForwarded,
	FiPhoneIncoming,
	FiPhoneMissed,
	FiPhoneOutgoing,
	FiX,
} from 'react-icons/fi'
import type { IconType } from 'react-icons'
import { EmptyState, LoadingState } from '../../../components/shared/page'
import { formatLocalizedDate } from '../../../i18n/date-format'
import { resolveIntlLocale } from '../../../i18n/locale'
import { services } from '../../../services'
import {
	formatCallDuration,
	getCallDirection,
	getCallDurationSeconds,
	getCallExtension,
	getCallRecordingUrl,
	getSessionPhoneNumber,
	isCallMessage,
	isMissedCall,
} from '../../chat/utils/call-event'
import { getConversationDisplayName } from '../../chat/utils/conversation-display'
import type { ChatMessage, Conversation } from '../../../types/domain'

interface CallDetailDrawerProps {
	session: Conversation | null
	isOpen: boolean
	onClose: () => void
}

interface EventVisual {
	Icon: IconType
	dotClassName: string
	iconClassName: string
}

function getEventVisual(message: ChatMessage): EventVisual {
	if (!isCallMessage(message)) {
		return {
			Icon: FiPhone,
			dotClassName: 'bg-surface-subtle ring-border-soft/55',
			iconClassName: 'text-text-muted',
		}
	}

	if (isMissedCall(message)) {
		return {
			Icon: FiPhoneMissed,
			dotClassName: 'bg-danger/12 ring-danger/30',
			iconClassName: 'text-danger',
		}
	}

	const direction = getCallDirection(message)
	if (direction === 'incoming') {
		return {
			Icon: FiPhoneIncoming,
			dotClassName: 'bg-info-bg ring-info/30',
			iconClassName: 'text-info',
		}
	}
	if (direction === 'outgoing') {
		return {
			Icon: FiPhoneOutgoing,
			dotClassName: 'bg-success-bg ring-success/30',
			iconClassName: 'text-success',
		}
	}

	return {
		Icon: FiPhoneForwarded,
		dotClassName: 'bg-[rgb(139_92_246_/_0.12)] ring-[rgb(139_92_246_/_0.35)]',
		iconClassName: 'text-[rgb(109_40_217)]',
	}
}

function CallDetailDrawer({ session, isOpen, onClose }: CallDetailDrawerProps) {
	const { t, i18n } = useTranslation()
	const locale = resolveIntlLocale(i18n.language)
	const [messages, setMessages] = useState<ChatMessage[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [hasError, setHasError] = useState(false)

	useEffect(() => {
		if (!isOpen || !session) {
			return undefined
		}

		let isActive = true
		setIsLoading(true)
		setHasError(false)

		async function loadMessages(sessionId: string) {
			try {
				const result = await services.chat.listMessages({
					page: 1,
					pageSize: 250,
					session: sessionId,
					ordering: 'created_at',
				})

				if (!isActive) {
					return
				}

				setMessages(result.items)
			} catch {
				if (isActive) {
					setHasError(true)
				}
			} finally {
				if (isActive) {
					setIsLoading(false)
				}
			}
		}

		void loadMessages(session.id)

		return () => {
			isActive = false
		}
	}, [isOpen, session])

	useEffect(() => {
		if (!isOpen) {
			return undefined
		}

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				onClose()
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => {
			window.removeEventListener('keydown', handleKeyDown)
		}
	}, [isOpen, onClose])

	const contactName = session
		? getConversationDisplayName(session, t('callsPage.unknownContact'))
		: ''
	const phoneNumber = session ? getSessionPhoneNumber(session) : null
	const callEvents = messages.slice().reverse()

	const panel = (
		<div
			className={[
				'fixed inset-0 z-[260] transition-opacity duration-base',
				isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
			].join(' ')}
			aria-hidden={!isOpen}
		>
			<div
				className='absolute inset-0 bg-background-overlay/70 backdrop-blur-[2px]'
				onClick={onClose}
				role='presentation'
			/>
			<aside
				className={[
					'absolute inset-y-0 right-0 flex h-full w-full max-w-full flex-col bg-surface-card shadow-[-18px_0_42px_-30px_rgba(25,28,30,0.5)] ring-1 ring-border-soft/55 transition-transform duration-base min-[640px]:max-w-[420px]',
					isOpen ? 'translate-x-0' : 'translate-x-full',
				].join(' ')}
				aria-label={t('callsPage.detail.title')}
			>
				<header className='flex items-start justify-between gap-3 border-b border-border-soft/50 p-5'>
					<div className='flex min-w-0 items-center gap-3'>
						<span className='inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white'>
							<FiPhone className='h-5 w-5' />
						</span>
						<div className='min-w-0'>
							<h2 className='m-0 truncate text-[1.05rem] font-semibold text-text-primary'>
								{contactName}
							</h2>
							{phoneNumber ? (
								<p className='m-0 mt-0.5 truncate text-sm text-text-secondary'>
									{phoneNumber}
								</p>
							) : null}
						</div>
					</div>
					<button
						type='button'
						className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-text-primary ring-1 ring-border-soft/55 transition duration-fast hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30'
						onClick={onClose}
						aria-label={t('callsPage.detail.close')}
					>
						<FiX className='h-4.5 w-4.5' aria-hidden='true' />
					</button>
				</header>

				<div className='min-h-0 flex-1 overflow-y-auto p-5'>
					<p className='m-0 mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted'>
						{t('callsPage.detail.title')}
					</p>

					{isLoading ? (
						<LoadingState
							title={t('callsPage.detail.loadingTitle')}
							description={t('callsPage.detail.loadingDescription')}
						/>
					) : hasError ? (
						<EmptyState
							title={t('callsPage.error.title')}
							description={t('callsPage.error.description')}
						/>
					) : callEvents.length === 0 ? (
						<EmptyState
							title={t('callsPage.detail.emptyTitle')}
							description={t('callsPage.detail.emptyDescription')}
						/>
					) : (
						<ol className='relative m-0 grid list-none gap-0 p-0'>
							{callEvents.map((message, index) => {
								const visual = getEventVisual(message)
								const EventIcon = visual.Icon
								const durationSeconds = getCallDurationSeconds(message)
								const extension = getCallExtension(message)
								const recordingUrl = getCallRecordingUrl(message)
								const isLast = index === callEvents.length - 1
								const time = formatLocalizedDate(message.created_at, i18n.language, {
									locale,
									withYear: true,
									withTime: true,
									shortMonth: true,
									fallback: '',
								})

								return (
									<li key={message.id} className='relative grid grid-cols-[auto_minmax(0,1fr)] gap-3 pb-5 last:pb-0'>
										<div className='relative flex flex-col items-center'>
											<span
												className={[
													'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1',
													visual.dotClassName,
												].join(' ')}
											>
												<EventIcon className={['h-4 w-4', visual.iconClassName].join(' ')} />
											</span>
											{!isLast ? (
												<span className='mt-1 w-px flex-1 bg-border-soft/60' aria-hidden='true' />
											) : null}
										</div>
										<div className='min-w-0 pt-1'>
											<p className='m-0 text-sm font-medium leading-5 text-text-primary [overflow-wrap:anywhere]'>
												{message.content || t('callsPage.detail.systemEvent')}
											</p>
											<div className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-text-muted'>
												<span>{time}</span>
												{durationSeconds != null && durationSeconds > 0 ? (
													<span className='font-semibold text-text-secondary'>
														{formatCallDuration(durationSeconds)}
													</span>
												) : null}
												{extension ? (
													<span>
														{t('callsPage.table.operator')}: {extension}
													</span>
												) : null}
											</div>
											{recordingUrl ? (
												<div className='mt-2 flex items-center gap-2 rounded-xl bg-surface-subtle/70 p-2 ring-1 ring-border-soft/50'>
													<audio
														controls
														preload='none'
														src={recordingUrl}
														className='h-9 w-full min-w-0'
													>
														<track kind='captions' />
													</audio>
													<a
														href={recordingUrl}
														download
														target='_blank'
														rel='noreferrer'
														className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-card text-text-secondary ring-1 ring-border-soft/55 transition duration-fast hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30'
														title={t('callsPage.downloadRecording')}
														aria-label={t('callsPage.downloadRecording')}
													>
														<FiDownload className='h-4 w-4' aria-hidden='true' />
													</a>
												</div>
											) : null}
										</div>
									</li>
								)
							})}
						</ol>
					)}
				</div>
			</aside>
		</div>
	)

	if (typeof document === 'undefined') {
		return null
	}

	return createPortal(panel, document.body)
}

export default CallDetailDrawer
