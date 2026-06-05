export type ContractCatalogLanguage = 'uz' | 'ru' | 'en'

type ContractProductLine = 'jinko_ja' | 'longi_hi_mo_x10'
type ContractBrand = 'deye' | 'solax'

const PRODUCT_LINE_LABELS: Record<
	ContractProductLine,
	Record<ContractCatalogLanguage, string>
> = {
	jinko_ja: {
		uz: 'Diagnostika uskunalari',
		ru: 'Диагностическое оборудование',
		en: 'Diagnostic equipment',
	},
	longi_hi_mo_x10: {
		uz: 'Monitoring uskunalari',
		ru: 'Оборудование мониторинга',
		en: 'Monitoring equipment',
	},
}

const BRAND_LABELS: Record<ContractBrand, Record<ContractCatalogLanguage, string>> = {
	deye: {
		uz: 'Mindray',
		ru: 'Mindray',
		en: 'Mindray',
	},
	solax: {
		uz: 'Comen',
		ru: 'Comen',
		en: 'Comen',
	},
}

const EMPTY_LABELS: Record<ContractCatalogLanguage, string> = {
	uz: "Ko'rsatilmagan",
	ru: 'Не указано',
	en: 'Not specified',
}

export function resolveContractCatalogLanguage(
	language: string,
): ContractCatalogLanguage {
	if (language.startsWith('ru')) {
		return 'ru'
	}

	if (language.startsWith('en')) {
		return 'en'
	}

	return 'uz'
}

export function getContractProductLineLabel(
	value: string | null | undefined,
	language: ContractCatalogLanguage,
): string {
	if (!value) {
		return EMPTY_LABELS[language]
	}

	return PRODUCT_LINE_LABELS[value as ContractProductLine]?.[language] ?? value
}

export function getContractBrandLabel(
	value: string | null | undefined,
	language: ContractCatalogLanguage,
): string {
	if (!value) {
		return EMPTY_LABELS[language]
	}

	return BRAND_LABELS[value as ContractBrand]?.[language] ?? value
}

export function getContractProductLineOptions(language: ContractCatalogLanguage) {
	return [
		{ value: 'jinko_ja', label: PRODUCT_LINE_LABELS.jinko_ja[language] },
		{
			value: 'longi_hi_mo_x10',
			label: PRODUCT_LINE_LABELS.longi_hi_mo_x10[language],
		},
	]
}

export function getContractBrandOptions(language: ContractCatalogLanguage) {
	return [
		{ value: 'deye', label: BRAND_LABELS.deye[language] },
		{ value: 'solax', label: BRAND_LABELS.solax[language] },
	]
}

export function getContractEmptyOptionLabel(language: ContractCatalogLanguage) {
	return EMPTY_LABELS[language]
}
