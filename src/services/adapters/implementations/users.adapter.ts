/**
 * Users service adapter implementation
 */

import { BaseCrudAdapter } from './base-crud.adapter'
import { ApiRequestor } from './api-requestor'
import type {
	CreateUserInput,
	IUsersService,
	ManagedUser,
	PermissionCode,
	PaginatedResponse,
	UpdateUserInput,
	UserPermission,
	UserRoleCatalogItem,
	UsersListParams,
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

function toBooleanValue(value: unknown, fallback = false): boolean {
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

function toUserRole(value: unknown): ManagedUser['role'] {
	if (value === 'developer' || value === 'admin' || value === 'operator') {
		return value
	}

	return 'operator'
}

function splitFullName(
	fullName: string,
): { firstName: string; lastName: string } {
	const trimmed = fullName.trim()
	if (!trimmed) {
		return { firstName: '', lastName: '' }
	}

	const parts = trimmed.split(/\s+/)
	const firstName = parts[0] ?? ''
	const lastName = parts.slice(1).join(' ')
	return {
		firstName,
		lastName,
	}
}

function resolveFullName(payload: UnknownRecord): string {
	const explicit =
		toStringValue(payload.full_name) ||
		toStringValue(payload.fullName) ||
		toStringValue(payload.name)
	if (explicit) {
		return explicit
	}

	const firstName = toStringValue(payload.first_name)
	const lastName = toStringValue(payload.last_name)
	const combined = [firstName, lastName].filter(Boolean).join(' ').trim()
	if (combined) {
		return combined
	}

	return (
		toStringValue(payload.username) ||
		toStringValue(payload.email) ||
		'N/A'
	)
}

function normalizePermissionCodes(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return []
	}

	const unique = new Set<string>()

	value.forEach(permission => {
		if (typeof permission === 'string') {
			const code = permission.trim()
			if (code) {
				unique.add(code)
			}
			return
		}

		const record = toRecord(permission)
		if (!record) {
			return
		}

		const permissionCode =
			toStringValue(record.code) ||
			toStringValue(record.id) ||
			toStringValue(record.permission_code)

		if (permissionCode) {
			unique.add(permissionCode)
		}
	})

	return Array.from(unique)
}

function mapUserPayload(value: unknown): ManagedUser | null {
	const payload = toRecord(value)
	if (!payload) {
		return null
	}

	const id = toStringValue(payload.id)
	if (!id) {
		return null
	}

	const permissionCodes = normalizePermissionCodes(
		payload.custom_permissions ??
			payload.custom_permission_ids ??
			payload.permissions,
	)
	const fullName = resolveFullName(payload)

	return {
		id,
		email: toStringValue(payload.email),
		full_name: fullName,
		phone: toStringValue(payload.phone) || null,
		role: toUserRole(payload.role),
		is_active: toBooleanValue(payload.is_active, true),
		custom_permissions: permissionCodes,
		custom_permission_ids: permissionCodes,
		created_by: toStringValue(payload.created_by) || null,
		created_by_name: toStringValue(payload.created_by_name) || null,
		created_at: toStringValue(payload.created_at) || undefined,
		updated_at: toStringValue(payload.updated_at) || undefined,
	}
}

function parseListResponse(
	data: unknown,
	params?: UsersListParams,
): PaginatedResponse<ManagedUser> {
	const payload = toRecord(data) ?? {}
	const rawItems = Array.isArray(payload.results)
		? payload.results
		: Array.isArray(payload.items)
			? payload.items
			: []

	const items = rawItems
		.map(entry => mapUserPayload(entry))
		.filter((entry): entry is ManagedUser => entry !== null)
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

function parseSingleUserResponse(data: unknown): ManagedUser | null {
	const payload = toRecord(data)
	if (!payload) {
		return null
	}

	if (payload.data !== undefined) {
		return mapUserPayload(payload.data)
	}

	return mapUserPayload(payload)
}

function toMutationPayload(
	input: CreateUserInput | UpdateUserInput,
): Record<string, unknown> {
	const fullName = typeof input.full_name === 'string' ? input.full_name : ''
	const { firstName, lastName } = splitFullName(fullName)
	const permissions = Array.isArray(input.custom_permission_ids)
		? input.custom_permission_ids
		: []

	const payload: Record<string, unknown> = {
		email: input.email,
		role: input.role,
		is_active: input.is_active,
		is_staff: input.role === 'developer' || input.role === 'admin',
		permissions,
		first_name: firstName || null,
		last_name: lastName || null,
	}

	const usernameCandidate =
		toStringValue((input as Record<string, unknown>).username) ||
		toStringValue(input.email)
	if (usernameCandidate) {
		payload.username = usernameCandidate
	}

	if (typeof input.password === 'string' && input.password.trim().length > 0) {
		payload.password = input.password
	}

	return payload
}

function normalizePermissionResponse(data: unknown): UserPermission[] {
	if (Array.isArray(data)) {
		return data
			.filter((value): value is string => typeof value === 'string')
			.map(code => ({
				id: code,
				code,
				name: code,
			}))
	}

	const payload = toRecord(data)
	if (!payload) {
		return []
	}

	// Backends often wrap lists as `{ status, data: { count, results: [...] } }`.
	const nestedData = toRecord(payload.data)
	const listContainer = nestedData ?? payload

	const listSource = Array.isArray(listContainer.data)
		? listContainer.data
		: Array.isArray(listContainer.results)
			? listContainer.results
			: Array.isArray(listContainer.items)
				? listContainer.items
				: Array.isArray(listContainer.permissions)
					? listContainer.permissions
					: []

	return listSource
		.map(entry => {
			if (typeof entry === 'string') {
				return {
					id: entry,
					code: entry,
					name: entry,
				}
			}

			const record = toRecord(entry)
			if (!record) {
				return null
			}

			const id =
				toStringValue(record.id) ||
				toStringValue(record.code) ||
				toStringValue(record.permission_code)
			if (!id) {
				return null
			}

			const code =
				toStringValue(record.code) ||
				toStringValue(record.permission_code) ||
				id

			return {
				id,
				code,
				name: toStringValue(record.name) || code,
				description: toStringValue(record.description) || undefined,
			}
		})
		.filter((entry): entry is UserPermission => entry !== null)
}

function normalizeCatalogPermissionsResponse(data: unknown): UserPermission[] {
	if (Array.isArray(data)) {
		return data
			.map(entry => {
				const record = toRecord(entry)
				if (!record) {
					return null
				}

				const key = toStringValue(record.key)
				if (!key) {
					return null
				}

				const label = toStringValue(record.label) || key
				const description = toStringValue(record.description)
				const module = toStringValue(record.module)
				const normalizedDescription = description || module

				return normalizedDescription
					? {
						id: key,
						code: key,
						name: label,
						description: normalizedDescription,
					}
					: {
						id: key,
						code: key,
						name: label,
					}
			})
			.filter((entry): entry is UserPermission => entry !== null)
	}

	const payload = toRecord(data)
	if (!payload) {
		return []
	}

	const listSource = Array.isArray(payload.data) ? payload.data : []
	const mapped: Array<UserPermission | null> = listSource.map(entry => {
			const record = toRecord(entry)
			if (!record) {
				return null
			}

			const key = toStringValue(record.key)
			if (!key) {
				return null
			}

			const label = toStringValue(record.label) || key
			const description = toStringValue(record.description)
			const module = toStringValue(record.module)
			const normalizedDescription = description || module

			return normalizedDescription
				? {
					id: key,
					code: key,
					name: label,
					description: normalizedDescription,
				}
				: {
					id: key,
					code: key,
					name: label,
				}
		})

	return mapped.filter((entry): entry is UserPermission => entry !== null)
}

function normalizeRolesCatalogResponse(data: unknown): UserRoleCatalogItem[] {
	if (Array.isArray(data)) {
		return data
			.map(entry => {
				const record = toRecord(entry)
				if (!record) {
					return null
				}

				const role = toUserRole(record.key)
				const label = toStringValue(record.label) || role
				const defaultPermissions = normalizePermissionCodes(
					record.default_permissions,
				)

				return {
					key: role,
					label,
					default_permissions: defaultPermissions,
				}
			})
			.filter((entry): entry is UserRoleCatalogItem => entry !== null)
	}

	const payload = toRecord(data)
	if (!payload) {
		return []
	}

	const listSource = Array.isArray(payload.data) ? payload.data : []
	const mapped = listSource
		.map(entry => {
			const record = toRecord(entry)
			if (!record) {
				return null
			}

			const role = toUserRole(record.key)
			const label = toStringValue(record.label) || role
			const defaultPermissions = normalizePermissionCodes(
				record.default_permissions,
			)

			return {
				key: role,
				label,
				default_permissions: defaultPermissions,
			}
		})
		.filter((entry): entry is UserRoleCatalogItem => entry !== null)

	return mapped
}

export class UsersAdapter
	extends BaseCrudAdapter<
		ManagedUser,
		UsersListParams,
		CreateUserInput,
		UpdateUserInput
	>
	implements IUsersService
{
	private permissionRequestor: ApiRequestor

	constructor(baseUrl: string) {
		super({
			endpoint: '/api/users/',
			baseUrl,
		})
		this.permissionRequestor = new ApiRequestor(baseUrl)
	}

	// User operations
	async listUsers(
		params?: UsersListParams,
	): Promise<PaginatedResponse<ManagedUser>> {
		const data = await this.requestor.get<unknown>(
			this.endpoint,
			params as Record<string, unknown>,
		)
		return parseListResponse(data, params)
	}

	async getUserById(id: string): Promise<ManagedUser> {
		const data = await this.requestor.get<unknown>(`${this.endpoint}${id}/`)
		const mapped = parseSingleUserResponse(data)
		if (!mapped) {
			throw new Error('User not found')
		}
		return mapped
	}

	async createUser(input: CreateUserInput): Promise<ManagedUser> {
		const data = await this.requestor.post<unknown>(
			this.endpoint,
			toMutationPayload(input),
		)
		const mapped = parseSingleUserResponse(data)
		if (!mapped) {
			throw new Error('Failed to create user')
		}
		return mapped
	}

	async updateUser(id: string, input: UpdateUserInput): Promise<ManagedUser> {
		const data = await this.requestor.patch<unknown>(
			`${this.endpoint}${id}/`,
			toMutationPayload(input),
		)
		const mapped = parseSingleUserResponse(data)
		if (!mapped) {
			throw new Error('Failed to update user')
		}
		return mapped
	}

	async deleteUser(id: string): Promise<void> {
		return this.delete(id)
	}

	async toggleUserActive(id: string): Promise<ManagedUser> {
		return this.requestor.post<ManagedUser>(`${this.endpoint}${id}/toggle_active/`)
	}

	// Permission operations
	async listPermissions(): Promise<UserPermission[]> {
		const authCatalogEndpoints = [
			'/api/auth/all-permissions/',
			'/api/auth/permissions/catalog/',
			'/api/auth/permissions/',
		]

		for (const endpoint of authCatalogEndpoints) {
			try {
				const data = await this.permissionRequestor.get<unknown>(endpoint)
				const normalized = normalizeCatalogPermissionsResponse(data)
				if (normalized.length > 0) {
					return normalized
				}
			} catch {
				// Fallback to legacy endpoints.
			}
		}

		const legacyPermissions = await this.permissionRequestor.get<unknown>(
			'/api/users/permissions/',
		)
		return normalizePermissionResponse(legacyPermissions)
	}

	async listRolesCatalog(): Promise<UserRoleCatalogItem[]> {
		const endpoints = ['/api/auth/roles/catalog/', '/api/auth/roles/']

		for (const endpoint of endpoints) {
			try {
				const data = await this.permissionRequestor.get<unknown>(endpoint)
				const normalized = normalizeRolesCatalogResponse(data)
				if (normalized.length > 0) {
					return normalized
				}
			} catch {
				// Try next endpoint.
			}
		}

		return []
	}

	async listUserPermissions(userId: string): Promise<UserPermission[]> {
		const response = await this.permissionRequestor.get<unknown>(
			`/api/users/${userId}/permissions/`,
		)
		return normalizePermissionResponse(response)
	}

	async grantPermission(
		userId: string,
		permissionCode: PermissionCode,
	): Promise<void> {
		await this.permissionRequestor.post(`/api/users/${userId}/permissions/`, {
			permission_code: permissionCode,
		})
	}

	async revokePermission(
		userId: string,
		permissionCode: PermissionCode,
	): Promise<void> {
		await this.permissionRequestor.delete(
			`/api/users/${userId}/permissions/${permissionCode}/`,
		)
	}

	// Bulk operations
	async bulkUpdateUsers(
		ids: string[],
		input: UpdateUserInput,
	): Promise<ManagedUser[]> {
		return Promise.all(ids.map(id => this.updateUser(id, input)))
	}

	async bulkDeleteUsers(ids: string[]): Promise<void> {
		await Promise.all(ids.map(id => this.deleteUser(id)))
	}
}
