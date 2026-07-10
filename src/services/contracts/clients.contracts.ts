/**
 * Clients service contract
 */

import type {
	BaseEntity,
	CreateInput,
	ListParams,
	PaginatedResponse,
	UpdateInput,
} from './common.contracts'

export interface ClientSelectedProduct {
	contract_id?: string
	contract_title?: string
	contract_status?: string
	product_id?: string
	product_name?: string
	quantity?: number
	unit_price?: string | number
	created_at?: string
}

export interface ClientRecentContract {
	id: string
	title?: string
	status?: string
	total_amount?: string | number
	created_at?: string
	items?: ClientSelectedProduct[]
}

export interface ClientReviewDetail extends Client {
	company?: {
		legal_name?: string
		inn?: string
		bank?: string
		mfo?: string
		director?: string
		documents?: Array<{ id?: string; type?: string; file?: string }>
		addresses?: Array<Record<string, unknown>>
		branches_count?: number
	} | null
}

export interface Client extends BaseEntity {
	client_type?: 'individual' | 'company' | 'jismoniy' | 'yuridik' | 'budjet'
	client_type_display?: string
	lead?: string | null
	lead_id?: string | null
	chat_session_id?: string | null
	full_name: string
	phone?: string
	email?: string
	preferred_contact_time?: string
	region?: string
	company_name?: string
	inn?: string
	interested_product?: string
	address?: string
	object_type?: string
	customer_segment?: string
	electricity_consumption?: string
	desired_power_kw?: number | null
	audit_conclusion_kw?: number | null
	eligible_subsidy_kw?: number | null
	estimated_subsidy_amount?: string | number
	monthly_bill?: string | number
	solution_type?: string
	budget_range?: string
	source_platform?: 'instagram' | 'manual' | 'telegram'
	source_platform_label?: string
	source?: string
	source_display?: string
	status?:
		| 'new'
		| 'contacted'
		| 'qualified'
		| 'need_follow_up'
		| 'proposal_preparing'
		| 'proposal_sent'
		| 'negotiation'
		| 'waiting_for_decision'
		| 'won'
		| 'lost'
		| 'postponed'
	status_label?: string
	verification_status?: 'pending' | 'verified' | 'rejected'
	verification_status_display?: string
	verified_at?: string | null
	rejection_reason?: string
	can_order?: boolean
	manager?: string | null
	manager_username?: string
	notes?: string
	ai_summary?: string
	recall_at?: string | null
	metadata?: Record<string, unknown>
	selected_products?: ClientSelectedProduct[]
	recent_contracts?: ClientRecentContract[]
}

export interface ClientStatusRecord extends BaseEntity {
	name: string
	slug: string
	color?: string
	is_default?: boolean
	sort_order?: number
}

export interface CreateClientInput extends CreateInput<Client> {
	full_name: string
}

export interface UpdateClientInput extends UpdateInput<Client> {}

export interface ClientsListParams extends ListParams {
	client_type?: Client['client_type']
	status?: Client['status']
	source_platform?: Client['source_platform']
	source?: string
	verification_status?: Client['verification_status']
	customer_segment?: string
	manager?: string
	region?: string
	search?: string
}

export interface IClientsService {
	// Read operations
	listClients(params?: ClientsListParams): Promise<PaginatedResponse<Client>>
	getClient(id: string): Promise<Client>
	listClientStatuses(): Promise<ClientStatusRecord[]>
	listClientReviews?(params?: { verification_status?: Client['verification_status']; search?: string }): Promise<Client[]>
	getClientReview?(id: string): Promise<ClientReviewDetail>
	updateClientReview?(id: string, input: Partial<Pick<Client, 'full_name' | 'phone' | 'email' | 'region' | 'company_name' | 'inn' | 'notes'>>): Promise<ClientReviewDetail>
	verifyClient?(id: string): Promise<ClientReviewDetail>
	rejectClient?(id: string, reason: string): Promise<ClientReviewDetail>

	// Write operations
	createClient(input: CreateClientInput): Promise<Client>
	bulkImportClient(input: CreateClientInput): Promise<Client>
	updateClient(id: string, input: UpdateClientInput): Promise<Client>
	patchClient?(id: string, input: UpdateClientInput): Promise<Client>
	deleteClient(id: string): Promise<void>
	exportClients(): Promise<Blob>

	// Bulk operations
	bulkUpdateClients(ids: string[], input: UpdateClientInput): Promise<Client[]>
	bulkDeleteClients(ids: string[]): Promise<void>
}
