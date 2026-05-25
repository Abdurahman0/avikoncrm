/**
 * Chat service adapter implementation
 */

import { ApiRequestor } from './api-requestor'
import type {
	ChatMessage,
	ChatMessagesListParams,
	ChatSession,
	ChatSessionsListParams,
	CreateMessageInput,
	IChatService,
	PaginatedResponse,
} from '../../contracts'

function asRecord(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return null
	}

	return value as Record<string, unknown>
}

function extractLastMessage(
	payload: unknown,
	sessionId: string,
): Record<string, unknown> | null {
	const record = asRecord(payload)
	if (!record) {
		return null
	}

	const messages = Array.isArray(record.messages) ? record.messages : []
	const lastFromList =
		messages.length > 0 ? asRecord(messages[messages.length - 1]) : null
	const lastDirect = asRecord(record.last_message)
	const candidate = lastFromList ?? lastDirect

	if (candidate) {
		return {
			...candidate,
			session_id: sessionId,
		}
	}

	// Some backends may return the message directly.
	if (typeof record.content === 'string') {
		return {
			...record,
			session_id: sessionId,
		}
	}

	return null
}

function createFallbackOperatorMessage(
	sessionId: string,
	content: string,
	metadata?: Record<string, unknown>,
): ChatMessage {
	const nowIso = new Date().toISOString()

	return {
		id: `local-${sessionId}-${Date.now()}`,
		created_at: nowIso,
		updated_at: nowIso,
		session_id: sessionId,
		sender_type: 'operator',
		content,
		metadata: (metadata as Record<string, unknown>) ?? undefined,
	} as ChatMessage
}

export class ChatAdapter implements IChatService {
	private requestor: ApiRequestor

	constructor(baseUrl: string) {
		this.requestor = new ApiRequestor(baseUrl)
	}

	async listSessions(
		params?: ChatSessionsListParams,
	): Promise<PaginatedResponse<ChatSession>> {
		return this.requestor.get<PaginatedResponse<ChatSession>>(
			'/api/chat/sessions/',
			params as Record<string, unknown>,
		)
	}

	async getSession(id: string): Promise<ChatSession> {
		return this.requestor.get<ChatSession>(`/api/chat/sessions/${id}/`)
	}

	async listMessages(
		sessionId: string,
		params?: ChatMessagesListParams,
	): Promise<PaginatedResponse<ChatMessage>> {
		return this.requestor.get<PaginatedResponse<ChatMessage>>(
			`/api/chat/sessions/${sessionId}/messages/`,
			params as Record<string, unknown>,
		)
	}

	async getMessages(sessionId: string): Promise<ChatMessage[]> {
		const response = await this.listMessages(sessionId)
		return response.items
	}

	async sendMessage(
		sessionId: string,
		input: CreateMessageInput,
	): Promise<ChatMessage> {
		try {
			const data = await this.requestor.post<unknown>(
				`/api/chat/sessions/${sessionId}/send-message/`,
				{ content: input.content },
			)

			const message = extractLastMessage(data, sessionId)
			if (message) {
				return message as unknown as ChatMessage
			}

			return createFallbackOperatorMessage(
				sessionId,
				input.content,
				input.metadata as Record<string, unknown> | undefined,
			)
		} catch (error) {
			const statusCode =
				typeof (error as any)?.statusCode === 'number'
					? ((error as any).statusCode as number)
					: null

			// Only fall back when the endpoint is missing/not allowed.
			if (statusCode !== 404 && statusCode !== 405) {
				throw error
			}
		}

		try {
			const data = await this.requestor.post<unknown>(
				`/api/chat/sessions/${sessionId}/operator-message/`,
				{ content: input.content },
			)

			const message = extractLastMessage(data, sessionId)
			if (message) {
				return message as unknown as ChatMessage
			}

			return createFallbackOperatorMessage(
				sessionId,
				input.content,
				input.metadata as Record<string, unknown> | undefined,
			)
		} catch (error) {
			throw error ?? new Error('Failed to send operator message')
		}
	}

	subscribeToSession(
		sessionId: string,
		callback: (message: ChatMessage) => void,
	): () => void {
		// WebSocket implementation
		// This is a placeholder - actual implementation would use WebSocket
		try {
			const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
			const wsUrl = `${protocol}//${window.location.host}/ws/chat/${sessionId}/`
			const ws = new WebSocket(wsUrl)

			ws.onmessage = (event: MessageEvent) => {
				try {
					const message = JSON.parse(event.data) as ChatMessage
					callback(message)
				} catch (error) {
					console.error('Failed to parse WebSocket message:', error)
				}
			}

			// Return unsubscribe function
			return () => {
				ws.close()
			}
		} catch (error) {
			console.error('Failed to subscribe to session:', error)
			return () => {}
		}
	}
}
