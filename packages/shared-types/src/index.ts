import { Role } from './enums';

export * from './enums';

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  environment: string;
  database: {
    status: 'connected' | 'disconnected' | 'not_configured';
    message?: string;
  };
}

export interface CompanySummary {
  id: string;
  slug: string;
  name: string;
  code?: string | null;
  timezone?: string;
}

export interface MembershipSummary {
  id: string;
  companyId: string;
  role: Role;
  company: CompanySummary;
}

export interface EmployeeBrief {
  id: string;
  employeeCode: string;
  designation: string;
  departmentName?: string | null;
  managerId?: string | null;
}

export interface AuthUserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  memberships: MembershipSummary[];
  activeCompany: CompanySummary | null;
  activeRole: Role | null;
  employeeProfile?: EmployeeBrief | null;
}

export interface AuthSuccessResponse {
  user: AuthUserResponse;
  csrfToken: string;
}

export interface SwitchCompanyDto {
  companyId: string;
}

export interface LoginDto {
  email: string;
  password: string;
  companyId?: string;
}
