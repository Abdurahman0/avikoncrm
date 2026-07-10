import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiEdit2, FiTrash2 } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import {
	DataTable,
	FilterBar,
	FilterSelect,
	Pagination,
	SearchInput,
	StatusBadge,
	type DataTableColumn,
} from '../../../components/shared/data'
import { useList } from '../../../components/hooks'
import { services } from '../../../services'
import type { Client, ClientsListParams, ClientStatusRecord } from '../../../services/contracts'

export interface ClientsListViewProps {
	onRowClick?: (client: Client) => void
	onEditClient?: (client: Client) => void
	onDeleteClient?: (client: Client) => void
	selectedClientId?: string | null
	canManageClients?: boolean
	onStatsChange?: (stats: { visible: number; total: number; loading: boolean }) => void
}

type SelectOption = { value: string; label: string }

const labelClassName =
	'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted'

const tablePrimaryTextClassName =
	'block max-w-[140px] truncate text-sm font-semibold leading-[1.35] text-text-primary min-[640px]:max-w-[220px]'

const tableSecondaryTextClassName =
	'block max-w-[140px] truncate text-[12px] leading-[1.45] text-text-secondary min-[640px]:max-w-[220px]'

const actionButtonClassName =
	'inline-flex h-8 w-8 items-center justify-center rounded-md bg-surface-card text-text-secondary shadow-sm ring-1 ring-border-soft/40 transition duration-fast hover:bg-surface-subtle hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20'

function statusTone(status?: string): 'info' | 'warning' | 'accent' | 'success' | 'danger' {
	switch (status) {
		case 'new':
			return 'info'
		case 'contacted':
		case 'need_follow_up':
		case 'proposal_preparing':
		case 'proposal_sent':
		case 'negotiation':
		case 'waiting_for_decision':
		case 'postponed':
			return 'warning'
		case 'qualified':
			return 'accent'
		case 'won':
			return 'success'
		case 'lost':
			return 'danger'
		default:
			return 'info'
	}
}

export function ClientsListView({
	onRowClick,
	onEditClient,
	onDeleteClient,
	selectedClientId,
	canManageClients = false,
	onStatsChange,
}: ClientsListViewProps) {
	const { i18n } = useTranslation()
	const isRu = i18n.language === 'ru'

	const tx = isRu
		? {
				searchPlaceholder: 'Поиск по имени, телефону, региону или заметкам...',
				allStatuses: 'Все статусы',
				allSources: 'Все источники',
				updatedNewest: 'Обновлено (сначала новые)',
				updatedOldest: 'Обновлено (сначала старые)',
				createdNewest: 'Создано (сначала новые)',
				createdOldest: 'Создано (сначала старые)',
				statusLabel: 'Статус',
				sourceLabel: 'Источник',
				orderLabel: 'Сортировка',
				listTitle: 'Очередь клиентов',
				listHint: 'Нажмите на строку, чтобы открыть профиль.',
				columns: {
					name: 'Клиент',
					phone: 'Телефон',
					region: 'Регион',
					source: 'Источник',
					status: 'Статус',
					actions: 'Действия',
				},
				statuses: {
					new: 'Новый',
					contacted: 'Связались',
					qualified: 'Квалифицирован',
					need_follow_up: 'Нужен фоллоу-ап',
					proposal_preparing: 'Подготовка предложения',
					proposal_sent: 'Предложение отправлено',
					negotiation: 'Переговоры',
					waiting_for_decision: 'Ожидание решения',
					won: 'Выигран',
					lost: 'Потерян',
					postponed: 'Отложен',
				},
				empty: 'Клиенты не найдены',
				edit: 'Редактировать',
				delete: 'Удалить',
			}
		: {
				searchPlaceholder: 'Ism, telefon, hudud yoki izoh bo\'yicha qidiring...',
				allStatuses: 'Barcha holatlar',
				allSources: 'Barcha manbalar',
				updatedNewest: 'Yangilangan (yangi)',
				updatedOldest: 'Yangilangan (eski)',
				createdNewest: 'Yaratilgan (yangi)',
				createdOldest: 'Yaratilgan (eski)',
				statusLabel: 'Holat',
				sourceLabel: 'Manba',
				orderLabel: 'Saralash',
				listTitle: 'Mijozlar navbati',
				listHint: 'Profilni ko\'rish uchun satrni bosing.',
				columns: {
					name: 'Mijoz',
					phone: 'Telefon',
					region: 'Hudud',
					source: 'Manba',
					status: 'Holat',
					actions: 'Amallar',
				},
				statuses: {
					new: 'Yangi',
					contacted: "Bog'lanildi",
					qualified: 'Saralangan',
					need_follow_up: 'Qayta aloqa kerak',
					proposal_preparing: 'Taklif tayyorlanmoqda',
					proposal_sent: 'Taklif yuborildi',
					negotiation: 'Muzokara',
					waiting_for_decision: 'Qaror kutilmoqda',
					won: 'Yutildi',
					lost: "Yo'qotildi",
					postponed: 'Kechiktirildi',
				},
				empty: 'Mijozlar topilmadi',
				edit: 'Tahrirlash',
				delete: 'O\'chirish',
			}

	const [searchQuery, setSearchQuery] = useState('')
	const [statusFilter, setStatusFilter] = useState<string>('all')
	const [statusCatalog, setStatusCatalog] = useState<ClientStatusRecord[]>([])
	const [clientTypeFilter, setClientTypeFilter] = useState<string>('all')
	const [ordering, setOrdering] = useState<string>('-updated_at')
	const [filters, setFilters] = useState<ClientsListParams>({
		search: '',
		page: 1,
		page_size: 20,
		ordering: '-updated_at',
	})

	const fetcher = useCallback(
		(params?: ClientsListParams) => services.clients.listClients(params),
		[],
	)

	const [state, actions] = useList<Client, ClientsListParams>(fetcher, {
		params: filters,
		autoFetch: true,
	})

	useEffect(() => {
		let active = true
		services.clients.listClientStatuses()
			.then((items: ClientStatusRecord[]) => {
				if (active) setStatusCatalog(items)
			})
			.catch(() => {
				if (active) setStatusCatalog([])
			})
		return () => { active = false }
	}, [])

	useEffect(() => {
		onStatsChange?.({
			visible: state.items.length,
			total: state.total,
			loading: state.isLoading,
		})
	}, [onStatsChange, state.items.length, state.total, state.isLoading])

	const statusOptions = useMemo<SelectOption[]>(
		() => statusCatalog.length > 0 ? [
			{ value: 'all', label: tx.allStatuses },
			...statusCatalog.map(status => ({ value: status.slug, label: status.name })),
		] : [
			{ value: 'all', label: tx.allStatuses },
			{ value: 'new', label: tx.statuses.new },
			{ value: 'contacted', label: tx.statuses.contacted },
			{ value: 'qualified', label: tx.statuses.qualified },
			{ value: 'need_follow_up', label: tx.statuses.need_follow_up },
			{ value: 'proposal_preparing', label: tx.statuses.proposal_preparing },
			{ value: 'proposal_sent', label: tx.statuses.proposal_sent },
			{ value: 'negotiation', label: tx.statuses.negotiation },
			{ value: 'waiting_for_decision', label: tx.statuses.waiting_for_decision },
			{ value: 'won', label: tx.statuses.won },
			{ value: 'lost', label: tx.statuses.lost },
			{ value: 'postponed', label: tx.statuses.postponed },
		],
		[statusCatalog, tx],
	)

	const sourceOptions = useMemo<SelectOption[]>(
		() => [
			{ value: 'all', label: isRu ? 'Все типы' : 'Barcha turlar' },
			{ value: 'individual', label: isRu ? 'Физ. лицо' : 'Jismoniy shaxs' },
			{ value: 'company', label: isRu ? 'Компания' : 'Kompaniya' },
		],
		[isRu],
	)

	const orderingOptions = useMemo<SelectOption[]>(
		() => [
			{ value: '-updated_at', label: tx.updatedNewest },
			{ value: 'updated_at', label: tx.updatedOldest },
			{ value: '-created_at', label: tx.createdNewest },
			{ value: 'created_at', label: tx.createdOldest },
		],
		[tx],
	)

	const columns = useMemo<DataTableColumn<Client>[]>(
		() => [
			{
				key: 'full_name',
				label: tx.columns.name,
				render: client => (
					<div className='grid gap-0.5'>
						<span className={tablePrimaryTextClassName}>{client.full_name}</span>
						<span className={tableSecondaryTextClassName}>{client.ai_summary || '-'}</span>
					</div>
				),
			},
			{
				key: 'phone',
				label: tx.columns.phone,
				render: client => <span className={tablePrimaryTextClassName}>{client.phone || '-'}</span>,
			},
			{
				key: 'region',
				label: tx.columns.region,
				render: client => <span className={tablePrimaryTextClassName}>{client.region || '-'}</span>,
			},
			{
				key: 'client_type',
				label: isRu ? 'Тип' : 'Turi',
				render: client => (
					<span className={tablePrimaryTextClassName}>
						{client.client_type_display || (client.client_type === 'company' ? (isRu ? 'Компания' : 'Kompaniya') : client.client_type === 'individual' ? (isRu ? 'Физ. лицо' : 'Jismoniy shaxs') : '-')}
					</span>
				),
			},
			{
				key: 'status',
				label: tx.columns.status,
				render: client => {
					const statusKey = (client.status || 'new') as keyof typeof tx.statuses
					const localizedLabel = tx.statuses[statusKey]
					return (
						<StatusBadge
							status={client.status || 'new'}
							label={localizedLabel || client.status_label || client.status || 'new'}
							tone={statusTone(client.status)}
						/>
					)
				},
			},
			...(canManageClients
				? [
						{
							key: 'actions',
							label: tx.columns.actions,
							align: 'right' as const,
							render: (client: Client) => (
								<div className='flex items-center justify-end gap-1.5'>
									<button
										type='button'
										className={actionButtonClassName}
										onClick={event => {
											event.stopPropagation()
											onEditClient?.(client)
										}}
										aria-label={tx.edit}
									>
										<FiEdit2 className='h-3.5 w-3.5' />
									</button>
									<button
										type='button'
										className={actionButtonClassName}
										onClick={event => {
											event.stopPropagation()
											onDeleteClient?.(client)
										}}
										aria-label={tx.delete}
									>
										<FiTrash2 className='h-3.5 w-3.5' />
									</button>
								</div>
							),
						},
					]
				: []),
		],
		[canManageClients, onDeleteClient, onEditClient, tx],
	)

	const handleSearch = (value: string) => {
		setSearchQuery(value)
		actions.setPage(1)
		setFilters(prev => ({ ...prev, search: value, page: 1 }))
	}

	const applyStatusFilter = (value: string) => {
		setStatusFilter(value)
		actions.setPage(1)
		setFilters(prev => ({
			...prev,
			page: 1,
			status: value === 'all' ? undefined : (value as any),
		}))
	}

	const applySourceFilter = (value: string) => {
		setClientTypeFilter(value)
		actions.setPage(1)
		setFilters(prev => ({
			...prev,
			page: 1,
			client_type: value === 'all' ? undefined : (value as any),
		}))
	}

	const applyOrdering = (value: string) => {
		setOrdering(value)
		actions.setPage(1)
		setFilters(prev => ({ ...prev, page: 1, ordering: value }))
	}

	const totalPages = Math.max(1, Math.ceil((state.total || 0) / (filters.page_size || 20)))
	const currentPage = filters.page || 1

	return (
		<div className='flex flex-col gap-4'>
			<FilterBar>
				<SearchInput
					value={searchQuery}
					onChange={handleSearch}
					placeholder={tx.searchPlaceholder}
				/>

				<label className='grid min-w-[min(180px,100%)] flex-[1_1_180px] gap-1.5 min-[640px]:flex-[0_1_200px]'>
					<span className={labelClassName}>{tx.statusLabel}</span>
					<FilterSelect
						value={statusFilter}
						options={statusOptions}
						onChange={applyStatusFilter}
						disabled={state.isLoading}
					/>
				</label>

				<label className='grid min-w-[min(180px,100%)] flex-[1_1_180px] gap-1.5 min-[640px]:flex-[0_1_200px]'>
					<span className={labelClassName}>{isRu ? 'Тип' : 'Turi'}</span>
					<FilterSelect
						value={clientTypeFilter}
						options={sourceOptions}
						onChange={applySourceFilter}
						disabled={state.isLoading}
					/>
				</label>

				<label className='grid min-w-[min(180px,100%)] flex-[1_1_180px] gap-1.5 min-[640px]:flex-[0_1_240px]'>
					<span className={labelClassName}>{tx.orderLabel}</span>
					<FilterSelect
						value={ordering}
						options={orderingOptions}
						onChange={applyOrdering}
						disabled={state.isLoading}
					/>
				</label>
			</FilterBar>

			<div className='grid min-w-0 gap-3'>
				<div className='flex flex-wrap items-center justify-between gap-2 px-1'>
					<div className="flex items-center gap-2">
						<h2 className='m-0 text-[1rem] font-semibold text-text-primary'>{tx.listTitle}</h2>
						<span className='text-[12px] font-medium text-text-muted'>{tx.listHint}</span>
					</div>
				</div>

				<div className='min-w-0 [&_.data-table__row--clickable:hover_.status-badge]:-translate-y-px'>
					<DataTable
						data={state.items}
						columns={columns}
						rowKey='id'
						selectedRowKey={selectedClientId ?? null}
						loading={state.isLoading}
						onRowClick={onRowClick}
						emptyTitle={tx.empty}
						emptyDescription={
							isRu
								? 'Измените параметры поиска или фильтры.'
								: 'Qidiruv yoki filtrlarni o\'zgartiring.'
						}
					/>
				</div>
			</div>

			{state.total > 0 ? (
				<Pagination
					currentPage={Math.min(currentPage, totalPages)}
					totalPages={totalPages}
					totalItems={state.total}
					onPageChange={page => {
						actions.setPage(page)
						setFilters(prev => ({ ...prev, page }))
					}}
				/>
			) : null}
		</div>
	)
}
