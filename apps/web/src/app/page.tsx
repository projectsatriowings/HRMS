'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Database,
  Clock,
  Users,
  CheckCircle2,
  Server,
  Building2,
  CalendarCheck,
  ArrowRight,
  Terminal,
  Activity,
  Layers,
  Lock,
  LogIn,
  LayoutDashboard,
} from 'lucide-react';
import { useAuth } from '../context/auth-context';

interface HealthData {
  status: string;
  timestamp: string;
  uptime: number;
  environment: string;
  database: {
    status: string;
    message: string;
  };
}

export default function HomePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
        const res = await fetch(`${apiUrl}/health`);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        const data = await res.json();
        setHealth(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 bg-radial-glow px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header / Hero Section */}
        <header className="text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Milestone 2 Verified · Authentication & Multi-Tenant Isolation
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
            HRMS Multi-Tenant Platform
          </h1>
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-400">
            Enterprise-ready Human Resource Management System architected for Indian SMEs,
            featuring strict multi-tenant isolation, HttpOnly session cookies, CSRF defense, and audit trails.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            {user ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition duration-200"
              >
                <LayoutDashboard className="w-4 h-4" />
                Go to Workspace Dashboard ({user.activeRole})
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition duration-200"
              >
                <LogIn className="w-4 h-4" />
                Sign In to Enterprise Workspace
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 font-semibold text-sm border border-slate-800 transition duration-200"
            >
              <Lock className="w-4 h-4 text-emerald-400" />
              View Security & Tenant Controls
            </Link>
          </div>
        </header>

        {/* Live Service Status Banner */}
        <div className="glass-panel rounded-2xl p-6 shadow-xl border border-slate-800">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-600/20 rounded-xl text-indigo-400 border border-indigo-500/30">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Backend Health & Runtime Status</h2>
                <p className="text-sm text-slate-400">
                  NestJS API running on port 4000 · Next.js Web running on port 3000
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {loading ? (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-sm">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  Pinging API...
                </div>
              ) : health ? (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  API Healthy ({health.status.toUpperCase()})
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-300 text-sm">
                  <Server className="w-4 h-4" />
                  API Offline / Ready to start (`pnpm dev`)
                </div>
              )}
            </div>
          </div>

          {health && (
            <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-400">
              <div>
                <span className="block text-slate-500">Database Connection:</span>
                <span className="font-mono text-slate-200 capitalize">{health.database.status}</span>
              </div>
              <div>
                <span className="block text-slate-500">Environment:</span>
                <span className="font-mono text-slate-200">{health.environment}</span>
              </div>
              <div>
                <span className="block text-slate-500">Server Uptime:</span>
                <span className="font-mono text-slate-200">{Math.round(health.uptime)} seconds</span>
              </div>
              <div>
                <span className="block text-slate-500">Timestamp (UTC):</span>
                <span className="font-mono text-slate-200">{health.timestamp.slice(0, 19)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Core Architectural Pillars Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Multi-Tenancy */}
          <div className="glass-panel rounded-2xl p-6 space-y-4 hover:border-indigo-500/40 transition duration-300">
            <div className="p-3 w-fit rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Strict Multi-Tenant Isolation</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Every data record is scoped to a verified <code className="text-indigo-300">companyId</code>. Multi-layered defense enforces company membership, server-side authorization guards, and row-level scoping.
            </p>
            <ul className="text-xs text-slate-300 space-y-1.5 pt-2 border-t border-slate-800">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Server-derived tenant context (Zero client trust)
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Composite uniqueness per company
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> PII field-level privacy protection
              </li>
            </ul>
          </div>

          {/* Card 2: Configurable Attendance */}
          <div className="glass-panel rounded-2xl p-6 space-y-4 hover:border-indigo-500/40 transition duration-300">
            <div className="p-3 w-fit rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Configurable Attendance Engine</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Attendance rules are fully configurable per company. Server UTC clock establishes canonical timestamps converted to Indian Standard Time (IST, UTC+05:30).
            </p>
            <ul className="text-xs text-slate-300 space-y-1.5 pt-2 border-t border-slate-800">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Configurable working hours (Default 09:30–18:30)
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Configurable full/half day thresholds & weekly offs
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Extensible for future geofence/IP rules
              </li>
            </ul>
          </div>

          {/* Card 3: Cloud Database & Migrations */}
          <div className="glass-panel rounded-2xl p-6 space-y-4 hover:border-indigo-500/40 transition duration-300">
            <div className="p-3 w-fit rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Managed PostgreSQL & Migrations</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Designed for managed cloud PostgreSQL (Neon or Supabase). All schema changes are strictly versioned as SQL migrations—no accidental resets.
            </p>
            <ul className="text-xs text-slate-300 space-y-1.5 pt-2 border-t border-slate-800">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Initial migration <code className="text-cyan-300">20261010000000_init</code>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Pooled & direct migration connection targets
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 100% fictional test seed data for development
              </li>
            </ul>
          </div>
        </section>

        {/* Fictional Sandbox Data Preview */}
        <section className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
                <Building2 className="w-4 h-4" />
                Development Seed Sandbox
              </div>
              <h3 className="text-2xl font-bold text-white mt-1">Acme Innovations Pvt Ltd (ACME)</h3>
            </div>
            <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs rounded-full font-medium">
              Fictional Data Only · No Real Employee PII
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-400">HR Admin Account</span>
              <p className="font-semibold text-white mt-0.5">Priya Sharma</p>
              <p className="text-xs font-mono text-indigo-300">priya.hr@acme-example.test</p>
              <span className="inline-block mt-2 px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                ROLE: HR_ADMIN
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-400">Manager Account</span>
              <p className="font-semibold text-white mt-0.5">Rajesh Kumar</p>
              <p className="text-xs font-mono text-indigo-300">rajesh.manager@acme-example.test</p>
              <span className="inline-block mt-2 px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                ROLE: MANAGER
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-400">Employee Account</span>
              <p className="font-semibold text-white mt-0.5">Ananya Iyer</p>
              <p className="text-xs font-mono text-indigo-300">ananya.dev@acme-example.test</p>
              <span className="inline-block mt-2 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                ROLE: EMPLOYEE
              </span>
            </div>
          </div>
        </section>

        {/* Quick Start Terminal Guide */}
        <section className="glass-panel rounded-2xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <Terminal className="w-4 h-4" />
            Quick Start Guide for Milestone 1
          </div>
          <h3 className="text-xl font-bold text-white">How to Run & Connect Locally</h3>

          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 rounded-lg bg-black/60 border border-slate-800 text-slate-300">
              <span className="text-slate-500"># 1. Copy environment template and paste your Neon/Supabase DATABASE_URL:</span>
              <p className="text-emerald-400 mt-1">cp .env.example .env</p>
            </div>

            <div className="p-3 rounded-lg bg-black/60 border border-slate-800 text-slate-300">
              <span className="text-slate-500"># 2. Deploy initial migration and seed fictional data:</span>
              <p className="text-emerald-400 mt-1">pnpm db:migrate</p>
              <p className="text-emerald-400">pnpm db:seed</p>
            </div>

            <div className="p-3 rounded-lg bg-black/60 border border-slate-800 text-slate-300">
              <span className="text-slate-500"># 3. Start development servers concurrently:</span>
              <p className="text-emerald-400 mt-1">pnpm dev</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
