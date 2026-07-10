import { useEffect, useState } from 'react'
import { FiCheck, FiRefreshCw, FiSave, FiSearch, FiX } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { EmptyState, LoadingState, PageCard } from '../../../components/shared/page'
import { StatusBadge } from '../../../components/shared/data'
import { services } from '../../../services'
import type { Client, ClientReviewDetail } from '../../../services/contracts'

const inputClassName = 'w-full rounded-lg border border-border-soft/60 bg-surface-card px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 disabled:opacity-60'
const labelClassName = 'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted'

type ReviewStatus = 'pending' | 'verified' | 'rejected'

function statusTone(status?: string): 'warning' | 'success' | 'danger' {
	return status === 'verified' ? 'success' : status === 'rejected' ? 'danger' : 'warning'
}

export function ClientReviewQueue() {
	const { t } = useTranslation()
	const [status, setStatus] = useState<ReviewStatus>('pending')
	const [search, setSearch] = useState('')
	const [items, setItems] = useState<Client[]>([])
	const [selectedId, setSelectedId] = useState<string | null>(null)
	const [detail, setDetail] = useState<ClientReviewDetail | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [isDetailLoading, setIsDetailLoading] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
	const [rejectReason, setRejectReason] = useState('')

	async function loadReviews() {
		setIsLoading(true)
		setError(null)
		try {
			if (!services.clients.listClientReviews) throw new Error(t('clients.review.notAvailable'))
			const next: Client[] = await services.clients.listClientReviews({ verification_status: status, search: search.trim() || undefined })
			setItems(next)
			if (selectedId && !next.some(item => item.id === selectedId)) {
				setSelectedId(null)
				setDetail(null)
			}
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : t('clients.review.loadError'))
		} finally {
			setIsLoading(false)
		}
	}

	useEffect(() => {
		void loadReviews()
		// Search is intentionally server-backed; the backend owns filtering semantics.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [status, search])

	async function openReview(id: string) {
		setSelectedId(id)
		setIsDetailLoading(true)
		setError(null)
		try {
			if (!services.clients.getClientReview) throw new Error(t('clients.review.notAvailable'))
			setDetail(await services.clients.getClientReview(id))
			setRejectReason('')
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : t('clients.review.detailError'))
		} finally {
			setIsDetailLoading(false)
		}
	}

	async function saveDetails() {
		if (!detail || !services.clients.updateClientReview) return
		setIsSaving(true)
		setMessage(null)
		try {
			const next = await services.clients.updateClientReview(detail.id, {
				full_name: detail.full_name,
				phone: detail.phone,
				email: detail.email,
				region: detail.region,
				company_name: detail.company_name,
				inn: detail.inn,
				notes: detail.notes,
			})
			setDetail(next)
			setMessage({ type: 'success', text: t('clients.review.saved') })
			await loadReviews()
		} catch (cause) {
			setMessage({ type: 'error', text: cause instanceof Error ? cause.message : t('clients.review.saveError') })
		} finally {
			setIsSaving(false)
		}
	}

	async function verify() {
		if (!detail || !services.clients.verifyClient || !window.confirm(t('clients.review.verifyConfirm'))) return
		setIsSaving(true)
		setMessage(null)
		try {
			const next = await services.clients.verifyClient(detail.id)
			setDetail(next)
			setMessage({ type: 'success', text: t('clients.review.verified') })
			await loadReviews()
		} catch (cause) {
			setMessage({ type: 'error', text: cause instanceof Error ? cause.message : t('clients.review.actionError') })
		} finally {
			setIsSaving(false)
		}
	}

	async function reject() {
		if (!detail || !services.clients.rejectClient || !rejectReason.trim()) {
			setMessage({ type: 'error', text: t('clients.review.reasonRequired') })
			return
		}
		setIsSaving(true)
		setMessage(null)
		try {
			const next = await services.clients.rejectClient(detail.id, rejectReason.trim())
			setDetail(next)
			setMessage({ type: 'success', text: t('clients.review.rejected') })
			await loadReviews()
		} catch (cause) {
			setMessage({ type: 'error', text: cause instanceof Error ? cause.message : t('clients.review.actionError') })
		} finally {
			setIsSaving(false)
		}
	}

	function updateDetail(field: keyof ClientReviewDetail, value: string) {
		setDetail(current => current ? { ...current, [field]: value } : current)
	}

	return (
		<div className='grid gap-4 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.4fr)]'>
			<PageCard className='min-w-0'>
				<div className='mb-4 flex flex-wrap items-end gap-3'>
					<label className='grid min-w-[220px] flex-1 gap-1.5'>
						<span className={labelClassName}>{t('clients.review.search')}</span>
						<div className='relative'>
							<FiSearch className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted' />
							<input className={`${inputClassName} pl-9`} value={search} onChange={event => setSearch(event.target.value)} placeholder={t('clients.review.searchPlaceholder')} />
						</div>
					</label>
					<label className='grid min-w-[150px] gap-1.5'>
						<span className={labelClassName}>{t('clients.review.status')}</span>
						<select className={inputClassName} value={status} onChange={event => setStatus(event.target.value as ReviewStatus)}>
							<option value='pending'>{t('clients.review.pending')}</option>
							<option value='verified'>{t('clients.review.verifiedStatus')}</option>
							<option value='rejected'>{t('clients.review.rejectedStatus')}</option>
						</select>
					</label>
					<button type='button' className='inline-flex h-10 items-center gap-2 rounded-lg bg-surface-card px-3 text-sm font-semibold text-text-secondary ring-1 ring-border-soft/50 hover:bg-surface-subtle' onClick={() => void loadReviews()} disabled={isLoading}>
						<FiRefreshCw className={isLoading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
						{t('clients.review.refresh')}
					</button>
				</div>
				{isLoading ? <LoadingState title={t('clients.review.loadingTitle')} description={t('clients.review.loadingDescription')} /> : error ? <EmptyState title={t('clients.review.errorTitle')} description={error} /> : items.length === 0 ? <EmptyState title={t('clients.review.emptyTitle')} description={t('clients.review.emptyDescription')} /> : <div className='grid gap-2'>
					{items.map(item => <button key={item.id} type='button' onClick={() => void openReview(item.id)} className={`grid gap-2 rounded-xl p-3 text-left ring-1 transition hover:bg-surface-subtle ${selectedId === item.id ? 'bg-primary/8 ring-primary/35' : 'bg-surface-card ring-border-soft/45'}`}>
						<div className='flex items-start justify-between gap-3'><span className='min-w-0 truncate text-sm font-semibold text-text-primary'>{item.full_name}</span><StatusBadge status={item.verification_status ?? status} tone={statusTone(item.verification_status ?? status)} label={item.verification_status_display ?? status} /></div>
						<div className='grid gap-0.5 text-xs text-text-secondary'><span>{item.company_name || item.client_type_display || item.client_type || '-'}</span><span>{item.phone || item.email || item.region || '-'}</span></div>
					</button>)}
				</div>}
			</PageCard>

			<PageCard className='min-w-0'>
				{isDetailLoading ? <LoadingState title={t('clients.review.detailLoadingTitle')} description={t('clients.review.detailLoadingDescription')} /> : !detail ? <EmptyState title={t('clients.review.selectTitle')} description={t('clients.review.selectDescription')} /> : <div className='grid gap-5'>
					<div className='flex flex-wrap items-start justify-between gap-3'>
						<div><p className='m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary'>{t('clients.review.detailEyebrow')}</p><h2 className='mt-1 text-xl font-bold text-text-primary'>{detail.full_name}</h2><p className='mt-1 text-sm text-text-secondary'>{detail.client_type_display || detail.client_type || '-'}</p></div>
						<StatusBadge status={detail.verification_status ?? 'pending'} tone={statusTone(detail.verification_status)} label={detail.verification_status_display ?? detail.verification_status ?? 'pending'} />
					</div>
					<div className='grid gap-3 sm:grid-cols-2'>
						{(['full_name', 'phone', 'email', 'region', 'company_name', 'inn'] as const).map(field => <label key={field} className='grid gap-1.5'><span className={labelClassName}>{t(`clients.review.fields.${field}`)}</span><input className={inputClassName} value={String(detail[field] ?? '')} onChange={event => updateDetail(field, event.target.value)} disabled={isSaving} /></label>)}
						<label className='grid gap-1.5 sm:col-span-2'><span className={labelClassName}>{t('clients.review.fields.notes')}</span><textarea className={`${inputClassName} min-h-24 resize-y`} value={detail.notes ?? ''} onChange={event => updateDetail('notes', event.target.value)} disabled={isSaving} /></label>
					</div>
					{detail.ai_summary ? <div className='rounded-xl bg-primary/8 p-4 ring-1 ring-primary/15'><p className={labelClassName}>{t('clients.review.aiSummary')}</p><p className='mt-2 whitespace-pre-wrap text-sm leading-6 text-text-primary'>{detail.ai_summary}</p></div> : null}
					{detail.company ? <div className='rounded-xl bg-surface-subtle p-4 ring-1 ring-border-soft/50'><p className={labelClassName}>{t('clients.review.companyDetails')}</p><div className='mt-2 grid gap-2 text-sm text-text-secondary sm:grid-cols-2'><span>{detail.company.legal_name || '-'}</span><span>{detail.company.bank || '-'}</span><span>{detail.company.inn || '-'}</span><span>{detail.company.mfo || '-'}</span></div></div> : null}
					{detail.rejection_reason ? <p className='m-0 rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger'>{t('clients.review.rejectionReason')}: {detail.rejection_reason}</p> : null}
					{detail.verification_status === 'pending' ? <label className='grid gap-1.5'><span className={labelClassName}>{t('clients.review.rejectReason')}</span><textarea className={`${inputClassName} min-h-20 resize-y`} value={rejectReason} onChange={event => setRejectReason(event.target.value)} placeholder={t('clients.review.rejectReasonPlaceholder')} disabled={isSaving} /></label> : null}
					{message ? <p className={`m-0 rounded-lg px-3 py-2 text-sm font-medium ${message.type === 'success' ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'}`}>{message.text}</p> : null}
					<div className='flex flex-wrap items-center gap-2'>
						<button type='button' className='inline-flex min-h-10 items-center gap-2 rounded-lg bg-surface-card px-4 text-sm font-semibold text-text-secondary ring-1 ring-border-soft/50 hover:bg-surface-subtle disabled:opacity-60' onClick={() => void saveDetails()} disabled={isSaving}><FiSave className='h-4 w-4' />{t('clients.review.save')}</button>
						{detail.verification_status === 'pending' ? <><button type='button' className='inline-flex min-h-10 items-center gap-2 rounded-lg bg-danger px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60' onClick={() => void reject()} disabled={isSaving}><FiX className='h-4 w-4' />{t('clients.review.reject')}</button><button type='button' className='ml-auto inline-flex min-h-10 items-center gap-2 rounded-lg bg-success px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60' onClick={() => void verify()} disabled={isSaving}><FiCheck className='h-4 w-4' />{t('clients.review.verify')}</button></> : null}
					</div>
				</div>}
			</PageCard>
		</div>
	)
}
