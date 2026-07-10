export interface CompanyPermission {
  id: string;
  code: string;
  module: string;
  label: string;
}

export interface CompanyRole {
  id: string;
  name: string;
  company: string | null;
  is_system: boolean;
  permissions: string[];
}

export interface CreateCompanyRoleInput {
  name: string;
  permissions: string[];
}
