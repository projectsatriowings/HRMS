'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  Building2,
  Users,
  LogOut,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Briefcase,
  ChevronDown,
  Lock,
  Layers,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { directoryApi, ApiError } from '../../lib/api';
import { Role } from '@hrms/shared-types';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading, logout, switchCompany } = useAuth();

  const [employees, setEmployees] = useState<any[]>([]);
  const [companySettings, setCompanySettings] = useState<any | null>(null);
  const [dataLoading, setDataLoading] = useState<boolean>(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isSwitchingCompany, setIsSwitchingCompany] = useState<boolean>(false);

  // Protected route check
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login?expired=true');
    }
  }, [user, isLoading, router]);

  // Load tenant-scoped data
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        setDataLoading(true);
        setActionError(null);

        // Fetch employees within active tenant
        const empList = await directoryApi.getEmployees();
        setEmployees(empList);

        // If HR_ADMIN or OWNER, fetch company settings
        if (user.activeRole === Role.HR_ADMIN || user.activeRole === Role.OWNER) {
          try {
            const settings = await directoryApi.getCompanySettings();
            setCompanySettings(settings);
          } catch {
            setCompanySettings(null);
          }
        } else {
          setCompanySettings(null);
        }
      } catch (err: any) {
        setActionError(err.message || 'Failed to load tenant data');
      } finally {
        setDataLoading(false);
      }
    };

    loadData();
  }, [user]);

  const handleSwitchCompany = async (targetCompanyId: string) => {
    try {
      setIsSwitchingCompany(true);
      setActionError(null);
      setActionSuccess(null);
      await switchCompany(targetCompanyId);
      setActionSuccess('Active tenant context updated successfully.');
    } catch (err: any) {
      setActionError(err.message || 'Failed to switch tenant context.');
    } finally {
      setIsSwitchingCompany(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (isLoading || !user) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
          <span>Verifying active security session...</span>
        </div>
      </main>
    );
  }

  const roleBadgeColors: Record<string, string> = {
    OWNER: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
    HR_ADMIN: 'bg-purple-500/10 border-purple-500/30 text-purple-300',
    MANAGER: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
    EMPLOYEE: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
    PLATFORM_ADMIN: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 bg-radial-glow px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Navigation Bar */}
        <header className="glass-panel rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600/30 transition"
              title="Return to Home"
            >
              <ShieldCheck className="w-6 h-6" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">
                  {user.firstName} {user.lastName}
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    roleBadgeColors[user.activeRole || 'EMPLOYEE'] ||
                    'bg-slate-800 text-slate-300'
                  }`}
                >
                  {user.activeRole}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{user.email}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Multi-Company Tenant Switcher */}
            {user.memberships.length > 1 && (
              <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5">
                <Building2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <span className="text-xs text-slate-400">Switch Tenant:</span>
                <select
                  disabled={isSwitchingCompany}
                  value={user.activeCompany?.id || ''}
                  onChange={(e) => handleSwitchCompany(e.target.value)}
                  className="bg-transparent text-xs text-white font-medium focus:outline-none cursor-pointer"
                >
                  {user.memberships.map((m) => (
                    <option key={m.companyId} value={m.companyId} className="bg-slate-900 text-white">
                      {m.company.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700/80 transition"
            >
              <LogOut className="w-4 h-4 text-slate-400" />
              Sign Out
            </button>
          </div>
        </header>

        {/* Action Notifications */}
        {actionSuccess && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-300 text-sm">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {actionError && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Current Context Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Active Organization */}
          <div className="glass-panel rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
              <Building2 className="w-4 h-4" />
              Active Tenant Scoped
            </div>
            <h2 className="text-lg font-bold text-white">
              {user.activeCompany?.name || 'No Active Company'}
            </h2>
            <div className="space-y-1 text-xs text-slate-400">
              <p>
                <span className="text-slate-500">Company Code:</span>{' '}
                <span className="font-mono text-slate-300">{user.activeCompany?.code || 'N/A'}</span>
              </p>
              <p>
                <span className="text-slate-500">Timezone:</span>{' '}
                <span className="font-mono text-slate-300">{user.activeCompany?.timezone || 'Asia/Kolkata'}</span>
              </p>
              <p>
                <span className="text-slate-500">Tenant Isolation:</span>{' '}
                <span className="text-emerald-400 font-semibold">Strict Server Scoped</span>
              </p>
            </div>
          </div>

          {/* Card 2: Employee Profile Context */}
          <div className="glass-panel rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
              <Briefcase className="w-4 h-4" />
              Employee Identity Profile
            </div>
            <h2 className="text-lg font-bold text-white">
              {user.employeeProfile?.designation || `${user.activeRole} Profile`}
            </h2>
            <div className="space-y-1 text-xs text-slate-400">
              <p>
                <span className="text-slate-500">Employee Code:</span>{' '}
                <span className="font-mono text-slate-300">
                  {user.employeeProfile?.employeeCode || 'Leadership'}
                </span>
              </p>
              <p>
                <span className="text-slate-500">Department:</span>{' '}
                <span className="text-slate-300">
                  {user.employeeProfile?.departmentName || 'Executive'}
                </span>
              </p>
              <p>
                <span className="text-slate-500">Direct Manager:</span>{' '}
                <span className="text-slate-300">
                  {user.employeeProfile?.managerId ? 'Assigned' : 'Direct to Leadership'}
                </span>
              </p>
            </div>
          </div>

          {/* Card 3: Security & Session Diagnostics */}
          <div className="glass-panel rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
              <Lock className="w-4 h-4" />
              Session Protection Status
            </div>
            <h2 className="text-lg font-bold text-white">HttpOnly Security Enforced</h2>
            <div className="space-y-1 text-xs text-slate-400">
              <p>
                <span className="text-slate-500">Session Cookies:</span>{' '}
                <span className="text-emerald-400 font-medium">HttpOnly, SameSite=Lax</span>
              </p>
              <p>
                <span className="text-slate-500">CSRF Defense:</span>{' '}
                <span className="text-emerald-400 font-medium">Double-Submit Header Verified</span>
              </p>
              <p>
                <span className="text-slate-500">Brute-Force Guard:</span>{' '}
                <span className="text-emerald-400 font-medium">Throttler Rate Limited</span>
              </p>
            </div>
          </div>
        </div>

        {/* Company Settings Banner (HR Admin & Owner Exclusive) */}
        {companySettings && (
          <section className="glass-panel rounded-2xl p-6 sm:p-8 space-y-4 border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-400 text-xs font-semibold uppercase tracking-wider">
                <Clock className="w-4 h-4" />
                Administrative Policy Settings (HR Admin & Owner Scope)
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                POLICY CONFIDENTIAL
              </span>
            </div>
            <h2 className="text-xl font-bold text-white">Work Schedule & Attendance Policy</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                <span className="text-slate-500 block">Working Hours:</span>
                <span className="font-mono text-white font-semibold">
                  {companySettings.workDayStart} – {companySettings.workDayEnd}
                </span>
              </div>
              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                <span className="text-slate-500 block">Min Full-Day Hours:</span>
                <span className="font-mono text-white font-semibold">
                  {companySettings.fullDayMinHours}h
                </span>
              </div>
              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                <span className="text-slate-500 block">Grace Period:</span>
                <span className="font-mono text-white font-semibold">
                  {companySettings.gracePeriodMinutes} mins
                </span>
              </div>
              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                <span className="text-slate-500 block">Max Regularization:</span>
                <span className="font-mono text-white font-semibold">
                  {companySettings.maxRegularizationDays} days
                </span>
              </div>
            </div>
          </section>
        )}

        {/* Tenant Employee Directory (Scope Restricted View) */}
        <section className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
                <Users className="w-4 h-4" />
                Tenant Member Directory
              </div>
              <h2 className="text-2xl font-bold text-white mt-1">
                Employees in {user.activeCompany?.name}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Data strictly isolated to this company. Cross-tenant access is blocked at the database engine level.
              </p>
            </div>
            <div className="text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
              Showing {employees.length} record(s) in active tenant scope
            </div>
          </div>

          {dataLoading ? (
            <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
              Loading directory records...
            </div>
          ) : employees.length === 0 ? (
            <div className="p-8 text-center text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
              No employee records found in this company.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-3 font-semibold">Code</th>
                    <th className="pb-3 font-semibold">Name</th>
                    <th className="pb-3 font-semibold">Designation</th>
                    <th className="pb-3 font-semibold">Department</th>
                    <th className="pb-3 font-semibold">Official Email</th>
                    <th className="pb-3 font-semibold">Personal Phone (PII)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {employees.map((emp) => {
                    const isDirectReport =
                      user.activeRole === Role.MANAGER &&
                      emp.managerId === user.employeeProfile?.id;
                    const isSelf = emp.id === user.employeeProfile?.id;

                    return (
                      <tr key={emp.id} className="hover:bg-slate-900/50 transition">
                        <td className="py-3 font-mono text-indigo-300 font-medium">
                          {emp.employeeCode}
                        </td>
                        <td className="py-3 font-medium text-white">
                          {emp.firstName} {emp.lastName}
                          {isSelf && (
                            <span className="ml-2 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
                              You
                            </span>
                          )}
                          {isDirectReport && (
                            <span className="ml-2 px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px]">
                              Direct Report
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-slate-300">{emp.designation}</td>
                        <td className="py-3 text-slate-400">{emp.department || 'N/A'}</td>
                        <td className="py-3 font-mono text-slate-400">{emp.email}</td>
                        <td className="py-3 font-mono">
                          {emp.phone ? (
                            <span className="text-slate-300">{emp.phone}</span>
                          ) : (
                            <span className="text-slate-600 italic">
                              [Protected · Role Restricted]
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
