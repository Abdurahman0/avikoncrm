/**
 * Logs service adapter implementation
 */

import { ApiRequestor } from './api-requestor'
import type {
	ApiLog,
	AILog,
	ILogsService,
	LogsListParams,
	PaginatedResponse,
} from '../../contracts'

type UnknownRecord = Record<string, unknown>

function toRecord(value: unknown): UnknownRecord | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return null
	}

	return value as UnknownRecord
}

function toStringValue(value: unknown): string {
	if (typeof value === 'string') {
		return value.trim()
	}
	if (typeof value === 'number' && Number.isFinite(value)) {
		return String(value)
	}
	return ''
}

function toNumberValue(value: unknown, fallback = 0): number {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value
	}
	if (typeof value === 'string') {
		const parsed = Number(value.trim())
		if (Number.isFinite(parsed)) {
			return parsed
		}
	}
	return fallback
}

function parseApiLog(value: unknown): ApiLog | null {
	const payload = toRecord(value)
	if (!payload) {
		return null
	}

	const id = toStringValue(payload.id)
	if (!id) {
		return null
	}

	const requestBody = toStringValue(payload.request_body)
	const responseBody = toStringValue(payload.response_body)
	const errorValue = toStringValue(payload.error)
	const method = toStringValue(payload.method) || 'GET'
	const path = toStringValue(payload.path) || '/'
	const statusCode = toNumberValue(payload.status_code, 0)

	return {
		id,
		method,
		endpoint: path,
		status_code: statusCode,
		level:
			statusCode >= 500
				? 'error'
				: statusCode >= 400
					? 'warning'
					: 'info',
		request_data: requestBody
			? ({ raw: requestBody } as Record<string, unknown>)
			: undefined,
		response_data: responseBody
			? ({ raw: responseBody } as Record<string, unknown>)
			: undefined,
		error: errorValue || undefined,
		duration_ms: toNumberValue(payload.latency_ms, 0),
		created_at: toStringValue(payload.created_at) || undefined,
	}
}

function parseAiLog(value: unknown): AILog | null {
	const payload = toRecord(value)
	if (!payload) {
		return null
	}

	const id = toStringValue(payload.id)
	if (!id) {
		return null
	}

	return {
		id,
		action: 'ai_request',
		model: toStringValue(payload.model) || undefined,
		prompt: toStringValue(payload.input_payload) || undefined,
		response: toStringValue(payload.output_payload) || undefined,
		level: toStringValue(payload.error) ? 'error' : 'info',
		tokens_used: toNumberValue(payload.token_usage, 0),
		error: toStringValue(payload.error) || undefined,
		duration_ms: toNumberValue(payload.latency_ms, 0),
		created_at: toStringValue(payload.created_at) || undefined,
	}
}

function parseListResponse<T>(
	data: unknown,
	params: LogsListParams | undefined,
	mapper: (entry: unknown) => T | null,
): PaginatedResponse<T> {
	const payload = toRecord(data) ?? {}
	const rawItems = Array.isArray(payload.results)
		? payload.results
		: Array.isArray(payload.items)
			? payload.items
			: []
	const items = rawItems
		.map(entry => mapper(entry))
		.filter((entry): entry is T => entry !== null)
	const count = typeof payload.count === 'number' ? payload.count : items.length

	return {
		items,
		total: count,
		page:
			typeof payload.page === 'number'
				? payload.page
				: params?.page,
		page_size:
			typeof payload.page_size === 'number'
				? payload.page_size
				: params?.page_size,
		count,
		next: typeof payload.next === 'string' ? payload.next : null,
		previous: typeof payload.previous === 'string' ? payload.previous : null,
	}
}

export class LogsAdapter implements ILogsService {
	private requestor: ApiRequestor

	constructor(baseUrl: string) {
		this.requestor = new ApiRequestor(baseUrl)
	}

	// API Logs
	async listApiLogs(
		params?: LogsListParams,
	): Promise<PaginatedResponse<ApiLog>> {
		const data = await this.requestor.get<unknown>(
			'/api/logs/api/',
			params as Record<string, unknown>,
		)
		return parseListResponse(data, params, parseApiLog)
	}

	async getApiLog(id: string): Promise<ApiLog> {
		const data = await this.requestor.get<unknown>(`/api/logs/api/${id}/`)
		const mapped = parseApiLog(data)
		if (!mapped) {
			throw new Error('API log not found')
		}
		return mapped
	}

	// AI Logs
	async listAILogs(params?: LogsListParams): Promise<PaginatedResponse<AILog>> {
		const data = await this.requestor.get<unknown>(
			'/api/logs/ai/',
			params as Record<string, unknown>,
		)
		return parseListResponse(data, params, parseAiLog)
	}

	async getAILog(id: string): Promise<AILog> {
		const data = await this.requestor.get<unknown>(`/api/logs/ai/${id}/`)
		const mapped = parseAiLog(data)
		if (!mapped) {
			throw new Error('AI log not found')
		}
		return mapped
	}
}
