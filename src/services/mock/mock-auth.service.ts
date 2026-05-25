import type { AuthTokens } from '../../lib/auth-storage'
import type { AuthenticatedUser } from '../../auth/types'
import { mockUsersForAuth } from './mock-services'

const MOCK_AUTH_USER_STORAGE_KEY = 'avikontex-auth-user-v1'

export interface AuthLoginResult extends AuthTokens {
	user: AuthenticatedUser
}

function readPersistedUser(): AuthenticatedUser | null {
	if (typeof window === 'undefined') {
		return null
	}

	try {
		const raw = window.localStorage.getItem(MOCK_AUTH_USER_STORAGE_KEY)
		if (!raw) {
			return null
		}
		const parsed = JSON.parse(raw) as AuthenticatedUser
		if (!parsed || typeof parsed !== 'object' || typeof parsed.id !== 'string') {
			return null
		}
		return parsed
	} catch {
		return null
	}
}

function resolveUserByLogin(username: string): AuthenticatedUser | null {
	const normalized = username.trim().toLowerCase()
	const users = mockUsersForAuth()

	if (normalized === 'developer' || normalized === 'developer@avikontex.uz') {
		return users.find(user => user.role === 'developer') ?? null
	}

	if (normalized === 'admin' || normalized === 'admin@avikontex.uz') {
		return users.find(user => user.role === 'admin') ?? null
	}

	if (normalized === 'operator' || normalized === 'operator@avikontex.uz') {
		return users.find(user => user.role === 'operator') ?? null
	}

	return users.find(user => user.email.toLowerCase() === normalized) ?? null
}

function persistUser(user: AuthenticatedUser): void {
	if (typeof window === 'undefined') {
		return
	}
	try {
		window.localStorage.setItem(MOCK_AUTH_USER_STORAGE_KEY, JSON.stringify(user))
	} catch {
		// Ignore storage failures in mock mode.
	}
}

export const mockAuthService = {
	async login(username: string, password: string): Promise<AuthLoginResult> {
		if (password.trim().length < 8) {
			throw new Error('Password must be at least 8 characters.')
		}

		const user = resolveUserByLogin(username)
		if (!user) {
			throw new Error('Invalid username or password.')
		}

		const access = `mock-access-${user.id}-${Date.now()}`
		const refresh = `mock-refresh-${user.id}-${Date.now()}`
		persistUser(user)

		return { access, refresh, user }
	},

	async getMe(): Promise<AuthenticatedUser> {
		const persisted = readPersistedUser()
		if (persisted) {
			return persisted
		}

		const users = mockUsersForAuth()
		const fallback = users.find(user => user.role === 'developer')
		if (!fallback) {
			throw new Error('No mock users available.')
		}
		return fallback
	},

	async refreshToken(refresh: string): Promise<AuthTokens> {
		return {
			access: `mock-access-refreshed-${Date.now()}`,
			refresh,
		}
	},
}

export { MOCK_AUTH_USER_STORAGE_KEY }

