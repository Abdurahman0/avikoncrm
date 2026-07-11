import type { TFunction } from 'i18next'
import type { Client } from '../../services/contracts'

export type CanonicalClientType = 'jismoniy' | 'yatt' | 'yuridik' | 'budjet'

export function normalizeClientType(value?: Client['client_type'] | string): CanonicalClientType {
	if (value === 'individual') return 'jismoniy'
	if (value === 'company') return 'yuridik'
	if (value === 'yatt' || value === 'yuridik' || value === 'budjet') return value
	return 'jismoniy'
}

export function getClientTypeLabel(t: TFunction, value?: Client['client_type'] | string): string {
	return t(`clients.types.${normalizeClientType(value)}.label`)
}

export function getClientTypeOptions(t: TFunction, includeAll = false) {
	const values: CanonicalClientType[] = ['jismoniy', 'yatt', 'yuridik', 'budjet']
	const options = values.map(value => ({
		value,
		label: t(`clients.types.${value}.label`),
		description: t(`clients.types.${value}.description`),
	}))

	return includeAll
		? [{ value: 'all', label: t('clients.types.all'), description: t('clients.types.allDescription') }, ...options]
		: options
}

export function requiresOrganization(value?: Client['client_type'] | string): boolean {
	return normalizeClientType(value) !== 'jismoniy'
}
