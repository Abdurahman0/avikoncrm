/**
 * Dashboard service adapter implementation
 */

import { ApiRequestor } from './api-requestor'
import type {
	DashboardData,
	DashboardParams,
	DashboardStats,
	IDashboardService,
} from '../../contracts'

export class DashboardAdapter implements IDashboardService {
	private requestor: ApiRequestor

	constructor(baseUrl: string) {
		this.requestor = new ApiRequestor(baseUrl)
	}

	async getDashboard(params?: DashboardParams): Promise<DashboardData> {
		const response = await this.requestor.get<{
			stats?: DashboardStats[]
			summary?: Record<string, unknown>
			period?: {
				from: string
				to: string
			}
		}>('/api/common/dashboard/', {
			date_from: params?.date_from,
			date_to: params?.date_to,
			page: params?.page,
			page_size: params?.page_size,
		})

		return {
			stats: response.stats || [],
			summary: response.summary,
			period: response.period,
		}
	}

	async getStats(params?: DashboardParams): Promise<DashboardStats[]> {
		const data = await this.getDashboard(params)
		return data.stats
	}
}
