import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
	FiPhoneCall,
	FiPhoneForwarded,
	FiPhoneIncoming,
	FiPhoneMissed,
	FiPhoneOutgoing,
	FiSearch,
} from 'react-icons/fi'
import { EmptyState, LoadingState } from '../../../components/shared/page'
import StatCard from '../../../components/shared/data/StatCard'
import { resolveIntlLocale } from '../../../i18n/locale'
import { services } from '../../../services'
import {
	formatCallDuration,
	getSessionPhoneNumber,
	isLivePhoneCall,
	summarizeSessionCall,
	type CallDirection,
	type CallStatus,
} from '../../chat/utils/call-event'
import { getConversationDisplayName } from '../../chat/utils/conversation-display'
import CallDetailDrawer from './CallDetailDrawer'
import type { Conversation } from '../../../types/domain'

const POLL_INTERVAL_MS = 8000
const PAGE_SIZE = 200

type StatusFilter = 'all' | CallStatus
type DirectionFilter = 'all' | CallDirection

function DirectionIcon({ direction, className }: { direction: CallDirection | null; className: string }) {
	if (direction === 'incoming') {
		return <FiPhoneIncoming className={className} />
	}
	if (direction === 'outgoing') {
		return <FiPhoneOutgoing className={className} />
	}
	if (direction === 'internal') {
		return <FiPhoneForwarded className={className} />
	}
	return <FiPhoneCall className={className} />
}

const STATUS_BADGE_CLASS: Record<CallStatus, string> = {
	live: 'bg-danger/12 text-danger ring-danger/35',
	answered: 'bg-success-bg text-success ring-success/30',
	missed: 'bg-danger/10 text-danger ring-danger/25',
	ongoing: 'bg-info-bg text-info ring-info/25',
}

const DIRECTION_ICON_CLASS: Record<string, string> = {
	incoming: 'text-info',
	outgoing: 'text-success',
	internal: 'text-[rgb(109_40_217)]',
	unknown: 'text-text-muted',
}

function CallsView() {
	const { t, i18n } = useTranslation()
	const locale = resolveIntlLocale(i18n.language)

	const [sessions, setSessions] = useState<Conversation[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [hasError, setHasError] = useState(false)
	const [search, setSearch] = useState('')
	const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
	const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('all')
	const [selectedSession, setSelectedSession] = useState<Conversation | null>(null)
	const requestRef = useRef(0)

	const loadSessions = useCallback(async (options?: { silent?: boolean }) => {
		const requestId = ++requestRef.current
		if (!options?.silent) {
			setIsLoading(true)
		}
		setHasError(false)

		try {
			const result = await services.chat.listSessions({
				channel: 'phone',
				page: 1,
				pageSize: PAGE_SIZE,
				ordering: '-updated_at',
			})

			if (requestId !== requestRef.current) {
				return
			}

			setSessions(
				(result.items as Conversation[]).filter(
					(session: Conversation) => session.channel === 'phone',
				),
			)
		} catch {
			if (requestId === requestRef.current) {
				setHasError(true)
			}
		} finally {
			if (!options?.silent && requestId === requestRef.current) {
				setIsLoading(false)
			}
		}
	}, [])

	useEffect(() => {
		void loadSessions()
	}, [loadSessions])

	useEffect(() => {
		const intervalId = window.setInterval(() => {
			void loadSessions({ silent: true })
		}, POLL_INTERVAL_MS)

		return () => {
			window.clearInterval(intervalId)
		}
	}, [loadSessions])

	const liveCalls = useMemo(
		() => sessions.filter((session) => isLivePhoneCall(session)),
		[sessions],
	)

	const stats = useMemo(() => {
		let missed = 0
		let unread = 0
		for (const session of sessions) {
			if (summarizeSessionCall(session).status === 'missed') {
				missed += 1
			}
			unread += Math.max(0, session.unread_count ?? 0)
		}
		return { live: liveCalls.length, total: sessions.length, missed, unread }
	}, [sessions, liveCalls.length])

	const filteredSessions = useMemo(() => {
		const query = search.trim().toLowerCase()

		return sessions.filter((session) => {
			const summary = summarizeSessionCall(session)

			if (statusFilter !== 'all' && summary.status !== statusFilter) {
				return false
			}

			if (directionFilter !== 'all' && summary.direction !== directionFilter) {
				return false
			}

			if (query) {
				const name = getConversationDisplayName(session, '').toLowerCase()
				const number = (getSessionPhoneNumber(session) ?? '').toLowerCase()
				if (!name.includes(query) && !number.includes(query)) {
					return false
				}
			}

			return true
		})
	}, [sessions, search, statusFilter, directionFilter])

	const statusOptions: Array<{ value: StatusFilter; label: string }> = [
		{ value: 'all', label: t('callsPage.status.all') },
		{ value: 'live', label: t('callsPage.status.live') },
		{ value: 'answered', label: t('callsPage.status.answered') },
		{ value: 'missed', label: t('callsPage.status.missed') },
	]

	const directionOptions: Array<{ value: DirectionFilter; label: string }> = [
		{ value: 'all', label: t('callsPage.direction.all') },
		{ value: 'incoming', label: t('callsPage.direction.incoming') },
		{ value: 'outgoing', label: t('callsPage.direction.outgoing') },
	]

	function formatTime(value: string | null): string {
		if (!value) {
			return '—'
		}
		return new Intl.DateTimeFormat(locale, {
			dateStyle: 'short',
			timeStyle: 'short',
		}).format(new Date(value))
	}

	return (
		<div className='grid gap-5'>
			{/* Stat tiles */}
			<div className='grid gap-3 min-[560px]:grid-cols-2 min-[1024px]:grid-cols-4'>
				<StatCard title={t('callsPage.stats.live')} value={stats.live} />
				<StatCard title={t('callsPage.stats.total')} value={stats.total} />
				<StatCard title={t('callsPage.stats.missed')} value={stats.missed} />
				<StatCard title={t('callsPage.stats.unread')} value={stats.unread} />
			</div>

			{/* Live now strip */}
			{liveCalls.length > 0 ? (
				<section className='rounded-[20px] bg-danger/[0.06] p-4 ring-1 ring-danger/20'>
					<div className='mb-3 flex items-center gap-2'>
						<span className='inline-flex h-2 w-2 animate-pulse rounded-full bg-danger' aria-hidden='true' />
						<h2 className='m-0 text-[13px] font-bold uppercase tracking-[0.12em] text-danger'>
							{t('callsPage.liveNow')}
						</h2>
						<span className='text-[12px] font-semibold text-text-muted'>
							{liveCalls.length}
						</span>
					</div>
					<div className='grid gap-3 min-[640px]:grid-cols-2 min-[1200px]:grid-cols-3'>
						{liveCalls.map((session) => {
							const summary = summarizeSessionCall(session)
							const name = getConversationDisplayName(session, t('callsPage.unknownContact'))
							const number = getSessionPhoneNumber(session)

							return (
								<button
									key={session.id}
									type='button'
									onClick={() => setSelectedSession(session)}
									className='group flex items-center gap-3 rounded-2xl bg-surface-card p-3.5 text-left ring-1 ring-danger/25 shadow-sm transition duration-fast hover:ring-danger/45'
								>
									<span className='relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white'>
										<DirectionIcon direction={summary.direction} className='h-5 w-5' />
										<span className='absolute -bottom-0.5 -right-0.5 inline-flex h-4 w-4 animate-pulse items-center justify-center rounded-full bg-danger ring-2 ring-surface-card'>
											<FiPhoneCall className='h-2.5 w-2.5 text-white' />
										</span>
									</span>
									<div className='min-w-0 flex-1'>
										<p className='m-0 truncate text-sm font-semibold text-text-primary'>{name}</p>
										{number ? (
											<p className='m-0 truncate text-[12px] text-text-secondary'>{number}</p>
										) : null}
										<p className='m-0 mt-0.5 truncate text-[12px] font-semibold text-danger'>
											{t('callsPage.answerHint')}
										</p>
									</div>
								</button>
							)
						})}
					</div>
				</section>
			) : null}

			{/* Filters */}
			<div className='flex flex-col gap-3 min-[900px]:flex-row min-[900px]:items-center min-[900px]:justify-between'>
				<div className='relative w-full min-[900px]:max-w-[320px]'>
					<FiSearch className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted' />
					<input
						type='text'
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder={t('callsPage.filters.searchPlaceholder')}
						className='w-full rounded-xl border border-border-soft bg-surface-card py-2.5 pl-10 pr-4 text-sm outline-none transition duration-fast focus:border-primary/50 focus:ring-2 focus:ring-primary/20'
					/>
				</div>

				<div className='flex flex-wrap items-center gap-2'>
					<div className='inline-flex rounded-pill bg-surface-subtle/70 p-1 ring-1 ring-border-soft/45'>
						{statusOptions.map((option) => {
							const isActive = statusFilter === option.value
							return (
								<button
									key={option.value}
									type='button'
									onClick={() => setStatusFilter(option.value)}
									className={[
										'inline-flex min-h-8 items-center rounded-pill px-3 text-[12px] font-semibold transition duration-fast',
										isActive
											? 'bg-surface-card text-text-accent shadow-sm ring-1 ring-primary/25'
											: 'text-text-secondary hover:text-text-primary',
									].join(' ')}
								>
									{option.label}
								</button>
							)
						})}
					</div>
					<div className='inline-flex rounded-pill bg-surface-subtle/70 p-1 ring-1 ring-border-soft/45'>
						{directionOptions.map((option) => {
							const isActive = directionFilter === option.value
							return (
								<button
									key={option.value}
									type='button'
									onClick={() => setDirectionFilter(option.value)}
									className={[
										'inline-flex min-h-8 items-center rounded-pill px-3 text-[12px] font-semibold transition duration-fast',
										isActive
											? 'bg-surface-card text-text-accent shadow-sm ring-1 ring-primary/25'
											: 'text-text-secondary hover:text-text-primary',
									].join(' ')}
								>
									{option.label}
								</button>
							)
						})}
					</div>
				</div>
			</div>

			{/* Call log */}
			<div className='overflow-hidden rounded-[20px] bg-surface-card ring-1 ring-border-soft/25'>
				{isLoading ? (
					<div className='p-6'>
						<LoadingState
							title={t('callsPage.loadingTitle')}
							description={t('callsPage.loadingDescription')}
						/>
					</div>
				) : hasError ? (
					<div className='p-6'>
						<EmptyState title={t('callsPage.error.title')} description={t('callsPage.error.description')} />
					</div>
				) : filteredSessions.length === 0 ? (
					<div className='p-6'>
						<EmptyState title={t('callsPage.empty.title')} description={t('callsPage.empty.description')} />
					</div>
				) : (
					<div className='overflow-x-auto'>
						<table className='w-full min-w-[720px] border-collapse text-left'>
							<thead>
								<tr className='border-b border-border-soft/50 text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted'>
									<th className='px-4 py-3 font-semibold'>{t('callsPage.table.contact')}</th>
									<th className='px-4 py-3 font-semibold'>{t('callsPage.table.direction')}</th>
									<th className='px-4 py-3 font-semibold'>{t('callsPage.table.status')}</th>
									<th className='px-4 py-3 font-semibold'>{t('callsPage.table.duration')}</th>
									<th className='px-4 py-3 font-semibold'>{t('callsPage.table.operator')}</th>
									<th className='px-4 py-3 font-semibold'>{t('callsPage.table.time')}</th>
								</tr>
							</thead>
							<tbody>
								{filteredSessions.map((session) => {
									const summary = summarizeSessionCall(session)
									const name = getConversationDisplayName(session, t('callsPage.unknownContact'))
									const number = getSessionPhoneNumber(session)
									const directionKey = summary.direction ?? 'unknown'
									const unread = Math.max(0, session.unread_count ?? 0)

									return (
										<tr
											key={session.id}
											onClick={() => setSelectedSession(session)}
											className='cursor-pointer border-b border-border-soft/30 transition duration-fast last:border-b-0 hover:bg-surface-subtle/60'
										>
											<td className='px-4 py-3'>
												<div className='flex items-center gap-3'>
													<span className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-[13px] font-bold text-white'>
														<DirectionIcon direction={summary.direction} className='h-4 w-4' />
													</span>
													<div className='min-w-0'>
														<p className='m-0 truncate text-sm font-semibold text-text-primary'>{name}</p>
														{number ? (
															<p className='m-0 truncate text-[12px] text-text-secondary'>{number}</p>
														) : null}
													</div>
													{unread > 0 ? (
														<span className='ml-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[10px] font-bold text-white'>
															{unread}
														</span>
													) : null}
												</div>
											</td>
											<td className='px-4 py-3'>
												<span className='inline-flex items-center gap-1.5 text-[13px] font-medium text-text-secondary'>
													<DirectionIcon
														direction={summary.direction}
														className={['h-3.5 w-3.5', DIRECTION_ICON_CLASS[directionKey]].join(' ')}
													/>
													{t(`callsPage.direction.${directionKey === 'unknown' ? 'all' : directionKey}`)}
												</span>
											</td>
											<td className='px-4 py-3'>
												<span
													className={[
														'inline-flex min-h-6 items-center gap-1 rounded-pill px-2.5 text-[11px] font-bold uppercase tracking-[0.06em] ring-1',
														STATUS_BADGE_CLASS[summary.status],
													].join(' ')}
												>
													{summary.status === 'live' ? (
														<span className='inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-danger' aria-hidden='true' />
													) : summary.status === 'missed' ? (
														<FiPhoneMissed className='h-3 w-3' aria-hidden='true' />
													) : null}
													{t(`callsPage.status.${summary.status}`)}
												</span>
											</td>
											<td className='px-4 py-3 text-[13px] font-semibold text-text-primary'>
												{summary.status === 'missed'
													? '—'
													: formatCallDuration(summary.durationSeconds)}
											</td>
											<td className='px-4 py-3 text-[13px] text-text-secondary'>
												{summary.extension ?? '—'}
											</td>
											<td className='px-4 py-3 text-[13px] text-text-secondary'>
												{formatTime(summary.at)}
											</td>
										</tr>
									)
								})}
							</tbody>
						</table>
					</div>
				)}
			</div>

			<CallDetailDrawer
				session={selectedSession}
				isOpen={Boolean(selectedSession)}
				onClose={() => setSelectedSession(null)}
			/>
		</div>
	)
}

export default CallsView
