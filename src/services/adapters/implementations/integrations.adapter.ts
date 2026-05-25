/**
 * Integrations service adapter implementation
 */

import { ApiRequestor } from './api-requestor'
import type {
	EventsListParams,
	IIntegrationsService,
	IntegrationConfig,
	IntegrationEvent,
	IntegrationPlatform,
	IntegrationsListParams,
	PaginatedResponse,
	UpdateIntegrationConfigInput,
} from '../../contracts'

export class IntegrationsAdapter implements IIntegrationsService {
	private requestor: ApiRequestor

	constructor(baseUrl: string) {
		this.requestor = new ApiRequestor(baseUrl)
	}

	// Configs
	async listConfigs(
		params?: IntegrationsListParams,
	): Promise<PaginatedResponse<IntegrationConfig>> {
		return this.requestor.get<PaginatedResponse<IntegrationConfig>>(
			'/api/integrations/configs/',
			params as Record<string, unknown>,
		)
	}

	async getConfig(platform: IntegrationPlatform): Promise<IntegrationConfig> {
		return this.requestor.get<IntegrationConfig>(
			`/api/integrations/configs/${platform}/`,
		)
	}

	async updateConfig(
		platform: IntegrationPlatform,
		input: UpdateIntegrationConfigInput,
	): Promise<IntegrationConfig> {
		return this.requestor.patch<IntegrationConfig>(
			`/api/integrations/configs/${platform}/`,
			input,
		)
	}

	// Events
	async listEvents(
		params?: EventsListParams,
	): Promise<PaginatedResponse<IntegrationEvent>> {
		return this.requestor.get<PaginatedResponse<IntegrationEvent>>(
			'/api/integrations/events/',
			params as Record<string, unknown>,
		)
	}

	async getEvent(id: string): Promise<IntegrationEvent> {
		return this.requestor.get<IntegrationEvent>(
			`/api/integrations/events/${id}/`,
		)
	}
}
