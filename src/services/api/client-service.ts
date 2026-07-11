import { apiClient } from '../../lib/api-client'
import type {
	Client,
	ClientReviewDetail,
	ClientStatusRecord,
	ClientsListParams,
	CreateClientInput,
	PaginatedResponse,
	UpdateClientInput,
} from '../contracts'

type ClientStatusDto = ClientStatusRecord

let clientStatusesCache: ClientStatusDto[] | null = null
let clientStatusesPromise: Promise<ClientStatusDto[]> | null = null

function toRecord(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return null
	}

	return value as Record<string, unknown>
}

function readString(value: unknown): string {
	if (typeof value === 'string') {
		return value.trim()
	}

	if (typeof value === 'number' && Number.isFinite(value)) {
		return String(value)
	}

	return ''
}

function normalizeStatusSlug(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[\s-]+/g, '_')
}

function normalizeClientType(value: unknown): string | undefined {
	const raw = readString(value).toLowerCase()
	if (!raw) return undefined
	if (raw === 'individual') return 'jismoniy'
	if (raw === 'company') return 'yuridik'
	return raw
}

function isUuidLike(value: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
		value,
	)
}

function mapClientStatus(value: unknown): ClientStatusDto | null {
	const record = toRecord(value)
	if (!record) {
		return null
	}

	const id = readString(record.id)
	if (!id) {
		return null
	}

	const slug = normalizeStatusSlug(
		readString(record.slug) || readString(record.name) || id,
	)

	return {
		id,
		name: readString(record.name) || slug,
		slug,
		color: readString(record.color) || undefined,
	}
}

async function fetchClientStatuses(): Promise<ClientStatusDto[]> {
	const { data } = await apiClient.get<unknown>('/api/clients/statuses/', {
		params: {
			page: 1,
			page_size: 200,
			ordering: 'sort_order',
		},
	})

	const payload = toRecord(data) ?? {}
	const results = Array.isArray(payload.results)
		? payload.results
		: Array.isArray(payload.items)
			? payload.items
			: []

	return results
		.map(entry => mapClientStatus(entry))
		.filter((entry): entry is ClientStatusDto => entry !== null)
}

export async function listClientStatuses(): Promise<ClientStatusRecord[]> {
	return ensureClientStatuses()
}

async function ensureClientStatuses(): Promise<ClientStatusDto[]> {
	if (clientStatusesCache) {
		return clientStatusesCache
	}

	if (!clientStatusesPromise) {
		clientStatusesPromise = fetchClientStatuses()
			.then(items => {
				clientStatusesCache = items
				return items
			})
			.finally(() => {
				clientStatusesPromise = null
			})
	}

	return clientStatusesPromise
}

function normalizeClientResponse(
	value: unknown,
	statuses: ClientStatusDto[],
): Client {
	const record = toRecord(value) ?? {}
	const rawStatus = readString(record.status)
	const rawStatusName = readString(record.status_name)
	const matchedStatus =
		statuses.find(item => item.id === rawStatus) ??
		statuses.find(item => item.slug === normalizeStatusSlug(rawStatus)) ??
		statuses.find(item => item.slug === normalizeStatusSlug(rawStatusName))

	const normalizedStatus =
		matchedStatus?.slug ||
		(rawStatus && !isUuidLike(rawStatus) ? normalizeStatusSlug(rawStatus) : '') ||
		(rawStatusName ? normalizeStatusSlug(rawStatusName) : '') ||
		'new'

	return {
		...((record as unknown) as Client),
		client_type: normalizeClientType(record.client_type) as Client['client_type'],
		status: normalizedStatus as Client['status'],
		status_label: rawStatusName || matchedStatus?.name || normalizedStatus,
	}
}

function normalizeReviewDetail(value: unknown): ClientReviewDetail {
	const record = toRecord(value) ?? {}
	return {
		...((record as unknown) as ClientReviewDetail),
		client_type: normalizeClientType(record.client_type) as Client['client_type'],
	}
}

function parseListResponse(
	data: unknown,
	params: ClientsListParams | undefined,
	statuses: ClientStatusDto[],
): PaginatedResponse<Client> {
	const payload = toRecord(data) ?? {}
	const resultsRaw = Array.isArray(payload.results)
		? payload.results
		: Array.isArray(payload.items)
			? payload.items
			: []
	const items = resultsRaw.map(item => normalizeClientResponse(item, statuses))
	const count = typeof payload.count === 'number' ? payload.count : items.length

	return {
		items,
		total: count,
		page: params?.page,
		page_size: params?.page_size,
		count,
		next: typeof payload.next === 'string' ? payload.next : null,
		previous: typeof payload.previous === 'string' ? payload.previous : null,
	}
}

async function resolveClientStatusId(status: unknown): Promise<string | undefined> {
	const rawStatus = readString(status)
	if (!rawStatus) {
		return undefined
	}

	if (isUuidLike(rawStatus)) {
		return rawStatus
	}

	const statuses = await ensureClientStatuses()
	const normalized = normalizeStatusSlug(rawStatus)
	const matched =
		statuses.find(item => item.slug === normalized) ??
		statuses.find(item => normalizeStatusSlug(item.name) === normalized)

	return matched?.id
}

async function normalizePayload(
	input: CreateClientInput | UpdateClientInput,
): Promise<Record<string, unknown>> {
	const payload: Record<string, unknown> = {}
	const interestedProduct =
		readString((input as Record<string, unknown>).interested_product) ||
		readString(input.solution_type) ||
		readString(input.object_type) ||
		readString(input.budget_range)
	const statusId = await resolveClientStatusId(input.status)

	if (input.full_name !== undefined) {
		payload.full_name = input.full_name
	}

	if (input.phone !== undefined) {
		payload.phone = input.phone
	}

	for (const field of [
		'email',
		'preferred_contact_time',
		'region',
		'company_name',
		'inn',
	] as const) {
		if (input[field] !== undefined) {
			payload[field] = input[field]
		}
	}

	const clientType = normalizeClientType(input.client_type)
	if (clientType) {
		payload.client_type = clientType
	}

	if (input.source !== undefined) {
		payload.source = input.source
	} else if (input.source_platform !== undefined) {
		payload.source = input.source_platform
	}

	if (interestedProduct) {
		payload.interested_product = interestedProduct
	}

	if (input.notes !== undefined) {
		payload.notes = input.notes
	}

	if (statusId) {
		payload.status = statusId
	}

	return payload
}

export const apiClientService = {
	async listClients(params?: ClientsListParams): Promise<PaginatedResponse<Client>> {
		const [statuses, resolvedStatusId] = await Promise.all([
			ensureClientStatuses().catch(() => []),
			resolveClientStatusId(params?.status),
		])

		const { data } = await apiClient.get('/api/clients/', {
			params: {
				page: params?.page,
				page_size: params?.page_size,
				search: params?.search,
				status: resolvedStatusId,
				client_type: normalizeClientType(params?.client_type),
				region: params?.region,
				source: params?.source,
				verification_status: params?.verification_status,
				ordering: params?.ordering,
			},
		})

		return parseListResponse(data, params, statuses)
	},

	async getClient(id: string): Promise<Client> {
		const statuses = await ensureClientStatuses().catch(() => [])
		const { data } = await apiClient.get<Client>(`/api/clients/${id}/`)
		return normalizeClientResponse(data, statuses)
	},

	async createClient(input: CreateClientInput): Promise<Client> {
		const statuses = await ensureClientStatuses().catch(() => [])
		const payload = await normalizePayload(input)
		const { data } = await apiClient.post<Client>('/api/clients/', payload)
		return normalizeClientResponse(data, statuses)
	},

	async bulkImportClient(input: CreateClientInput): Promise<Client> {
		return this.createClient(input)
	},

	async updateClient(id: string, input: UpdateClientInput): Promise<Client> {
		const statuses = await ensureClientStatuses().catch(() => [])
		const payload = await normalizePayload(input)
		const { data } = await apiClient.put<Client>(`/api/clients/${id}/`, payload)
		return normalizeClientResponse(data, statuses)
	},

	async patchClient(id: string, input: UpdateClientInput): Promise<Client> {
		const statuses = await ensureClientStatuses().catch(() => [])
		const payload = await normalizePayload(input)
		const { data } = await apiClient.patch<Client>(`/api/clients/${id}/`, payload)
		return normalizeClientResponse(data, statuses)
	},

	async deleteClient(id: string): Promise<void> {
		await apiClient.delete(`/api/clients/${id}/`)
	},

	async exportClients(): Promise<Blob> {
		const response = await apiClient.get('/api/clients/', {
			params: {
				page: 1,
				page_size: 500,
				ordering: '-updated_at',
			},
		})

		const statuses = await ensureClientStatuses().catch(() => [])
		const list = parseListResponse(response.data, { page: 1, page_size: 500 }, statuses)
		const header = ['id', 'client_type', 'full_name', 'phone', 'email', 'region', 'company_name', 'inn', 'interested_product', 'status_label']
		const rows = list.items.map(item => [
			item.id,
			item.client_type ?? '',
			item.full_name,
			item.phone ?? '',
			item.email ?? '',
			item.region ?? '',
			item.company_name ?? '',
			item.inn ?? '',
			item.interested_product ?? '',
			item.status_label ?? item.status ?? '',
		])
		const csv = [header, ...rows]
			.map(row =>
				row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','),
			)
			.join('\n')

		return new Blob([csv], {
			type: 'text/csv;charset=utf-8',
		})
	},

	async listClientReviews(params?: { verification_status?: Client['verification_status']; search?: string }): Promise<Client[]> {
		const { data } = await apiClient.get<unknown>('/api/clients/review/', {
			params: {
				verification_status: params?.verification_status,
				search: params?.search,
			},
		})
		const payload = toRecord(data) ?? {}
		const items = Array.isArray(payload.data)
			? payload.data
			: Array.isArray(payload.results)
				? payload.results
				: []
		return items.map(item => normalizeClientResponse(item, []) )
	},

	async getClientReview(id: string): Promise<ClientReviewDetail> {
		const { data } = await apiClient.get<unknown>(`/api/clients/review/${id}/`)
		const payload = toRecord(data) ?? {}
		return normalizeReviewDetail(toRecord(payload.data) ?? payload)
	},

	async updateClientReview(id: string, input: Partial<Pick<Client, 'full_name' | 'phone' | 'email' | 'region' | 'company_name' | 'inn' | 'notes'>>): Promise<ClientReviewDetail> {
		const { data } = await apiClient.patch<unknown>(`/api/clients/review/${id}/`, input)
		const payload = toRecord(data) ?? {}
		return normalizeReviewDetail(toRecord(payload.data) ?? payload)
	},

	async verifyClient(id: string): Promise<ClientReviewDetail> {
		const { data } = await apiClient.post<unknown>(`/api/clients/review/${id}/verify/`)
		const payload = toRecord(data) ?? {}
		return normalizeReviewDetail(toRecord(payload.data) ?? payload)
	},

	async rejectClient(id: string, reason: string): Promise<ClientReviewDetail> {
		const { data } = await apiClient.post<unknown>(`/api/clients/review/${id}/reject/`, { reason })
		const payload = toRecord(data) ?? {}
		return normalizeReviewDetail(toRecord(payload.data) ?? payload)
	},
}
