import { apiClient } from '../../lib/api-client';
import type {
  CompanyPermission,
  CompanyRole,
  CreateCompanyRoleInput,
} from '../contracts';

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function unwrapItems(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  const payload = toRecord(value);
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  if (Array.isArray(payload.results)) {
    return payload.results;
  }

  return [];
}

function mapPermission(value: unknown): CompanyPermission | null {
  const payload = toRecord(value);
  if (!payload) {
    return null;
  }

  const code = readString(payload.code);
  if (!code) {
    return null;
  }

  return {
    id: readString(payload.id) || code,
    code,
    module: readString(payload.module) || code.split('.')[0] || 'other',
    label: readString(payload.label) || code,
  };
}

function mapRole(value: unknown): CompanyRole | null {
  const payload = toRecord(value);
  if (!payload) {
    return null;
  }

  const id = readString(payload.id);
  const name = readString(payload.name);
  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    company: readString(payload.company) || null,
    is_system: payload.is_system === true,
    permissions: Array.isArray(payload.permissions)
      ? payload.permissions.map(readString).filter(Boolean)
      : [],
  };
}

export const companyAccessService = {
  async listPermissions(): Promise<CompanyPermission[]> {
    const { data } = await apiClient.get<unknown>('/api/permissions/');
    return unwrapItems(data)
      .map(mapPermission)
      .filter((item): item is CompanyPermission => item !== null);
  },

  async listRoles(): Promise<CompanyRole[]> {
    const { data } = await apiClient.get<unknown>('/api/roles/');
    return unwrapItems(data)
      .map(mapRole)
      .filter((item): item is CompanyRole => item !== null);
  },

  async createRole(input: CreateCompanyRoleInput): Promise<CompanyRole> {
    const { data } = await apiClient.post<unknown>('/api/roles/', {
      name: input.name.trim(),
      permissions: input.permissions,
    });
    const payload = toRecord(data);
    const role = mapRole(payload?.data ?? data);

    if (!role) {
      throw new Error('Invalid company role response.');
    }

    return role;
  },
};
