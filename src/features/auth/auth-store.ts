import { mockAuthService, MOCK_AUTH_USER_STORAGE_KEY } from '../../services/mock/mock-auth.service'
import {
	clearTokens,
	getAccessToken,
	getRefreshToken,
	setTokens,
} from '../../lib/auth-storage'
import type { AuthenticatedUser } from '../../auth/types'
import { routePaths } from '../../config/routes'

interface AuthState {
	user: AuthenticatedUser | null
	isAuthenticated: boolean
	loading: boolean
}

interface LogoutOptions {
	redirectToLogin?: boolean
}

type AuthStateListener = (state: AuthState) => void

const authState: AuthState = {
	user: null,
	isAuthenticated: false,
	loading: true,
}

const listeners = new Set<AuthStateListener>()
let restoreSessionPromise: Promise<void> | null = null
let hasAttemptedInitialRestore = false

function emitChange() {
	const snapshot = { ...authState }
	for (const listener of listeners) {
		listener(snapshot)
	}
}

function persistUser(user: AuthenticatedUser | null): void {
	if (typeof window === 'undefined') {
		return
	}

	try {
		if (user) {
			window.localStorage.setItem(MOCK_AUTH_USER_STORAGE_KEY, JSON.stringify(user))
			return
		}

		window.localStorage.removeItem(MOCK_AUTH_USER_STORAGE_KEY)
	} catch {
		// Ignore storage failures and keep in-memory state as source of truth.
	}
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

		const parsed = JSON.parse(raw) as unknown
		if (!parsed || typeof parsed !== 'object') {
			return null
		}

		const user = parsed as Partial<AuthenticatedUser>
		if (
			typeof user.id !== 'string' ||
			typeof user.email !== 'string' ||
			typeof user.fullName !== 'string' ||
			typeof user.role !== 'string' ||
			!Array.isArray(user.permissionKeys)
		) {
			return null
		}

		return user as AuthenticatedUser
	} catch {
		return null
	}
}

function setState(nextState: Partial<AuthState>) {
	if (typeof nextState.user !== 'undefined') {
		authState.user = nextState.user
		authState.isAuthenticated = Boolean(nextState.user)
		persistUser(nextState.user)
	}

	if (typeof nextState.isAuthenticated === 'boolean') {
		authState.isAuthenticated = nextState.isAuthenticated
	}

	if (typeof nextState.loading === 'boolean') {
		authState.loading = nextState.loading
	}

	emitChange()
}

function redirectToLoginIfNeeded(): void {
	if (typeof window === 'undefined') {
		return
	}

	if (window.location.pathname === routePaths.login) {
		return
	}

	window.location.replace(routePaths.login)
}

export function getAuthState(): AuthState {
	return { ...authState }
}

export function subscribeAuthState(listener: AuthStateListener): () => void {
	listeners.add(listener)

	return () => {
		listeners.delete(listener)
	}
}

export function getStoredAuthUser(): AuthenticatedUser | null {
	return authState.user ?? readPersistedUser()
}

export function clearStoredAuthUser(): void {
	persistUser(null)
}

export async function login(username: string, password: string): Promise<AuthenticatedUser> {
	setState({ loading: true })

	try {
		const result = await mockAuthService.login(username, password)
		setTokens({ access: result.access, refresh: result.refresh })

		const effectiveUser = await mockAuthService.getMe()
		setState({
			user: effectiveUser,
			isAuthenticated: true,
			loading: false,
		})

		return effectiveUser
	} catch (error) {
		clearTokens()
		setState({
			user: null,
			isAuthenticated: false,
			loading: false,
		})
		throw error
	}
}

export function logout(options?: LogoutOptions): void {
	clearTokens()
	setState({
		user: null,
		isAuthenticated: false,
		loading: false,
	})

	if (options?.redirectToLogin) {
		redirectToLoginIfNeeded()
	}
}

export async function fetchMe(): Promise<AuthenticatedUser> {
	const user = await mockAuthService.getMe()

	setState({
		user,
		isAuthenticated: true,
	})
	return user
}

export async function restoreSession(): Promise<void> {
	if (hasAttemptedInitialRestore) {
		return
	}

	if (restoreSessionPromise) {
		return restoreSessionPromise
	}

	restoreSessionPromise = (async () => {
		const accessToken = getAccessToken()
		const refreshToken = getRefreshToken()
		const fallbackUser = readPersistedUser()

		if (fallbackUser) {
			setState({
				user: fallbackUser,
				isAuthenticated: true,
				loading: false,
			})
			return
		}

		if (!accessToken && !refreshToken) {
			logout()
			return
		}

		if (!accessToken && refreshToken) {
			// In mock mode we issue a deterministic replacement access token.
			setTokens({
				access: `mock-restored-access-${Date.now()}`,
				refresh: refreshToken,
			})
		}

		try {
			await fetchMe()
		} catch {
			logout({ redirectToLogin: true })
		} finally {
			setState({ loading: false })
		}
	})().finally(() => {
		hasAttemptedInitialRestore = true
		restoreSessionPromise = null
	})

	return restoreSessionPromise
}

