/**
 * AI Settings service adapter implementation
 */

import { BaseCrudAdapter } from './base-crud.adapter'
import { ApiRequestor } from './api-requestor'
import type {
	AISettings,
	AISettingsListParams,
	CreateAISettingsInput,
	IAISettingsService,
	PaginatedResponse,
	UpdateAISettingsInput,
} from '../../contracts'

export class AISettingsAdapter
	extends BaseCrudAdapter<
		AISettings,
		AISettingsListParams,
		CreateAISettingsInput,
		UpdateAISettingsInput
	>
	implements IAISettingsService
{
	private settingsRequestor: ApiRequestor

	constructor(baseUrl: string) {
		super({
			endpoint: '/api/ai/settings/',
			baseUrl,
		})
		this.settingsRequestor = new ApiRequestor(baseUrl)
	}

	async listSettings(
		params?: AISettingsListParams,
	): Promise<PaginatedResponse<AISettings>> {
		return this.list(params)
	}

	async getSetting(id: string): Promise<AISettings> {
		return this.get(id)
	}

	async getCurrentSettings(): Promise<AISettings> {
		return this.settingsRequestor.get<AISettings>('/api/ai/settings/current/')
	}

	async createSetting(input: CreateAISettingsInput): Promise<AISettings> {
		return this.create(input)
	}

	async updateSetting(
		id: string,
		input: UpdateAISettingsInput,
	): Promise<AISettings> {
		return this.update(id, input)
	}

	async deleteSetting(id: string): Promise<void> {
		return this.delete(id)
	}
}
