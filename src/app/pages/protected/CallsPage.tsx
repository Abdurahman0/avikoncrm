import { useTranslation } from 'react-i18next'
import { PageHeader, PageLayout } from '../../../components/shared/page'
import CallsView from '../../../features/calls/components/CallsView'

function CallsPage() {
	const { t } = useTranslation()

	return (
		<PageLayout
			header={
				<PageHeader
					eyebrow={t('callsPage.eyebrow')}
					title={t('callsPage.title')}
					subtitle={t('callsPage.subtitle')}
				/>
			}
		>
			<CallsView />
		</PageLayout>
	)
}

export default CallsPage
