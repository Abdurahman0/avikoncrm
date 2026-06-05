// @ts-nocheck

import type { AuthenticatedUser, PermissionCode } from '../../auth/types'
import { PERMISSION_CODES } from '../../auth/types'

const nowIso = () => new Date().toISOString()
const clone = <T>(value: T): T =>
	typeof structuredClone === 'function'
		? structuredClone(value)
		: JSON.parse(JSON.stringify(value))

let idCounter = 1000
const nextId = (prefix: string) => `${prefix}-${idCounter++}`

function parseNumber(value: unknown): number | undefined {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value
	}
	if (typeof value === 'string' && value.trim().length > 0) {
		const parsed = Number(value.trim())
		if (Number.isFinite(parsed)) {
			return parsed
		}
	}
	return undefined
}

function resolvePageParams(params?: Record<string, unknown>, fallbackPageSize = 20) {
	const page = Math.max(1, parseNumber(params?.page) ?? 1)
	const pageSize = Math.max(
		1,
		parseNumber(params?.page_size) ??
			parseNumber(params?.pageSize) ??
			fallbackPageSize,
	)
	return { page, pageSize }
}

function getComparableValue(item: Record<string, unknown>, key: string): string | number {
	const value = item[key]
	if (typeof value === 'number') {
		return value
	}
	if (typeof value === 'boolean') {
		return value ? 1 : 0
	}
	if (value instanceof Date) {
		return value.getTime()
	}
	if (typeof value === 'string') {
		return value.toLowerCase()
	}
	return ''
}

function applyOrdering<T extends Record<string, unknown>>(items: T[], ordering?: unknown): T[] {
	if (typeof ordering !== 'string' || ordering.trim().length === 0) {
		return items
	}
	const raw = ordering.trim()
	const desc = raw.startsWith('-')
	const key = desc ? raw.slice(1) : raw
	if (!key) {
		return items
	}
	return [...items].sort((left, right) => {
		const a = getComparableValue(left, key)
		const b = getComparableValue(right, key)
		if (a < b) {
			return desc ? 1 : -1
		}
		if (a > b) {
			return desc ? -1 : 1
		}
		return 0
	})
}

function applySearch<T extends Record<string, unknown>>(items: T[], search?: unknown): T[] {
	if (typeof search !== 'string' || search.trim().length === 0) {
		return items
	}
	const query = search.trim().toLowerCase()
	return items.filter(item => JSON.stringify(item).toLowerCase().includes(query))
}

function paginate<T>(items: T[], params?: Record<string, unknown>, fallbackPageSize = 20) {
	const { page, pageSize } = resolvePageParams(params, fallbackPageSize)
	const total = items.length
	const totalPages = Math.max(1, Math.ceil(total / pageSize))
	const safePage = Math.min(page, totalPages)
	const start = (safePage - 1) * pageSize
	const resultItems = items.slice(start, start + pageSize)

	return {
		items: resultItems,
		results: resultItems,
		meta: {
			page: safePage,
			pageSize,
			totalItems: total,
			totalPages,
		},
		page: safePage,
		page_size: pageSize,
		total,
		count: total,
		next: safePage < totalPages ? String(safePage + 1) : null,
		previous: safePage > 1 ? String(safePage - 1) : null,
	}
}

const rolePermissions: Record<string, PermissionCode[]> = {
	developer: [...PERMISSION_CODES],
	admin: [
		'can_access_chats',
		'can_manage_clients',
		'can_manage_contracts',
		'can_manage_leads',
		'can_manage_products',
		'can_manage_users',
		'can_view_clients',
		'can_view_contracts',
		'can_view_dashboard',
		'can_view_leads',
		'can_view_notifications',
		'can_view_products',
	],
	operator: [
		'can_access_chats',
		'can_manage_clients',
		'can_manage_contracts',
		'can_manage_leads',
		'can_manage_products',
		'can_view_clients',
		'can_view_contracts',
		'can_view_dashboard',
		'can_view_leads',
		'can_view_notifications',
		'can_view_products',
	],
}

const MOCK_USERS = [
	{
		id: 'user-dev-1',
		email: 'developer@avikontex.uz',
		full_name: 'Developer Avikontex',
		phone: '+998900000001',
		role: 'developer',
		is_active: true,
		custom_permissions: [],
		custom_permission_ids: [],
		created_by: null,
		created_by_name: null,
		created_at: '2026-01-10T09:00:00.000Z',
		updated_at: '2026-05-20T11:30:00.000Z',
	},
	{
		id: 'user-admin-1',
		email: 'admin@avikontex.uz',
		full_name: 'Admin Avikontex',
		phone: '+998900000002',
		role: 'admin',
		is_active: true,
		custom_permissions: [],
		custom_permission_ids: [],
		created_by: 'user-dev-1',
		created_by_name: 'Developer Avikontex',
		created_at: '2026-01-12T09:00:00.000Z',
		updated_at: '2026-05-18T10:00:00.000Z',
	},
	{
		id: 'user-op-1',
		email: 'operator@avikontex.uz',
		full_name: 'Operator Avikontex',
		phone: '+998900000003',
		role: 'operator',
		is_active: true,
		custom_permissions: [],
		custom_permission_ids: [],
		created_by: 'user-admin-1',
		created_by_name: 'Admin Avikontex',
		created_at: '2026-01-13T09:00:00.000Z',
		updated_at: '2026-05-17T08:45:00.000Z',
	},
]

let users = clone(MOCK_USERS)

let leads = [
	{
		id: 'lead-1',
		full_name: 'Aziz Karimov',
		phone: '+998901112233',
		source: 'telegram',
		status: 'new',
		manager: 'user-op-1',
		manager_username: 'Operator Avikontex',
		ai_summary: "Savol: ultratovush apparati narxi va yetkazib berish muddati.",
		metadata: {
			region: 'Toshkent',
			last_inbound_at: '2026-05-22T11:42:00.000Z',
			expected_response_at: '2026-05-22T12:15:00.000Z',
			topic: "Ultratovush apparati bo'yicha narx so'rovi",
		},
		created_at: '2026-05-19T08:00:00.000Z',
		updated_at: '2026-05-20T08:00:00.000Z',
	},
	{
		id: 'lead-2',
		full_name: 'Olga Ivanova',
		phone: '+998935556677',
		source: 'instagram',
		status: 'in_progress',
		manager: 'user-op-1',
		manager_username: 'Operator Avikontex',
		ai_summary: "Monitoring uskunalari uchun tijorat taklifi va to'lov shartlari muhokama qilinmoqda.",
		metadata: {
			region: 'Samarqand',
			last_inbound_at: '2026-05-22T09:05:00.000Z',
			expected_response_at: '2026-05-23T10:00:00.000Z',
			topic: "Monitoring uskunalari uchun to'lov shartlari",
		},
		created_at: '2026-05-18T09:20:00.000Z',
		updated_at: '2026-05-21T10:10:00.000Z',
	},
	{
		id: 'lead-3',
		full_name: 'Jasur Mamatov',
		phone: '+998998887766',
		source: 'web',
		status: 'closed',
		manager: 'user-admin-1',
		manager_username: 'Admin Avikontex',
		ai_summary: "So'rov tayyorlangan buyurtmaga aylantirildi.",
		metadata: {
			region: 'Fargona',
			last_inbound_at: '2026-05-20T10:30:00.000Z',
			expected_response_at: '2026-05-20T11:00:00.000Z',
			topic: "Klinika jihozlari bo'yicha umumiy so'rov",
		},
		created_at: '2026-05-16T12:10:00.000Z',
		updated_at: '2026-05-22T12:10:00.000Z',
	},
]
let clients = [
	{
		id: 'client-1',
		lead: 'lead-2',
		lead_id: 'lead-2',
		full_name: 'Olga Ivanova',
		phone: '+998935556677',
		region: 'Samarqand',
		address: 'Registon kochasi 12',
		object_type: 'clinic',
		customer_segment: 'b2b',
		electricity_consumption: '6 dona / oy',
		desired_power_kw: 6,
		audit_conclusion_kw: 4,
		eligible_subsidy_kw: 2,
		estimated_subsidy_amount: '12000000',
		monthly_bill: '42000000',
		solution_type: 'diagnostics',
		budget_range: '80-120 mln',
		source_platform: 'instagram',
		status: 'proposal_sent',
		manager: 'user-op-1',
		manager_username: 'Operator Avikontex',
		notes: "Monitoring palatasi uchun taklif yuborilgan, moliya bo'limi javobi kutilmoqda.",
		ai_summary: "Xususiy klinika monitoring to'plami bo'yicha qaror bosqichida.",
		recall_at: null,
		metadata: { preferred_contact: 'telegram', facility_type: 'private_clinic' },
		created_at: '2026-05-10T10:00:00.000Z',
		updated_at: '2026-05-21T09:30:00.000Z',
	},
	{
		id: 'client-2',
		lead: 'lead-3',
		lead_id: 'lead-3',
		full_name: 'Jasur Mamatov',
		phone: '+998998887766',
		region: 'Fargona',
		address: 'Alisher Navoiy kochasi 8',
		object_type: 'hospital',
		customer_segment: 'b2c',
		electricity_consumption: '3 dona / oy',
		desired_power_kw: 3,
		audit_conclusion_kw: 3,
		eligible_subsidy_kw: 1,
		estimated_subsidy_amount: '4500000',
		monthly_bill: '18500000',
		solution_type: 'monitoring',
		budget_range: '35-60 mln',
		source_platform: 'manual',
		status: 'won',
		manager: 'user-admin-1',
		manager_username: 'Admin Avikontex',
		notes: "Yetkazib berish sanasi tasdiqlangan, buyurtma yopilgan.",
		ai_summary: "Muvaffaqiyatli yakunlangan monitoring uskunalari buyurtmasi.",
		recall_at: null,
		metadata: { vip: true, facility_type: 'district_hospital' },
		created_at: '2026-05-03T08:15:00.000Z',
		updated_at: '2026-05-20T14:20:00.000Z',
	},
]

let categories = [
	{
		id: 'cat-1',
		name: 'Diagnostic Equipment',
		code: 'DIAGNOSTIC',
		sortOrder: 0,
		description: 'Ultratovush va korik uskunalari',
		isActive: true,
		createdAt: '2026-02-01T08:00:00.000Z',
		updatedAt: '2026-05-18T08:00:00.000Z',
		created_at: '2026-02-01T08:00:00.000Z',
		updated_at: '2026-05-18T08:00:00.000Z',
	},
	{
		id: 'cat-2',
		name: 'Patient Monitoring',
		code: 'MONITORING',
		sortOrder: 1,
		description: 'Bemor monitoringi va kuzatuv qurilmalari',
		isActive: true,
		createdAt: '2026-02-01T08:00:00.000Z',
		updatedAt: '2026-05-18T08:00:00.000Z',
		created_at: '2026-02-01T08:00:00.000Z',
		updated_at: '2026-05-18T08:00:00.000Z',
	},
]

let products = [
	{
		id: 'product-1',
		name: 'Mindray DP-50',
		sku: 'MINDRAY-DP50',
		description: 'Portativ ultratovush tizimi',
		categoryId: 'cat-1',
		category_id: 'cat-1',
		categoryName: 'Diagnostic Equipment',
		price: 48000000,
		currency: 'UZS',
		isRecommended: true,
		subsidyEnabled: true,
		subsidyAmount: 4500000,
		priceAfterSubsidy: 43500000,
		stockQuantity: 14,
		minimalStock: 4,
		isLowStock: false,
		stockStatus: 'in_stock',
		reviewsEnabled: true,
		isActive: true,
		status: 'active',
		images: [],
		createdAt: '2026-04-10T08:00:00.000Z',
		updatedAt: '2026-05-22T11:00:00.000Z',
		created_at: '2026-04-10T08:00:00.000Z',
		updated_at: '2026-05-22T11:00:00.000Z',
	},
	{
		id: 'product-2',
		name: 'Comen C80 Patient Monitor',
		sku: 'COMEN-C80',
		description: 'Kop parametrli bemor monitori',
		categoryId: 'cat-2',
		category_id: 'cat-2',
		categoryName: 'Patient Monitoring',
		price: 16500000,
		currency: 'UZS',
		isRecommended: false,
		subsidyEnabled: true,
		subsidyAmount: 1500000,
		priceAfterSubsidy: 15000000,
		stockQuantity: 26,
		minimalStock: 6,
		isLowStock: false,
		stockStatus: 'in_stock',
		reviewsEnabled: true,
		isActive: true,
		status: 'active',
		images: [],
		createdAt: '2026-03-28T08:00:00.000Z',
		updatedAt: '2026-05-22T08:10:00.000Z',
		created_at: '2026-03-28T08:00:00.000Z',
		updated_at: '2026-05-22T08:10:00.000Z',
	},
]

let contracts = [
	{
		id: 'contract-1',
		client: 'client-2',
		client_id: 'client-2',
		client_name: 'Jasur Mamatov',
		title: 'Monitoring xonasi uchun buyurtma',
		status: 'closed',
		panel_type: 'jinko_ja',
		inverter_type: 'deye',
		requested_power_kw: 3,
		audit_power_kw: 3,
		audit_conclusion_kw: 3,
		eligible_subsidy_kw: 1,
		estimated_subsidy_amount: '4500000',
		subsidy_percent: '10',
		subsidy_amount: '4500000',
		customer_amount: '49500000',
		total_amount: '54000000',
		customer_phone: '+998998887766',
		installation_address: 'Fargona',
		delivery_status: 'scheduled',
		items: [
			{
				id: 'cti-1',
				product: 'product-2',
				product_name: 'Comen C80 Patient Monitor',
				quantity: 3,
				unit_price: '16500000',
			},
		],
		details: { note: 'ICU bolimi uchun 3 ta monitor, montaj talab qilinmaydi.' },
		created_at: '2026-05-01T09:00:00.000Z',
		updated_at: '2026-05-21T16:40:00.000Z',
	},
	{
		id: 'contract-2',
		client: 'client-1',
		client_id: 'client-1',
		client_name: 'Olga Ivanova',
		title: 'Ultratovush va monitor komplekti',
		status: 'confirmed',
		panel_type: 'longi_hi_mo_x10',
		inverter_type: 'solax',
		requested_power_kw: 4,
		audit_power_kw: 4,
		audit_conclusion_kw: 4,
		eligible_subsidy_kw: 2,
		estimated_subsidy_amount: '12000000',
		subsidy_percent: '12',
		subsidy_amount: '12000000',
		customer_amount: '102000000',
		total_amount: '114000000',
		customer_phone: '+998935556677',
		installation_address: 'Samarqand',
		delivery_status: 'in_progress',
		items: [
			{
				id: 'cti-3',
				product: 'product-1',
				product_name: 'Mindray DP-50',
				quantity: 1,
				unit_price: '48000000',
			},
			{
				id: 'cti-4',
				product: 'product-2',
				product_name: 'Comen C80 Patient Monitor',
				quantity: 4,
				unit_price: '16500000',
			},
		],
		details: { note: 'Samarqanddagi yangi klinika filiali uchun kombinatsiyalangan buyurtma.' },
		created_at: '2026-05-08T11:00:00.000Z',
		updated_at: '2026-05-22T10:15:00.000Z',
	},
]

let conversations = [
	{
		id: 'chat-1',
		channel: 'telegram',
		external_id: 'tg_98123',
		title: 'Aziz Karimov',
		lead: { id: 'lead-1', fullName: 'Aziz Karimov', name: 'Aziz Karimov', status: 'new', phone: '+998901112233' },
		client: null,
		assigned_operator: { id: 'user-op-1', fullName: 'Operator Avikontex', role: 'operator' },
		ai_paused_until: null,
		is_operator_active: true,
		operator_needed: false,
		operator_needed_defined: true,
		last_message_at: '2026-05-22T12:00:00.000Z',
		state: 'open',
		last_message: 'Assalomu alaykum, narxlarni yuboring.',
		last_message_payload: null,
		unread_count: 1,
		created_at: '2026-05-19T12:00:00.000Z',
		updated_at: '2026-05-22T12:00:00.000Z',
	},
	{
		id: 'chat-2',
		channel: 'instagram',
		external_id: 'ig_7721',
		title: 'Olga Ivanova',
		lead: { id: 'lead-2', fullName: 'Olga Ivanova', name: 'Olga Ivanova', status: 'in_progress', phone: '+998935556677' },
		client: { id: 'client-1', fullName: 'Olga Ivanova', phone: '+998935556677' },
		assigned_operator: { id: 'user-op-1', fullName: 'Operator Avikontex', role: 'operator' },
		ai_paused_until: null,
		is_operator_active: false,
		operator_needed: true,
		operator_needed_defined: true,
		last_message_at: '2026-05-22T09:05:00.000Z',
		state: 'pending',
		last_message: 'To‘lov muddatini uzaytirish mumkinmi?',
		last_message_payload: null,
		unread_count: 0,
		created_at: '2026-05-18T15:00:00.000Z',
		updated_at: '2026-05-22T09:05:00.000Z',
	},
	{
		id: 'chat-3',
		channel: 'web',
		external_id: 'web_4419',
		title: 'Jasur Mamatov',
		lead: { id: 'lead-3', fullName: 'Jasur Mamatov', name: 'Jasur Mamatov', status: 'closed', phone: '+998998887766' },
		client: { id: 'client-2', fullName: 'Jasur Mamatov', phone: '+998998887766' },
		assigned_operator: { id: 'user-admin-1', fullName: 'Admin Avikontex', role: 'admin' },
		ai_paused_until: null,
		is_operator_active: true,
		operator_needed: false,
		operator_needed_defined: true,
		last_message_at: '2026-05-20T10:31:00.000Z',
		state: 'resolved',
		last_message: "Saytdagi so'rov buyurtmaga o'tkazildi.",
		last_message_payload: null,
		unread_count: 0,
		created_at: '2026-05-20T09:48:00.000Z',
		updated_at: '2026-05-20T10:31:00.000Z',
	},
]

let chatMessages = [
	{
		id: 'msg-1',
		created_at: '2026-05-22T11:58:00.000Z',
		updated_at: '2026-05-22T11:58:00.000Z',
		sender_type: 'customer',
		direction: 'incoming',
		content: 'Assalomu alaykum',
		image_urls: [],
		external_message_id: null,
		metadata: null,
		is_read: false,
		session: 'chat-1',
		sent_by: null,
	},
	{
		id: 'msg-2',
		created_at: '2026-05-22T12:00:00.000Z',
		updated_at: '2026-05-22T12:00:00.000Z',
		sender_type: 'customer',
		direction: 'incoming',
		content: 'Narxlarni yuboring.',
		image_urls: [],
		external_message_id: null,
		metadata: null,
		is_read: false,
		session: 'chat-1',
		sent_by: null,
	},
	{
		id: 'msg-3',
		created_at: '2026-05-22T09:05:00.000Z',
		updated_at: '2026-05-22T09:05:00.000Z',
		sender_type: 'customer',
		direction: 'incoming',
		content: "To'lov muddatini uzaytirish mumkinmi?",
		image_urls: [],
		external_message_id: null,
		metadata: null,
		is_read: true,
		session: 'chat-2',
		sent_by: null,
	},
	{
		id: 'msg-4',
		created_at: '2026-05-20T10:31:00.000Z',
		updated_at: '2026-05-20T10:31:00.000Z',
		sender_type: 'operator',
		direction: 'outgoing',
		content: "So'rovingiz qabul qilindi va buyurtma bo'limiga o'tkazildi.",
		image_urls: [],
		external_message_id: null,
		metadata: null,
		is_read: true,
		session: 'chat-3',
		sent_by: 'user-admin-1',
	},
]

let notifications = [
	{
		id: 'notification-1',
		title: 'Yangi lead biriktirildi',
		message: 'Aziz Karimov sizga biriktirildi',
		type: 'info',
		channel: 'in_app',
		status: 'unread',
		is_read: false,
		metadata: null,
		user: { id: 'user-op-1', fullName: 'Operator Avikontex', role: 'operator' },
		created_at: '2026-05-22T11:10:00.000Z',
		updated_at: '2026-05-22T11:10:00.000Z',
	},
	{
		id: 'notification-2',
		title: "Buyurtma to'lovi kutilmoqda",
		message: "Ultratovush va monitor komplekti uchun to'lov hali tushmadi",
		type: 'warning',
		channel: 'system',
		status: 'read',
		is_read: true,
		metadata: null,
		user: { id: 'user-admin-1', fullName: 'Admin Avikontex', role: 'admin' },
		created_at: '2026-05-22T08:00:00.000Z',
		updated_at: '2026-05-22T08:20:00.000Z',
	},
]

let integrationConfigs = [
	{
		id: 'integration-1',
		provider: 'telegram',
		key: 'telegram_bot_token',
		label: 'Telegram Bot Token',
		value: 'mock-telegram-token',
		is_secret: true,
		is_active: true,
		updated_by: 'user-dev-1',
		updated_by_name: 'Developer Avikontex',
		created_at: '2026-04-01T10:00:00.000Z',
		updated_at: '2026-05-20T10:00:00.000Z',
	},
	{
		id: 'integration-2',
		provider: 'openai',
		key: 'openai_model',
		label: 'OpenAI Model',
		value: 'gpt-4.1',
		is_secret: false,
		is_active: true,
		updated_by: 'user-dev-1',
		updated_by_name: 'Developer Avikontex',
		created_at: '2026-04-02T10:00:00.000Z',
		updated_at: '2026-05-20T10:00:00.000Z',
	},
]

let aiSettings = [
	{
		id: 'ai-1',
		name: 'Default Planner',
		system_prompt: 'Siz Avikontex CRM reja yordamchisisiz.',
		follow_up_message: "Yana qo'shimcha kerak bo'lsa yozing.",
		model_name: 'gpt-4.1',
		temperature: 0.3,
		auto_order_enabled: false,
		order_confidence_threshold: 0.8,
		resume_after_operator_minutes: 30,
		is_active: true,
		updated_by: 'user-dev-1',
		updated_by_name: 'Developer Avikontex',
		created_at: '2026-04-10T10:00:00.000Z',
		updated_at: '2026-05-22T10:00:00.000Z',
	},
]

const apiLogs = [
	{
		id: 'api-log-1',
		method: 'GET',
		endpoint: '/api/clients/',
		status_code: 200,
		level: 'info',
		request_data: null,
		response_data: { count: 2 },
		error: null,
		duration_ms: 82,
		user_id: 'user-admin-1',
		ip_address: '127.0.0.1',
		created_at: '2026-05-22T11:05:00.000Z',
	},
	{
		id: 'api-log-2',
		method: 'POST',
		endpoint: '/api/contracts/',
		status_code: 201,
		level: 'info',
		request_data: { title: 'Monitoring xonasi uchun buyurtma' },
		response_data: { id: 'contract-1' },
		error: null,
		duration_ms: 124,
		user_id: 'user-admin-1',
		ip_address: '127.0.0.1',
		created_at: '2026-05-22T10:58:00.000Z',
	},
]

const aiLogs = [
	{
		id: 'ai-log-1',
		action: 'lead_summary',
		model: 'gpt-4.1',
		prompt: 'Summarize lead',
		response: 'Client requested a quote for diagnostic equipment.',
		level: 'info',
		tokens_used: 300,
		cost: 0.02,
		error: null,
		duration_ms: 930,
		user_id: 'user-op-1',
		created_at: '2026-05-22T10:45:00.000Z',
	},
]

const operatorStatisticsSummary = [
	{
		operator_id: 'user-op-1',
		username: 'operator',
		full_name: 'Operator Avikontex',
		contacted_clients: 26,
		contacted_sessions: 41,
		messages_sent: 185,
		contract_clients: 7,
		lost_clients: 3,
	},
	{
		operator_id: 'user-admin-1',
		username: 'admin',
		full_name: 'Admin Avikontex',
		contacted_clients: 12,
		contacted_sessions: 16,
		messages_sent: 74,
		contract_clients: 4,
		lost_clients: 1,
	},
]

const pricingMatrix = {
	subsidy_percent: '12',
	supported_audit_powers: [1, 2, 4, 6],
	panels: [
		{
			panel_type: 'jinko_ja',
			label: 'Diagnostic equipment',
			rows: [
				{
					power_kw: 1,
					base_prices: { deye: '48000000', solax: '16500000' },
					default_customer_prices: { deye: '43500000', solax: '15000000' },
					audit_customer_prices: {
						'1': { deye: '43500000', solax: '15000000' },
						'2': { deye: '87000000', solax: '30000000' },
					},
				},
				{
					power_kw: 4,
					base_prices: { deye: '192000000', solax: '66000000' },
					default_customer_prices: { deye: '172000000', solax: '60000000' },
					audit_customer_prices: {
						'4': { deye: '168000000', solax: '58500000' },
						'6': { deye: '252000000', solax: '87500000' },
					},
				},
			],
		},
	],
}

function toManagedUserAuth(user: Record<string, any>): AuthenticatedUser {
	return {
		id: user.id,
		email: user.email,
		fullName: user.full_name,
		phone: user.phone ?? undefined,
		role: user.role,
		status: user.is_active ? 'active' : 'inactive',
		permissionKeys:
			user.role === 'developer'
				? [...PERMISSION_CODES]
				: (rolePermissions[user.role] ?? []).slice(),
		createdAt: user.created_at,
		updatedAt: user.updated_at,
	}
}

export const mockUsersForAuth = () => users.map(toManagedUserAuth)

function buildDashboardOverview(params?: Record<string, unknown>) {
	const dateTo = typeof params?.date_to === 'string' ? params.date_to : '2026-05-23'
	const dateFrom = typeof params?.date_from === 'string' ? params.date_from : '2026-04-24'
	const interval = typeof params?.interval === 'string' ? params.interval : 'day'

	const leadsByStatus = [
		{ key: 'new', label: 'Yangi', count: 18 },
		{ key: 'in_progress', label: "Ko'rib chiqilmoqda", count: 14 },
		{ key: 'closed', label: 'Yopildi', count: 9 },
	]
	const leadsBySource = [
		{ key: 'telegram', label: 'Telegram', count: 22 },
		{ key: 'instagram', label: 'Instagram', count: 17 },
		{ key: 'web', label: 'Website', count: 11 },
	]
	const contractsByStatus = [
		{ key: 'new', label: 'Yangi', count: 4 },
		{ key: 'confirmed', label: 'Tasdiqlandi', count: 6 },
		{ key: 'packing', label: "To'planyapti", count: 3 },
		{ key: 'shipped', label: "Jo'natildi", count: 2 },
		{ key: 'delivered', label: 'Yetkazildi', count: 2 },
		{ key: 'closed', label: 'Yopildi', count: 5 },
	]
	const productsByCategory = categories.map(category => ({
		key: category.code,
		label: category.name,
		count: products.filter(product => product.categoryId === category.id).length,
	}))
	const chatsByChannel = [
		{ key: 'telegram', label: 'Telegram', count: 16 },
		{ key: 'instagram', label: 'Instagram', count: 9 },
	]
	const topProducts = products.map(product => ({
		product_id: product.id,
		key: product.id,
		label: product.name,
		count: Math.max(1, Math.round((product.stockQuantity ?? 0) / 5)),
		revenue: String((product.price ?? 0) * 4),
	}))
	const timeSeries = Array.from({ length: 10 }).map((_, idx) => {
		const day = String(14 + idx).padStart(2, '0')
		return {
			bucket_start: `2026-05-${day}`,
			bucket_end: `2026-05-${day}`,
			label: `2026-05-${day}`,
			leads: 2 + (idx % 4),
			chats: 4 + (idx % 3),
			clients: 1 + (idx % 2),
			contracts: idx % 3,
			revenue: String(5000000 + idx * 350000),
			collected_amount: String(3200000 + idx * 250000),
		}
	})

	return {
		leads: 45,
		clients: clients.length,
		products: products.length,
		chats: conversations.length,
		notifications: notifications.length,
		contracts: contracts.length,
		unread_messages: conversations.reduce((sum, item) => sum + (item.unread_count ?? 0), 0),
		revenue: '176000000',
		collected_amount: '123000000',
		pipeline_amount: '53000000',
		date_range: {
			date_from: dateFrom,
			date_to: dateTo,
			interval,
			label_format: 'YYYY-MM-DD',
			timezone: 'Asia/Tashkent',
		},
		filtered_summary: {
			leads: 45,
			new_leads: 18,
			converted_leads: 14,
			clients: clients.length,
			new_clients: 5,
			total_contracts: contracts.length,
			active_contracts: 4,
			revenue: '176000000',
			collected_amount: '123000000',
			average_contract_value: '35200000',
			lead_conversion_rate: '31.1',
			contract_renewal_rate: '12.0',
		},
		breakdowns: {
			leads_by_status: leadsByStatus,
			leads_by_source: leadsBySource,
			contracts_by_status: contractsByStatus,
			products_by_category: productsByCategory,
			chats_by_channel: chatsByChannel,
			top_products: topProducts,
		},
		time_series: timeSeries,
		region_demand: [
			{ region: 'Toshkent', total: 15 },
			{ region: 'Samarqand', total: 11 },
			{ region: 'Farg‘ona', total: 8 },
		],
	}
}

function calculateSubsidyMock(input: Record<string, unknown>) {
	const requestedPower = parseNumber(input.requested_power_kw) ?? 0
	const auditPower = parseNumber(input.audit_power_kw) ?? requestedPower
	const basePrice = requestedPower * 4200000
	const subsidyReferencePower = Math.min(auditPower, requestedPower, 10)
	const subsidyAmount = subsidyReferencePower * 480000
	const customerAmount = Math.max(basePrice - subsidyAmount, 0)
	return {
		base_price: basePrice,
		subsidy_amount: subsidyAmount,
		customer_amount: customerAmount,
		subsidy_reference_power_kw: subsidyReferencePower,
	}
}

export const services = {
	dashboard: {
		async getDashboardOverview(params?: Record<string, unknown>) {
			return clone(buildDashboardOverview(params))
		},
	},
	common: {
		async getHealth() {
			return { status: 'ok', database: 'ok', redis: 'ok' }
		},
		async getPublicCompanyInfo() {
			return {
				name: 'Avikontex',
				website: 'https://avikontex.uz/main',
				mode: 'mock',
			}
		},
		async calculateSubsidy(input: Record<string, unknown>) {
			return calculateSubsidyMock(input)
		},
	},
	chat: {
		async listSessions(params?: Record<string, unknown>) {
			let result = clone(conversations)
			result = applySearch(result, params?.search)
			if (params?.channel) {
				result = result.filter(item => item.channel === params.channel)
			}
			if (typeof params?.is_operator_active === 'boolean') {
				result = result.filter(item => Boolean(item.is_operator_active) === params.is_operator_active)
			}
			result = applyOrdering(result, params?.ordering ?? '-last_message_at')
			return paginate(result, params, 20)
		},
		async getSessionById(id: string) {
			return clone(conversations.find(item => item.id === id) ?? null)
		},
		async listMessages(firstArg: unknown, secondArg?: Record<string, unknown>) {
			let sessionId: string | undefined
			let params: Record<string, unknown> | undefined
			if (typeof firstArg === 'string') {
				sessionId = firstArg
				params = secondArg
			} else {
				params = (firstArg as Record<string, unknown>) ?? {}
				sessionId = typeof params.session === 'string' ? params.session : undefined
			}
			let result = clone(chatMessages)
			if (sessionId) {
				result = result.filter(item => item.session === sessionId)
			}
			result = applySearch(result, params?.search)
			result = applyOrdering(result, params?.ordering ?? 'created_at')
			return paginate(result, params, 50)
		},
		async sendMessage(sessionId: string, input: Record<string, unknown>) {
			const content = String(input?.content ?? '').trim()
			if (!content) {
				throw new Error('Message content is required.')
			}
			const timestamp = nowIso()
			const message = {
				id: nextId('msg'),
				created_at: timestamp,
				updated_at: timestamp,
				sender_type: 'operator',
				direction: 'outgoing',
				content,
				image_urls: [],
				external_message_id: null,
				metadata: (input?.metadata as Record<string, unknown>) ?? null,
				is_read: true,
				session: sessionId,
				sent_by: { id: 'user-op-1', fullName: 'Operator Avikontex', role: 'operator' },
			}
			chatMessages.push(message)
			conversations = conversations.map(session =>
				session.id === sessionId
					? {
							...session,
							last_message: content,
							last_message_at: timestamp,
							last_message_payload: message,
							updated_at: timestamp,
						}
					: session,
			)
			return clone(message)
		},
		async markSessionRead(sessionId: string) {
			chatMessages = chatMessages.map(message =>
				message.session === sessionId && message.direction === 'incoming'
					? { ...message, is_read: true, updated_at: nowIso() }
					: message,
			)
			const timestamp = nowIso()
			conversations = conversations.map(session =>
				session.id === sessionId
					? { ...session, unread_count: 0, updated_at: timestamp }
					: session,
			)
			return clone(conversations.find(item => item.id === sessionId) ?? null)
		},
		async pauseSessionAI(sessionId: string, pausedUntilIso: string) {
			const timestamp = nowIso()
			conversations = conversations.map(session =>
				session.id === sessionId
					? {
							...session,
							ai_paused_until: pausedUntilIso,
							operator_needed: true,
							operator_needed_defined: true,
							updated_at: timestamp,
						}
					: session,
			)
			return clone(conversations.find(item => item.id === sessionId) ?? null)
		},
		async resumeSessionAI(sessionId: string) {
			const timestamp = nowIso()
			conversations = conversations.map(session =>
				session.id === sessionId
					? {
							...session,
							ai_paused_until: null,
							operator_needed: false,
							operator_needed_defined: true,
							updated_at: timestamp,
						}
					: session,
			)
			return clone(conversations.find(item => item.id === sessionId) ?? null)
		},
		async requestOperator(sessionId: string) {
			const timestamp = nowIso()
			conversations = conversations.map(session =>
				session.id === sessionId
					? {
							...session,
							operator_needed: true,
							operator_needed_defined: true,
							updated_at: timestamp,
						}
					: session,
			)
			return clone(conversations.find(item => item.id === sessionId) ?? null)
		},
		async deleteSession(sessionId: string) {
			conversations = conversations.filter(item => item.id !== sessionId)
			chatMessages = chatMessages.filter(item => item.session !== sessionId)
		},
	},
	leads: {
		async listLeads(params?: Record<string, unknown>) {
			let result = clone(leads)
			result = applySearch(result, params?.search)
			if (params?.status) {
				result = result.filter(item => item.status === params.status)
			}
			if (params?.source) {
				result = result.filter(item => item.source === params.source)
			}
			if (params?.manager) {
				result = result.filter(item => item.manager === params.manager)
			}
			result = applyOrdering(result, params?.ordering ?? '-updated_at')
			return paginate(result, params, 20)
		},
		async getLead(id: string) {
			const entity = leads.find(item => item.id === id)
			if (!entity) {
				throw new Error('Lead not found.')
			}
			return clone(entity)
		},
		async getLeadById(id: string) {
			return this.getLead(id)
		},
		async createLead(input: Record<string, unknown>) {
			const timestamp = nowIso()
			const created = {
				id: nextId('lead'),
				full_name: String(input.full_name ?? '').trim(),
				phone: typeof input.phone === 'string' ? input.phone : '',
				source: input.source ?? 'web',
				status: input.status ?? 'new',
				manager: input.manager ?? null,
				manager_username:
					users.find(user => user.id === input.manager)?.full_name ?? null,
				ai_summary: input.ai_summary ?? null,
				metadata: input.metadata ?? null,
				created_at: timestamp,
				updated_at: timestamp,
			}
			leads.unshift(created)
			return clone(created)
		},
		async updateLead(id: string, input: Record<string, unknown>) {
			const current = leads.find(item => item.id === id)
			if (!current) {
				throw new Error('Lead not found.')
			}
			const updated = {
				...current,
				...input,
				manager_username:
					input.manager !== undefined
						? users.find(user => user.id === input.manager)?.full_name ?? null
						: current.manager_username,
				updated_at: nowIso(),
			}
			leads = leads.map(item => (item.id === id ? updated : item))
			return clone(updated)
		},
		async patchLead(id: string, input: Record<string, unknown>) {
			return this.updateLead(id, input)
		},
		async deleteLead(id: string) {
			leads = leads.filter(item => item.id !== id)
		},
	},
	clients: {
		async listClients(params?: Record<string, unknown>) {
			let result = clone(clients)
			result = applySearch(result, params?.search)
			if (params?.status) {
				result = result.filter(item => item.status === params.status)
			}
			if (params?.source_platform) {
				result = result.filter(item => item.source_platform === params.source_platform)
			}
			if (params?.manager) {
				result = result.filter(item => item.manager === params.manager)
			}
			if (params?.region) {
				const region = String(params.region).toLowerCase()
				result = result.filter(item => String(item.region ?? '').toLowerCase().includes(region))
			}
			result = applyOrdering(result, params?.ordering ?? '-updated_at')
			return paginate(result, params, 20)
		},
		async getClient(id: string) {
			const entity = clients.find(item => item.id === id)
			if (!entity) {
				throw new Error('Client not found.')
			}
			return clone(entity)
		},
		async createClient(input: Record<string, unknown>) {
			const timestamp = nowIso()
			const created = {
				id: nextId('client'),
				lead: input.lead ?? null,
				lead_id: input.lead ?? null,
				full_name: String(input.full_name ?? '').trim(),
				phone: typeof input.phone === 'string' ? input.phone : '',
				region: input.region ?? '',
				address: input.address ?? '',
				object_type: input.object_type ?? '',
				customer_segment: input.customer_segment ?? '',
				electricity_consumption: input.electricity_consumption ?? '',
				desired_power_kw: input.desired_power_kw ?? null,
				audit_conclusion_kw: input.audit_conclusion_kw ?? null,
				eligible_subsidy_kw: input.eligible_subsidy_kw ?? null,
				estimated_subsidy_amount: input.estimated_subsidy_amount ?? '',
				monthly_bill: input.monthly_bill ?? '',
				solution_type: input.solution_type ?? '',
				budget_range: input.budget_range ?? '',
				source_platform: input.source_platform ?? 'manual',
				status: input.status ?? 'new',
				manager: input.manager ?? null,
				manager_username:
					users.find(user => user.id === input.manager)?.full_name ?? null,
				notes: input.notes ?? '',
				ai_summary: input.ai_summary ?? '',
				recall_at: input.recall_at ?? null,
				metadata: input.metadata ?? null,
				created_at: timestamp,
				updated_at: timestamp,
			}
			clients.unshift(created)
			return clone(created)
		},
		async bulkImportClient(input: Record<string, unknown>) {
			return this.createClient(input)
		},
		async updateClient(id: string, input: Record<string, unknown>) {
			const current = clients.find(item => item.id === id)
			if (!current) {
				throw new Error('Client not found.')
			}
			const updated = {
				...current,
				...input,
				lead_id: input.lead ?? current.lead_id,
				manager_username:
					input.manager !== undefined
						? users.find(user => user.id === input.manager)?.full_name ?? null
						: current.manager_username,
				updated_at: nowIso(),
			}
			clients = clients.map(item => (item.id === id ? updated : item))
			return clone(updated)
		},
		async patchClient(id: string, input: Record<string, unknown>) {
			return this.updateClient(id, input)
		},
		async deleteClient(id: string) {
			clients = clients.filter(item => item.id !== id)
		},
		async exportClients() {
			const header = ['id', 'full_name', 'phone', 'region', 'status']
			const rows = clients.map(item => [
				item.id,
				item.full_name,
				item.phone ?? '',
				item.region ?? '',
				item.status ?? '',
			])
			const csv = [header, ...rows]
				.map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
				.join('\n')
			return new Blob([csv], {
				type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			})
		},
	},
	products: {
		async listProducts(params?: Record<string, unknown>) {
			let result = clone(products)
			result = applySearch(result, params?.search)
			if (params?.category) {
				result = result.filter(item => item.categoryId === params.category || item.category_id === params.category)
			}
			if (params?.status) {
				result = result.filter(item => item.status === params.status)
			}
			result = applyOrdering(result, params?.ordering ?? '-created_at')
			return paginate(result, params, 20)
		},
		async getProductById(id: string) {
			const entity = products.find(item => item.id === id)
			if (!entity) {
				throw new Error('Product not found.')
			}
			return clone(entity)
		},
		async getProduct(id: string) {
			return this.getProductById(id)
		},
		async createProduct(input: Record<string, unknown>) {
			const timestamp = nowIso()
			const category = categories.find(item => item.id === input.categoryId || item.id === input.category_id)
			const price = parseNumber(input.price) ?? 0
			const subsidyEnabled = Boolean(input.subsidyEnabled)
			const subsidyAmount = subsidyEnabled ? Math.round(price * 0.15) : 0
			const created = {
				id: nextId('product'),
				name: String(input.name ?? '').trim(),
				sku: input.sku ?? '',
				description: input.description ?? '',
				categoryId: category?.id ?? null,
				category_id: category?.id ?? null,
				categoryName: category?.name ?? '',
				price,
				currency: input.currency ?? 'UZS',
				isRecommended: Boolean(input.isRecommended),
				subsidyEnabled,
				subsidyAmount,
				priceAfterSubsidy: Math.max(price - subsidyAmount, 0),
				stockQuantity: parseNumber(input.stockQuantity) ?? 0,
				minimalStock: parseNumber(input.minimalStock) ?? 0,
				isLowStock: false,
				stockStatus: 'in_stock',
				reviewsEnabled: Boolean(input.reviewsEnabled ?? true),
				isActive: Boolean(input.isActive ?? true),
				status: 'active',
				images: [],
				createdAt: timestamp,
				updatedAt: timestamp,
				created_at: timestamp,
				updated_at: timestamp,
			}
			products.unshift(created)
			return clone(created)
		},
		async updateProduct(id: string, input: Record<string, unknown>) {
			return this.patchProduct(id, input)
		},
		async patchProduct(id: string, input: Record<string, unknown>) {
			const current = products.find(item => item.id === id)
			if (!current) {
				throw new Error('Product not found.')
			}
			const category = categories.find(item => item.id === (input.categoryId ?? input.category_id ?? current.categoryId))
			const nextPrice = parseNumber(input.price) ?? current.price
			const nextSubsidyEnabled =
				typeof input.subsidyEnabled === 'boolean' ? input.subsidyEnabled : current.subsidyEnabled
			const nextSubsidyAmount = nextSubsidyEnabled ? Math.round(nextPrice * 0.15) : 0
			const stockQuantity = parseNumber(input.stockQuantity) ?? current.stockQuantity ?? 0
			const minimalStock = parseNumber(input.minimalStock) ?? current.minimalStock ?? 0
			const stockStatus = stockQuantity <= 0 ? 'out_of_stock' : stockQuantity <= minimalStock ? 'low_stock' : 'in_stock'
			const updated = {
				...current,
				...input,
				categoryId: category?.id ?? current.categoryId,
				category_id: category?.id ?? current.category_id,
				categoryName: category?.name ?? current.categoryName,
				price: nextPrice,
				subsidyEnabled: nextSubsidyEnabled,
				subsidyAmount: nextSubsidyAmount,
				priceAfterSubsidy: Math.max(nextPrice - nextSubsidyAmount, 0),
				stockQuantity,
				minimalStock,
				stockStatus,
				isLowStock: stockStatus === 'low_stock',
				updatedAt: nowIso(),
				updated_at: nowIso(),
			}
			products = products.map(item => (item.id === id ? updated : item))
			return clone(updated)
		},
		async deleteProduct(id: string) {
			products = products.filter(item => item.id !== id)
		},
		async listProductCategories(params?: Record<string, unknown>) {
			let result = clone(categories)
			result = applySearch(result, params?.search)
			if (typeof params?.is_active === 'boolean') {
				result = result.filter(item => Boolean(item.isActive) === params.is_active)
			}
			result = applyOrdering(result, params?.ordering ?? 'sortOrder')
			return paginate(result, params, 50)
		},
		async getProductCategoryById(id: string) {
			const entity = categories.find(item => item.id === id)
			if (!entity) {
				throw new Error('Category not found.')
			}
			return clone(entity)
		},
		async createProductCategory(input: Record<string, unknown>) {
			const timestamp = nowIso()
			const created = {
				id: nextId('cat'),
				name: String(input.name ?? '').trim(),
				code: String(input.code ?? '').trim() || `CAT_${idCounter}`,
				sortOrder: parseNumber(input.sortOrder) ?? categories.length,
				description: input.description ?? '',
				isActive: input.isActive ?? true,
				createdAt: timestamp,
				updatedAt: timestamp,
				created_at: timestamp,
				updated_at: timestamp,
			}
			categories.push(created)
			return clone(created)
		},
		async updateProductCategory(id: string, input: Record<string, unknown>) {
			return this.patchProductCategory(id, input)
		},
		async patchProductCategory(id: string, input: Record<string, unknown>) {
			const current = categories.find(item => item.id === id)
			if (!current) {
				throw new Error('Category not found.')
			}
			const updated = {
				...current,
				...input,
				sortOrder: parseNumber(input.sortOrder) ?? current.sortOrder,
				updatedAt: nowIso(),
				updated_at: nowIso(),
			}
			categories = categories.map(item => (item.id === id ? updated : item))
			return clone(updated)
		},
		async deleteProductCategory(id: string) {
			categories = categories.filter(item => item.id !== id)
		},
		async listCategories(params?: Record<string, unknown>) {
			return this.listProductCategories(params)
		},
		async getCategory(id: string) {
			return this.getProductCategoryById(id)
		},
		async createCategory(input: Record<string, unknown>) {
			return this.createProductCategory(input)
		},
		async updateCategory(id: string, input: Record<string, unknown>) {
			return this.patchProductCategory(id, input)
		},
		async deleteCategory(id: string) {
			return this.deleteProductCategory(id)
		},
	},
	contracts: {
		async listContracts(params?: Record<string, unknown>) {
			let result = clone(contracts)
			result = applySearch(result, params?.search)
			if (params?.status) {
				result = result.filter(item => item.status === params.status)
			}
			if (params?.panel_type) {
				result = result.filter(item => item.panel_type === params.panel_type)
			}
			if (params?.inverter_type) {
				result = result.filter(item => item.inverter_type === params.inverter_type)
			}
			if (params?.client) {
				result = result.filter(item => item.client === params.client)
			}
			if (params?.requested_power_kw !== undefined && params?.requested_power_kw !== null && params?.requested_power_kw !== '') {
				const requested = parseNumber(params.requested_power_kw)
				if (requested !== undefined) {
					result = result.filter(item => Number(item.requested_power_kw ?? 0) === requested)
				}
			}
			result = applyOrdering(result, params?.ordering ?? '-updated_at')
			return paginate(result, params, 20)
		},
		async getContract(id: string) {
			const entity = contracts.find(item => item.id === id)
			if (!entity) {
				throw new Error('Contract not found.')
			}
			return clone(entity)
		},
		async createContract(input: Record<string, unknown>) {
			const timestamp = nowIso()
			const clientId = String(input.client ?? input.client_id ?? '')
			const client = clients.find(item => item.id === clientId)
			const created = {
				id: nextId('contract'),
				client: clientId,
				client_id: clientId,
				client_name: client?.full_name ?? 'Unknown Client',
				title: String(input.title ?? '').trim(),
				status: input.status ?? 'new',
				panel_type: input.panel_type ?? '',
				inverter_type: input.inverter_type ?? '',
				requested_power_kw: parseNumber(input.requested_power_kw) ?? null,
				audit_power_kw: parseNumber(input.audit_power_kw) ?? null,
				audit_conclusion_kw: parseNumber(input.audit_conclusion_kw) ?? null,
				eligible_subsidy_kw: parseNumber(input.eligible_subsidy_kw) ?? null,
				estimated_subsidy_amount: input.estimated_subsidy_amount ?? null,
				subsidy_percent: input.subsidy_percent ?? null,
				subsidy_amount: input.subsidy_amount ?? null,
				customer_amount: input.customer_amount ?? null,
				total_amount: input.total_amount ?? null,
				customer_phone: input.customer_phone ?? client?.phone ?? '',
				installation_address: input.installation_address ?? client?.address ?? '',
				delivery_status: input.delivery_status ?? '',
				delivery_notes: input.delivery_notes ?? '',
				details: input.details ?? null,
				items: Array.isArray(input.items) ? clone(input.items) : [],
				created_at: timestamp,
				updated_at: timestamp,
			}
			contracts.unshift(created)
			return clone(created)
		},
		async updateContract(id: string, input: Record<string, unknown>) {
			const current = contracts.find(item => item.id === id)
			if (!current) {
				throw new Error('Contract not found.')
			}
			const clientId = String(input.client ?? current.client)
			const client = clients.find(item => item.id === clientId)
			const updated = {
				...current,
				...input,
				client: clientId,
				client_id: clientId,
				client_name: client?.full_name ?? current.client_name,
				items: Array.isArray(input.items) ? clone(input.items) : current.items,
				updated_at: nowIso(),
			}
			contracts = contracts.map(item => (item.id === id ? updated : item))
			return clone(updated)
		},
		async deleteContract(id: string) {
			contracts = contracts.filter(item => item.id !== id)
		},
		async recalculate(id: string, input?: Record<string, unknown>) {
			const current = contracts.find(item => item.id === id)
			if (!current) {
				throw new Error('Contract not found.')
			}
			const merged = {
				...current,
				...(input ?? {}),
				updated_at: nowIso(),
			}
			const requestedPower = parseNumber(merged.requested_power_kw) ?? 0
			const base = requestedPower * 4000000
			const subsidy = Math.round(base * 0.3)
			merged.total_amount = String(base)
			merged.subsidy_amount = String(subsidy)
			merged.customer_amount = String(Math.max(base - subsidy, 0))
			contracts = contracts.map(item => (item.id === id ? merged : item))
			return clone(merged)
		},
		async getPricingMatrix() {
			return clone(pricingMatrix)
		},
		async downloadFile() {
			return new Blob(['Mock contract file'], { type: 'text/plain' })
		},
		async getDownloadFileInfo(id: string) {
			return this.getContract(id)
		},
		async uploadFile(id: string) {
			return this.getContract(id)
		},
	},
	notifications: {
		async listNotifications(params?: Record<string, unknown>) {
			let result = clone(notifications)
			result = applySearch(result, params?.search)
			if (params?.channel) {
				result = result.filter(item => item.channel === params.channel)
			}
			if (typeof params?.is_read === 'boolean') {
				result = result.filter(item => Boolean(item.is_read) === params.is_read)
			}
			if (params?.status === 'read' || params?.status === 'unread') {
				const target = params.status === 'read'
				result = result.filter(item => Boolean(item.is_read) === target)
			}
			result = applyOrdering(result, params?.ordering ?? '-created_at')
			return paginate(result, params, 20)
		},
		async getNotificationById(id: string) {
			const entity = notifications.find(item => item.id === id)
			if (!entity) {
				throw new Error('Notification not found.')
			}
			return clone(entity)
		},
		async getNotification(id: string) {
			return this.getNotificationById(id)
		},
		async markAsRead(id: string) {
			const current = notifications.find(item => item.id === id)
			if (!current) {
				throw new Error('Notification not found.')
			}
			const updated = {
				...current,
				is_read: true,
				status: 'read',
				updated_at: nowIso(),
			}
			notifications = notifications.map(item => (item.id === id ? updated : item))
			return clone(updated)
		},
		async markNotificationRead(id: string) {
			return this.markAsRead(id)
		},
		async markAllAsRead() {
			const timestamp = nowIso()
			notifications = notifications.map(item => ({
				...item,
				is_read: true,
				status: 'read',
				updated_at: timestamp,
			}))
			return true
		},
		async delete(id: string) {
			notifications = notifications.filter(item => item.id !== id)
		},
		async deleteAll() {
			notifications = []
		},
	},
	integrations: {
		async listConfigs(params?: Record<string, unknown>) {
			let result = clone(integrationConfigs)
			result = applySearch(result, params?.search)
			if (params?.provider) {
				result = result.filter(item => item.provider === params.provider)
			}
			if (typeof params?.is_active === 'boolean') {
				result = result.filter(item => Boolean(item.is_active) === params.is_active)
			}
			result = applyOrdering(result, params?.ordering ?? '-updated_at')
			return paginate(result, params, 20)
		},
		async getConfig(id: string) {
			const entity = integrationConfigs.find(item => item.id === id)
			if (!entity) {
				throw new Error('Integration config not found.')
			}
			return clone(entity)
		},
		async createConfig(input: Record<string, unknown>) {
			const timestamp = nowIso()
			const created = {
				id: nextId('integration'),
				provider: input.provider ?? 'telegram',
				key: String(input.key ?? '').trim(),
				label: String(input.label ?? '').trim(),
				value: String(input.value ?? ''),
				is_secret: Boolean(input.is_secret),
				is_active: Boolean(input.is_active ?? true),
				updated_by: 'user-dev-1',
				updated_by_name: 'Developer Avikontex',
				created_at: timestamp,
				updated_at: timestamp,
			}
			integrationConfigs.unshift(created)
			return clone(created)
		},
		async updateConfig(id: string, input: Record<string, unknown>) {
			return this.patchConfig(id, input)
		},
		async patchConfig(id: string, input: Record<string, unknown>) {
			const current = integrationConfigs.find(item => item.id === id)
			if (!current) {
				throw new Error('Integration config not found.')
			}
			const updated = {
				...current,
				...input,
				updated_by: 'user-dev-1',
				updated_by_name: 'Developer Avikontex',
				updated_at: nowIso(),
			}
			integrationConfigs = integrationConfigs.map(item => (item.id === id ? updated : item))
			return clone(updated)
		},
		async deleteConfig(id: string) {
			integrationConfigs = integrationConfigs.filter(item => item.id !== id)
		},
	},
	operatorStatistics: {
		async listOperatorStatistics() {
			return clone(operatorStatisticsSummary)
		},
		async getOperatorStatisticsById(operatorId: string, params?: Record<string, unknown>) {
			const summary = operatorStatisticsSummary.find(item => item.operator_id === operatorId)
			if (!summary) {
				return null
			}
			return {
				...summary,
				date_from: params?.date_from ?? '2026-04-24',
				date_to: params?.date_to ?? '2026-05-23',
				contract_count: summary.contract_clients,
				client_status_distribution: [
					{ status: 'new', total: 10 },
					{ status: 'contacted', total: 8 },
					{ status: 'qualified', total: 5 },
					{ status: 'lost', total: summary.lost_clients },
				],
				contract_status_distribution: [
					{ status: 'new', total: 2 },
					{ status: 'confirmed', total: 2 },
					{ status: 'packing', total: 1 },
					{ status: 'shipped', total: 1 },
					{ status: 'delivered', total: 1 },
					{ status: 'closed', total: summary.contract_clients },
				],
				source_distribution: [
					{ source: 'telegram', total: 14 },
					{ source: 'instagram', total: 9 },
					{ source: 'manual', total: 3 },
				],
				recent_clients: clients.slice(0, 5).map(client => ({
					id: client.id,
					full_name: client.full_name,
					phone: client.phone ?? '',
					status: client.status ?? 'new',
					source_platform: client.source_platform ?? 'manual',
					last_contact_at: client.updated_at,
				})),
			}
		},
	},
	aiSettings: {
		async listSettings(params?: Record<string, unknown>) {
			let result = clone(aiSettings)
			result = applySearch(result, params?.search)
			if (typeof params?.is_active === 'boolean') {
				result = result.filter(item => Boolean(item.is_active) === params.is_active)
			}
			result = applyOrdering(result, params?.ordering ?? '-updated_at')
			return paginate(result, params, 20)
		},
		async getSettingById(id: string) {
			const entity = aiSettings.find(item => item.id === id)
			if (!entity) {
				throw new Error('AI setting not found.')
			}
			return clone(entity)
		},
		async getSetting(id: string) {
			return this.getSettingById(id)
		},
		async getActiveSetting() {
			return clone(aiSettings.find(item => item.is_active) ?? null)
		},
		async createSetting(input: Record<string, unknown>) {
			const timestamp = nowIso()
			const created = {
				id: nextId('ai'),
				name: String(input.name ?? '').trim(),
				system_prompt: String(input.system_prompt ?? ''),
				follow_up_message: input.follow_up_message ?? null,
				model_name: String(input.model_name ?? 'gpt-4.1'),
				temperature: parseNumber(input.temperature) ?? 0.3,
				auto_order_enabled: Boolean(input.auto_order_enabled),
				order_confidence_threshold: parseNumber(input.order_confidence_threshold) ?? 0.8,
				resume_after_operator_minutes: parseNumber(input.resume_after_operator_minutes) ?? 30,
				is_active: Boolean(input.is_active),
				updated_by: 'user-dev-1',
				updated_by_name: 'Developer Avikontex',
				created_at: timestamp,
				updated_at: timestamp,
			}
			if (created.is_active) {
				aiSettings = aiSettings.map(item => ({ ...item, is_active: false }))
			}
			aiSettings.unshift(created)
			return clone(created)
		},
		async updateSetting(id: string, input: Record<string, unknown>) {
			return this.patchSetting(id, input)
		},
		async patchSetting(id: string, input: Record<string, unknown>) {
			const current = aiSettings.find(item => item.id === id)
			if (!current) {
				throw new Error('AI setting not found.')
			}
			if (input.is_active === true) {
				aiSettings = aiSettings.map(item =>
					item.id === id ? item : { ...item, is_active: false },
				)
			}
			const updated = {
				...current,
				...input,
				updated_by: 'user-dev-1',
				updated_by_name: 'Developer Avikontex',
				updated_at: nowIso(),
			}
			aiSettings = aiSettings.map(item => (item.id === id ? updated : item))
			return clone(updated)
		},
		async deleteSetting(id: string) {
			aiSettings = aiSettings.filter(item => item.id !== id)
			return true
		},
		async setActiveSetting(id: string) {
			const target = aiSettings.find(item => item.id === id)
			if (!target) {
				throw new Error('AI setting not found.')
			}
			aiSettings = aiSettings.map(item => ({
				...item,
				is_active: item.id === id,
				updated_at: nowIso(),
			}))
			return clone(aiSettings.find(item => item.id === id))
		},
	},
	logs: {
		async getHealth() {
			return { status: 'ok', database: 'ok', redis: 'ok' }
		},
		async listApiLogs(params?: Record<string, unknown>) {
			let result = clone(apiLogs)
			result = applySearch(result, params?.search)
			if (params?.level) {
				result = result.filter(item => item.level === params.level)
			}
			result = applyOrdering(result, params?.ordering ?? '-created_at')
			return paginate(result, params, 20)
		},
		async listAILogs(params?: Record<string, unknown>) {
			let result = clone(aiLogs)
			result = applySearch(result, params?.search)
			if (params?.level) {
				result = result.filter(item => item.level === params.level)
			}
			result = applyOrdering(result, params?.ordering ?? '-created_at')
			return paginate(result, params, 20)
		},
		async getApiLog(id: string) {
			const log = apiLogs.find(item => item.id === id) ?? aiLogs.find(item => item.id === id)
			if (!log) {
				throw new Error('Log not found.')
			}
			const type = log.id.startsWith('ai-log-') ? 'ai' : 'api'
			return {
				id: log.id,
				type,
				message:
					type === 'api'
						? `${log.method} ${log.endpoint}`
						: `${log.action} (${log.model ?? '-'})`,
				metadata: log,
				created_at: log.created_at,
			}
		},
	},
	users: {
		async listUsers(params?: Record<string, unknown>) {
			let result = clone(users)
			result = applySearch(result, params?.search)
			if (params?.role) {
				result = result.filter(item => item.role === params.role)
			}
			if (typeof params?.is_active === 'boolean') {
				result = result.filter(item => Boolean(item.is_active) === params.is_active)
			}
			result = applyOrdering(result, params?.ordering ?? '-updated_at')
			return paginate(result, params, 20)
		},
		async getUserById(id: string) {
			const entity = users.find(item => item.id === id)
			if (!entity) {
				throw new Error('User not found.')
			}
			return clone(entity)
		},
		async createUser(input: Record<string, unknown>) {
			const timestamp = nowIso()
			const role = input.role ?? 'operator'
			const created = {
				id: nextId('user'),
				email: String(input.email ?? '').trim().toLowerCase(),
				full_name: String(input.full_name ?? '').trim(),
				phone: input.phone ?? null,
				role,
				is_active: Boolean(input.is_active ?? true),
				custom_permissions: Array.isArray(input.custom_permission_ids)
					? clone(input.custom_permission_ids)
					: [],
				custom_permission_ids: Array.isArray(input.custom_permission_ids)
					? clone(input.custom_permission_ids)
					: [],
				created_by: 'user-dev-1',
				created_by_name: 'Developer Avikontex',
				created_at: timestamp,
				updated_at: timestamp,
			}
			users.unshift(created)
			return clone(created)
		},
		async updateUser(id: string, input: Record<string, unknown>) {
			const current = users.find(item => item.id === id)
			if (!current) {
				throw new Error('User not found.')
			}
			const updated = {
				...current,
				...input,
				custom_permissions: Array.isArray(input.custom_permission_ids)
					? clone(input.custom_permission_ids)
					: current.custom_permissions,
				custom_permission_ids: Array.isArray(input.custom_permission_ids)
					? clone(input.custom_permission_ids)
					: current.custom_permission_ids,
				updated_at: nowIso(),
			}
			users = users.map(item => (item.id === id ? updated : item))
			return clone(updated)
		},
		async deleteUser(id: string) {
			users = users.filter(item => item.id !== id)
		},
		async listPermissions() {
			return PERMISSION_CODES.map(code => ({
				id: `perm-${code}`,
				code,
				name: code,
				description: code,
				created_at: '2026-01-01T00:00:00.000Z',
				updated_at: '2026-01-01T00:00:00.000Z',
			}))
		},
		async listRolesCatalog() {
			return [
				{ key: 'developer', label: 'Developer', default_permissions: [...PERMISSION_CODES] },
				{ key: 'admin', label: 'Admin', default_permissions: rolePermissions.admin },
				{ key: 'operator', label: 'Operator', default_permissions: rolePermissions.operator },
			]
		},
		async listUserPermissions(userId: string) {
			const user = users.find(item => item.id === userId)
			const permissions = user?.role === 'developer' ? [...PERMISSION_CODES] : rolePermissions[user?.role ?? 'operator'] ?? []
			return permissions.map(code => ({
				id: `perm-${code}`,
				code,
				name: code,
				description: code,
				created_at: '2026-01-01T00:00:00.000Z',
				updated_at: '2026-01-01T00:00:00.000Z',
			}))
		},
	},
}


