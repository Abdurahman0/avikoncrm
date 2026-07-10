export const backendCapabilities = {
  dashboard: { available: true },
  leads: {
    available: false,
    canWrite: false,
  },
  clients: { available: true },
  products: {
    available: true,
    canWrite: false,
  },
  chats: { available: true },
  contracts: {
    available: false,
    canWrite: false,
    canViewPricingMatrix: false,
  },
  notifications: {
    available: false,
    canWrite: false,
  },
  users: { available: true },
  operatorKpi: {
    available: false,
    visibleInNavigation: false,
  },
  integrations: { available: true },
  aiSettings: { available: true },
  logs: { available: true },
} as const;

const moduleAvailability: Record<string, boolean> = {
  dashboard: backendCapabilities.dashboard.available,
  leads: backendCapabilities.leads.available,
  clients: backendCapabilities.clients.available,
  products: backendCapabilities.products.available,
  chats: backendCapabilities.chats.available,
  contracts: backendCapabilities.contracts.available,
  notifications: backendCapabilities.notifications.available,
  users: backendCapabilities.users.available,
  'operator-kpi': backendCapabilities.operatorKpi.available,
  integrations: backendCapabilities.integrations.available,
  'ai-settings': backendCapabilities.aiSettings.available,
  logs: backendCapabilities.logs.available,
};

export function isBackendModuleAvailable(moduleId: string): boolean {
  return moduleAvailability[moduleId] ?? true;
}
