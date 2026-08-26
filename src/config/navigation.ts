import type { AppModule, AppRole, AccessStrategy } from '../types/architecture';
import type { AppRouteId } from './routes';

export type NavigationGroupId = 'main' | 'operations' | 'system';

export type NavigationIconKey =
  | 'dashboard'
  | 'leads'
  | 'clients'
  | 'products'
  | 'chats'
  | 'calls'
  | 'contracts'
  | 'notifications'
  | 'users'
  | 'activity'
  | 'integrations'
  | 'ai-settings'
  | 'logs';

type SidebarRouteId = Extract<AppRouteId, AppModule['id']>;

export interface NavigationItemConfig {
  id: SidebarRouteId;
  label: string;
  path: string;
  iconKey: NavigationIconKey;
  moduleId?: AppModule['id'];
  group: NavigationGroupId;
  sortOrder: number;
  allowedRoles?: AppRole[];
  accessStrategy?: AccessStrategy;
  permissionKey?: string;
  children?: NavigationItemConfig[];
}

export interface NavigationGroupConfig {
  id: NavigationGroupId;
  label: string;
  sortOrder: number;
  items: NavigationItemConfig[];
}

// Navigation structure for Avikontex CRM
export const navigationConfig: NavigationGroupConfig[] = [
  {
    id: 'main',
    label: 'Main',
    sortOrder: 1,
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/dashboard',
        moduleId: 'dashboard',
        iconKey: 'dashboard',
        group: 'main',
        sortOrder: 1,
        allowedRoles: ['developer', 'admin', 'operator'],
      },
      {
        id: 'leads',
        label: 'Inquiries',
        path: '/leads',
        moduleId: 'leads',
        iconKey: 'leads',
        group: 'main',
        sortOrder: 2,
        allowedRoles: ['developer', 'admin', 'operator'],
      },
      {
        id: 'clients',
        label: 'Clients',
        path: '/clients',
        moduleId: 'clients',
        iconKey: 'clients',
        group: 'main',
        sortOrder: 3,
        allowedRoles: ['developer', 'admin', 'operator'],
      },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    sortOrder: 2,
    items: [
      {
        id: 'products',
        label: 'Products',
        path: '/products',
        moduleId: 'products',
        iconKey: 'products',
        group: 'operations',
        sortOrder: 1,
        allowedRoles: ['developer', 'admin', 'operator'],
      },
      {
        id: 'contracts',
        label: 'Contracts',
        path: '/contracts',
        moduleId: 'contracts',
        iconKey: 'contracts',
        group: 'operations',
        sortOrder: 2,
        allowedRoles: ['developer', 'admin', 'operator'],
      },
      {
        id: 'chats',
        label: 'Chats',
        path: '/chats',
        moduleId: 'chats',
        iconKey: 'chats',
        group: 'operations',
        sortOrder: 3,
        allowedRoles: ['developer', 'admin', 'operator'],
      },
      {
        id: 'calls',
        label: 'Calls',
        path: '/calls',
        moduleId: 'calls',
        iconKey: 'calls',
        group: 'operations',
        sortOrder: 4,
        allowedRoles: ['developer', 'admin', 'operator'],
      },
      {
        id: 'notifications',
        label: 'Notifications',
        path: '/notifications',
        moduleId: 'notifications',
        iconKey: 'notifications',
        group: 'operations',
        sortOrder: 4,
        allowedRoles: ['developer', 'admin', 'operator'],
      },
    ],
  },
  {
    id: 'system',
    label: 'System',
    sortOrder: 3,
    items: [
      {
        id: 'users',
        label: 'Users',
        path: '/users',
        moduleId: 'users',
        iconKey: 'users',
        group: 'system',
        sortOrder: 1,
        allowedRoles: ['developer', 'admin'],
      },
      {
        id: 'operator-kpi',
        label: 'Operator KPI',
        path: '/operator-kpi',
        moduleId: 'operator-kpi',
        iconKey: 'activity',
        group: 'system',
        sortOrder: 2,
        allowedRoles: ['developer', 'admin', 'operator'],
      },
      {
        id: 'integrations',
        label: 'Integrations',
        path: '/integrations',
        moduleId: 'integrations',
        iconKey: 'integrations',
        group: 'system',
        sortOrder: 3,
        allowedRoles: ['developer', 'admin'],
      },
      {
        id: 'ai-settings',
        label: 'AI Settings',
        path: '/ai-settings',
        moduleId: 'ai-settings',
        iconKey: 'ai-settings',
        group: 'system',
        sortOrder: 4,
        allowedRoles: ['developer', 'admin'],
      },
      {
        id: 'logs',
        label: 'Logs',
        path: '/logs',
        moduleId: 'logs',
        iconKey: 'logs',
        group: 'system',
        sortOrder: 5,
        allowedRoles: ['developer', 'admin'],
      },
    ],
  },
];

// Flatten all navigation items
export function getAllNavigationItems(): NavigationItemConfig[] {
  return navigationConfig.flatMap((group) => group.items);
}

// Get navigation items visible to a specific role
export function getNavigationItemsByRole(role: AppRole): NavigationItemConfig[] {
  return getAllNavigationItems().filter((item) => {
    if (!item.allowedRoles) return true;
    return item.allowedRoles.includes(role);
  });
}

