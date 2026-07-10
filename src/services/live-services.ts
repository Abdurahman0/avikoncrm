// @ts-nocheck

import { apiClient } from '../lib/api-client'
import { apiDashboardService } from './api/dashboard-service'
import { apiConversationService } from './api/conversation-service'
import { apiClientService, listClientStatuses } from './api/client-service'
import { apiProductService } from './api/product-service'
import {
	createAiSetting,
	deleteAiSetting,
	getActiveAiSetting,
	getAiSettingById,
	listAiSettings,
	patchAiSetting,
	setActiveAiSetting,
	updateAiSetting,
} from './api/ai-settings.service'
import {
	createConfig,
	deleteConfig,
	getConfigById,
	getEventById,
	listConfigs,
	listEvents,
	patchConfig,
	updateConfig,
} from './api/integrations.service'
import {
	createUser,
	deleteUser,
	getUserById,
	listPermissions as listLivePermissions,
	listUsers,
	patchUser,
	updateUser,
} from './api/users.service'
import { mapPermissionListDtoToItems } from './adapters/users.adapter'
import { services as mockServices } from './mock/mock-services'

const auditLogCache = new Map()

function toRecord(value) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return null
	}

	return value
}

function readString(value, fallback = '') {
	if (typeof value === 'string') {
		const trimmed = value.trim()
		return trimmed.length > 0 ? trimmed : fallback
	}

	if (typeof value === 'number' && Number.isFinite(value)) {
		return String(value)
	}

	return fallback
}

function readBoolean(value, fallback = false) {
	if (typeof value === 'boolean') {
		return value
	}

	if (typeof value === 'string') {
		const normalized = value.trim().toLowerCase()
		if (normalized === 'true') {
			return true
		}
		if (normalized === 'false') {
			return false
		}
	}

	return fallback
}

function readNumber(value, fallback = 0) {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value
	}

	if (typeof value === 'string') {
		const parsed = Number(value.trim())
		return Number.isFinite(parsed) ? parsed : fallback
	}

	return fallback
}

function toTitleCase(value) {
	return value
		.split(/[_\s-]+/)
		.filter(Boolean)
		.map(token => token.charAt(0).toUpperCase() + token.slice(1))
		.join(' ')
}

function mapHealthResponse(value) {
	const payload = toRecord(value) ?? {}
	const data = toRecord(payload.data) ?? payload
	const isHealthy = readBoolean(data.ok, false)
	return {
		status: isHealthy ? 'ok' : readString(payload.status, 'unknown'),
		database: readString(data.database, 'unknown'),
		redis: readString(data.redis, 'unknown'),
	}
}

function unavailableService(name) {
	return new Proxy({}, {
		get() {
			return async () => {
				throw new Error(`${name} is not exposed by the configured backend.`)
			}
		},
	})
}

function mapAuditLogToApiLog(value) {
	const record = toRecord(value)
	if (!record) {
		return null
	}

	const id = readString(record.id)
	if (!id) {
		return null
	}

	const action = readString(record.action, 'action')
	const targetType = readString(record.target_type, 'unknown')
	const targetRepr = readString(record.target_repr) || readString(record.target_id)
	const level =
		action === 'delete'
			? 'warning'
			: action === 'action'
				? 'info'
				: 'info'

	const mapped = {
		id,
		method: action.toUpperCase(),
		endpoint: targetRepr ? `${targetType}:${targetRepr}` : targetType,
		status_code: 200,
		level,
		request_data: record.before_data ?? null,
		response_data: record.after_data ?? null,
		error: readString(record.error) || undefined,
		duration_ms: readNumber(record.duration_ms, 0),
		user_id: readString(record.actor) || undefined,
		ip_address: undefined,
		created_at: readString(record.created_at) || undefined,
	}

	auditLogCache.set(mapped.id, mapped)
	return mapped
}

function parsePaginatedLogs(data, params) {
	const payload = toRecord(data) ?? {}
	const results = Array.isArray(payload.results)
		? payload.results
		: Array.isArray(payload.items)
			? payload.items
			: []
	const items = results
		.map(entry => mapAuditLogToApiLog(entry))
		.filter(Boolean)
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

async function listUserRolesFromApi() {
	const { data } = await apiClient.get('/api/auth/roles/')
	const payload = toRecord(data)
	const items = Array.isArray(data)
		? data
		: Array.isArray(payload?.data)
			? payload.data
			: Array.isArray(payload?.results)
				? payload.results
				: []

	if (!items.length) {
		return []
	}

	return items
		.map(entry => {
			if (typeof entry === 'string') {
				return {
					key: entry,
					label: toTitleCase(entry),
					default_permissions: [],
				}
			}

			const record = toRecord(entry)
			if (!record) {
				return null
			}

			const key = readString(record.key) || readString(record.role) || readString(record.id)
			if (!key) {
				return null
			}

			return {
				key,
				label: readString(record.label) || toTitleCase(key),
				default_permissions: Array.isArray(record.default_permissions)
					? record.default_permissions
					: [],
			}
		})
		.filter(Boolean)
}

async function listUserPermissionsFromApi(userId) {
	const { data } = await apiClient.get(`/api/users/${userId}/permissions/`)
	const mapped = mapPermissionListDtoToItems(data)
	if (mapped.length > 0) {
		return mapped
	}

	const payload = toRecord(data)
	const permissionsRaw = readString(payload?.permissions)
	if (!permissionsRaw) {
		return []
	}

	return permissionsRaw
		.split(/[,\s]+/)
		.map(token => token.trim())
		.filter(Boolean)
		.map(code => ({
			id: code,
			code,
			name: code,
			description: code,
		}))
}

export const liveServices = {
	...mockServices,
	leads: unavailableService('Leads'),
	products: apiProductService,
	contracts: unavailableService('Contracts'),
	notifications: unavailableService('Notifications'),
	operatorStatistics: unavailableService('Operator statistics'),
	dashboard: {
		...mockServices.dashboard,
		async getDashboardOverview(params) {
			return apiDashboardService.getOverview(params)
		},
	},
	common: {
		...mockServices.common,
		async getHealth() {
			const { data } = await apiClient.get('/api/health/')
			return mapHealthResponse(data)
		},
	},
	chat: {
		...mockServices.chat,
		async listSessions(params) {
			return apiConversationService.listSessions(params)
		},
		async getSessionById(id) {
			return apiConversationService.getSessionById(id)
		},
		async listMessages(firstArg, secondArg) {
			if (typeof firstArg === 'string') {
				return apiConversationService.listMessages({
					...(secondArg ?? {}),
					session: firstArg,
				})
			}

			return apiConversationService.listMessages(firstArg)
		},
		async sendMessage(sessionId, input) {
			return apiConversationService.sendMessage(sessionId, input)
		},
		async markSessionRead(sessionId) {
			return apiConversationService.markSessionRead(sessionId)
		},
		async pauseSessionAI(sessionId, pausedUntilIso) {
			return apiConversationService.pauseSessionAI(sessionId, pausedUntilIso)
		},
		async resumeSessionAI(sessionId) {
			return apiConversationService.resumeSessionAI(sessionId)
		},
		async requestOperator(sessionId) {
			return apiConversationService.requestOperator(sessionId)
		},
		async deleteSession(sessionId) {
			return apiConversationService.deleteSession(sessionId)
		},
	},
	clients: {
		...mockServices.clients,
		async listClients(params) {
			return apiClientService.listClients(params)
		},
		async getClient(id) {
			return apiClientService.getClient(id)
		},
		async listClientStatuses() {
			return listClientStatuses()
		},
		async createClient(input) {
			return apiClientService.createClient(input)
		},
		async bulkImportClient(input) {
			return apiClientService.bulkImportClient(input)
		},
		async updateClient(id, input) {
			return apiClientService.updateClient(id, input)
		},
		async patchClient(id, input) {
			return apiClientService.patchClient(id, input)
		},
		async deleteClient(id) {
			return apiClientService.deleteClient(id)
		},
		async exportClients() {
			return apiClientService.exportClients()
		},
		async listClientReviews(params) {
			return apiClientService.listClientReviews(params)
		},
		async getClientReview(id) {
			return apiClientService.getClientReview(id)
		},
		async updateClientReview(id, input) {
			return apiClientService.updateClientReview(id, input)
		},
		async verifyClient(id) {
			return apiClientService.verifyClient(id)
		},
		async rejectClient(id, reason) {
			return apiClientService.rejectClient(id, reason)
		},
	},
	integrations: {
		...mockServices.integrations,
		async listConfigs(params) {
			return listConfigs(params)
		},
		async getConfig(id) {
			return getConfigById(id)
		},
		async createConfig(input) {
			return createConfig(input)
		},
		async updateConfig(id, input) {
			return updateConfig(id, input)
		},
		async patchConfig(id, input) {
			return patchConfig(id, input)
		},
		async deleteConfig(id) {
			return deleteConfig(id)
		},
		async listEvents(params) {
			return listEvents(params)
		},
		async getEvent(id) {
			return getEventById(id)
		},
	},
	aiSettings: {
		...mockServices.aiSettings,
		async listSettings(params) {
			return listAiSettings(params)
		},
		async getSettingById(id) {
			return getAiSettingById(id)
		},
		async getSetting(id) {
			return getAiSettingById(id)
		},
		async getActiveSetting() {
			return getActiveAiSetting()
		},
		async createSetting(input) {
			return createAiSetting(input)
		},
		async updateSetting(id, input) {
			return updateAiSetting(id, input)
		},
		async patchSetting(id, input) {
			return patchAiSetting(id, input)
		},
		async deleteSetting(id) {
			return deleteAiSetting(id)
		},
		async setActiveSetting(id) {
			return setActiveAiSetting(id)
		},
	},
	logs: {
		...mockServices.logs,
		async getHealth() {
			const { data } = await apiClient.get('/api/health/')
			return mapHealthResponse(data)
		},
		async listApiLogs(params) {
			const { data } = await apiClient.get('/api/audit-logs/', {
				params: {
					page: params?.page,
					page_size: params?.page_size,
					search: params?.search,
					ordering: params?.ordering,
				},
			})

			return parsePaginatedLogs(data, params)
		},
		async listAILogs(params) {
			throw new Error('AI logs are not exposed by the configured backend.')
		},
		async getApiLog(id) {
			if (auditLogCache.has(id)) {
				return {
					id,
					type: 'api',
					message: `${auditLogCache.get(id).method} ${auditLogCache.get(id).endpoint}`,
					metadata: auditLogCache.get(id),
					created_at: auditLogCache.get(id).created_at,
				}
			}

			const result = await this.listApiLogs({
				page: 1,
				page_size: 100,
				search: id,
				ordering: '-created_at',
			})
			const matched = result.items.find(item => item.id === id)
			if (!matched) {
				throw new Error('Log not found')
			}

			return {
				id: matched.id,
				type: 'api',
				message: `${matched.method} ${matched.endpoint}`,
				metadata: matched,
				created_at: matched.created_at,
			}
		},
	},
	users: {
		...mockServices.users,
		async listUsers(params) {
			return listUsers(params)
		},
		async getUserById(id) {
			return getUserById(id)
		},
		async createUser(input) {
			return createUser(input)
		},
		async updateUser(id, input) {
			return updateUser(id, input)
		},
		async patchUser(id, input) {
			return patchUser(id, input)
		},
		async deleteUser(id) {
			return deleteUser(id)
		},
		async listPermissions() {
			try {
				const items = await listLivePermissions()
				return items
			} catch {
				return []
			}
		},
		async listRolesCatalog() {
			try {
				const items = await listUserRolesFromApi()
				return items
			} catch {
				return []
			}
		},
		async listUserPermissions(userId) {
			try {
				const items = await listUserPermissionsFromApi(userId)
				return items
			} catch {
				return []
			}
		},
	},
}
