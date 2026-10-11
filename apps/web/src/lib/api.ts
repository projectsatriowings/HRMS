import { AuthSuccessResponse, AuthUserResponse } from '@hrms/shared-types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

/**
 * Helper to read non-HttpOnly CSRF cookie in browser
 */
function getCsrfTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)hrms_csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public details?: any,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Unified API fetch wrapper automatically configuring credentials and CSRF tokens
 */
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Double Submit Cookie pattern: Attach X-CSRF-Token for mutating methods
  const method = (options.method || 'GET').toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrfToken = getCsrfTokenFromCookie();
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken);
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Ensures HttpOnly cookies are transmitted
  });

  if (response.status === 204) {
    return {} as T;
  }

  let data: any;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMessage =
      (typeof data === 'object' && data?.message) ||
      (typeof data === 'string' && data) ||
      `Request failed with status ${response.status}`;

    throw new ApiError(response.status, Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage, data);
  }

  return data as T;
}

export const authApi = {
  login: (credentials: { email: string; password: string; companyId?: string }) =>
    apiFetch<AuthSuccessResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  getMe: () => apiFetch<AuthUserResponse>('/auth/me', { method: 'GET' }),

  switchCompany: (companyId: string) =>
    apiFetch<AuthSuccessResponse>('/auth/switch-company', {
      method: 'POST',
      body: JSON.stringify({ companyId }),
    }),

  logout: () =>
    apiFetch<{ success: boolean; message: string }>('/auth/logout', {
      method: 'POST',
    }),
};

export const directoryApi = {
  getEmployees: () => apiFetch<any[]>('/directory/employees', { method: 'GET' }),
  getEmployee: (id: string) => apiFetch<any>(`/directory/employees/${id}`, { method: 'GET' }),
  getCompanySettings: () => apiFetch<any>('/directory/company-settings', { method: 'GET' }),
  approveLeave: (leaveRequestId: string) =>
    apiFetch<any>(`/directory/leave-requests/${leaveRequestId}/approve`, {
      method: 'POST',
    }),
};
