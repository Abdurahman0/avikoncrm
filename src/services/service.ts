import { services as mockServices } from './mock/mock-services'
import { liveServices } from './live-services'

const useMockServices = import.meta.env.VITE_USE_MOCK_API === 'true'

export const services = (useMockServices ? mockServices : liveServices) as any
