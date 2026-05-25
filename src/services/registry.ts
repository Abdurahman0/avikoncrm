/**
 * Service Registry - Centralized service instantiation and management
 */

import { DashboardAdapter } from './adapters/implementations/dashboard.adapter'
import { LeadsAdapter } from './adapters/implementations/leads.adapter'
import { ClientsAdapter } from './adapters/implementations/clients.adapter'
import { ProductsAdapter } from './adapters/implementations/products.adapter'
import { ChatAdapter } from './adapters/implementations/chat.adapter'
import { ContractsAdapter } from './adapters/implementations/contracts.adapter'
import { NotificationsAdapter } from './adapters/implementations/notifications.adapter'
import { IntegrationsAdapter } from './adapters/implementations/integrations.adapter'
import { AISettingsAdapter } from './adapters/implementations/ai-settings.adapter'
import { LogsAdapter } from './adapters/implementations/logs.adapter'
import { UsersAdapter } from './adapters/implementations/users.adapter'

import type {
	IDashboardService,
	ILeadsService,
	IClientsService,
	IProductsService,
	IChatService,
	IContractsService,
	INotificationsService,
	IIntegrationsService,
	IAISettingsService,
	ILogsService,
	IUsersService,
} from './contracts'

export interface ServiceRegistry {
	dashboard: IDashboardService
	leads: ILeadsService
	clients: IClientsService
	products: IProductsService
	chat: IChatService
	contracts: IContractsService
	notifications: INotificationsService
	integrations: IIntegrationsService
	aiSettings: IAISettingsService
	logs: ILogsService
	users: IUsersService
}

/**
 * Create a service registry with all services initialized
 * @param baseUrl - Base URL for API calls (e.g., 'http://localhost:8000')
 */
export function createServiceRegistry(baseUrl: string): ServiceRegistry {
	// Ensure baseUrl doesn't have trailing slash
	const cleanBaseUrl = baseUrl.replace(/\/$/, '')

	return {
		dashboard: new DashboardAdapter(cleanBaseUrl),
		leads: new LeadsAdapter(cleanBaseUrl),
		clients: new ClientsAdapter(cleanBaseUrl),
		products: new ProductsAdapter(cleanBaseUrl),
		chat: new ChatAdapter(cleanBaseUrl),
		contracts: new ContractsAdapter(cleanBaseUrl),
		notifications: new NotificationsAdapter(cleanBaseUrl),
		integrations: new IntegrationsAdapter(cleanBaseUrl),
		aiSettings: new AISettingsAdapter(cleanBaseUrl),
		logs: new LogsAdapter(cleanBaseUrl),
		users: new UsersAdapter(cleanBaseUrl),
	}
}

// Singleton instance
let serviceRegistry: ServiceRegistry | null = null

/**
 * Initialize the global service registry
 * Call this once at application startup
 */
export function initializeServices(baseUrl: string): ServiceRegistry {
	serviceRegistry = createServiceRegistry(baseUrl)
	return serviceRegistry
}

/**
 * Get the global service registry
 * Make sure initializeServices() has been called first
 */
export function getServices(): ServiceRegistry {
	if (!serviceRegistry) {
		// Default to current origin if not initialized
		const baseUrl = window.location.origin
		return createServiceRegistry(baseUrl)
	}
	return serviceRegistry
}
