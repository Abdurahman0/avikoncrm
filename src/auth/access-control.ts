import { routePaths } from '../config/routes'
import type { AppRouteId } from '../config/routes'
import type { AppRole } from '../types/architecture'
import type { AuthenticatedUser, PermissionCode } from './types'
import { isBackendModuleAvailable } from '../config/backend-capabilities'

// Avikontex CRM - Route to Permission Mapping
const ROUTE_REQUIRED_PERMISSIONS: Partial<Record<AppRouteId, PermissionCode>> =
	{
		dashboard: 'can_view_dashboard',
		leads: 'can_view_leads',
	clients: 'can_view_clients',
		products: 'can_view_products',
		contracts: 'can_view_contracts',
		chats: 'can_access_chats',
		notifications: 'can_view_notifications',
		users: 'can_manage_users',
		'operator-kpi': 'can_view_dashboard',
		integrations: 'can_view_integrations',
		'ai-settings': 'can_view_ai_settings',
		logs: 'can_view_logs',
	}

const IMPLIED_PERMISSIONS: Partial<Record<PermissionCode, PermissionCode[]>> = {
	can_view_clients: ['can_manage_clients'],
	can_view_products: ['can_manage_products'],
	can_view_contracts: ['can_manage_contracts'],
	can_view_integrations: ['can_manage_integrations'],
	can_view_ai_settings: ['can_manage_ai_settings'],
}

const STAFF_CATALOG_PERMISSIONS = new Set<PermissionCode>(['can_view_products'])

const PUBLIC_ROUTE_IDS = new Set<AppRouteId>([
	'home',
	'login',
	'access-denied',
	'not-found',
])

const MODULE_PATH_BY_ROUTE_ID: Record<string, string> = {
	dashboard: routePaths.dashboard,
	leads: routePaths.leads,
	clients: routePaths.clients,
	products: routePaths.products,
	contracts: routePaths.contracts,
	chats: routePaths.chats,
	notifications: routePaths.notifications,
	users: routePaths.users,
	'operator-kpi': routePaths['operator-kpi'],
	integrations: routePaths.integrations,
	'ai-settings': routePaths['ai-settings'],
	logs: routePaths.logs,
}

// Role hierarchy: only a strictly higher role can manage a user's account
// and permissions. Users can never manage themselves.
const ROLE_RANK: Record<string, number> = {
	developer: 3,
	admin: 2,
	operator: 1,
}

export function isSameManagedUser(
	currentUserId: string | null | undefined,
	targetUserId: string,
): boolean {
	if (!currentUserId) {
		return false
	}

	return (
		targetUserId === currentUserId ||
		targetUserId === `managed-${currentUserId}`
	)
}

export function canManageTargetUser(
	user: AuthenticatedUser | null,
	target: { id: string; role: string },
): boolean {
	if (!user) {
		return false
	}

	// A user can never edit their own account or grant themselves permissions.
	if (isSameManagedUser(user.id, target.id)) {
		return false
	}

	// Developers manage everyone below them (and other developers, except self).
	if (user.role === 'developer') {
		return true
	}

	// Everyone else can only manage users strictly below their own role.
	return (ROLE_RANK[user.role] ?? 0) > (ROLE_RANK[target.role] ?? 0)
}

export function hasRole(
	user: AuthenticatedUser | null,
	role: AppRole | readonly AppRole[],
): boolean {
	if (!user) {
		return false
	}

	if (Array.isArray(role)) {
		return role.includes(user.role)
	}

	return user.role === role
}

export function hasPermission(
	user: AuthenticatedUser | null,
	permission: PermissionCode,
): boolean {
	if (!user) {
		return false
	}

	if (user.role === 'developer') {
		return true
	}

	if (
		(user.role === 'admin' || user.role === 'operator') &&
		STAFF_CATALOG_PERMISSIONS.has(permission)
	) {
		return true
	}

	const hasDirectPermission = user.permissionKeys.includes(permission)
	if (hasDirectPermission) {
		return true
	}

	const impliedBy = IMPLIED_PERMISSIONS[permission] ?? []
	return impliedBy.some(candidate => user.permissionKeys.includes(candidate))
}

export function canAccessRouteForUser(
	user: AuthenticatedUser | null,
	routeId: AppRouteId,
): boolean {
	if (PUBLIC_ROUTE_IDS.has(routeId)) {
		return true
	}

	if (!user) {
		return false
	}

	if (!isBackendModuleAvailable(routeId)) {
		return false
	}

	if (user.role === 'developer') {
		return true
	}

	if (routeId === 'profile') {
		return true
	}

	const requiredPermission = ROUTE_REQUIRED_PERMISSIONS[routeId]
	if (!requiredPermission) {
		return false
	}

	return hasPermission(user, requiredPermission)
}

export function resolveDefaultLandingPathForUser(
	user: AuthenticatedUser | null,
): string {
	if (!user) {
		return routePaths.login
	}

	// All roles start at dashboard
	if (hasPermission(user, 'can_view_dashboard')) {
		return routePaths.dashboard
	}

	if (hasPermission(user, 'can_view_clients')) {
		return routePaths.clients
	}

	const fallbackRouteOrder: AppRouteId[] = [
		'clients',
		'chats',
	]

	const firstAllowed = fallbackRouteOrder.find(routeId =>
		canAccessRouteForUser(user, routeId),
	)

	if (!firstAllowed) {
		return routePaths.accessDenied
	}

	return MODULE_PATH_BY_ROUTE_ID[firstAllowed] ?? routePaths.accessDenied
}

