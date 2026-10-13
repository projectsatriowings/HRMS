'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Building2,
  CheckCircle2,
  Loader2,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../../context/auth-context';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, login, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isExpired = searchParams.get('expired') === 'true';

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (user && !isLoading) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillTestAccount = (testEmail: string) => {
    setEmail(testEmail);
    setPassword('Password123!');
    setErrorMessage(null);
  };

  return (
    <div className="w-full max-w-md space-y-8">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider hover:bg-indigo-500/20 transition"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          HRMS Multi-Tenant Core
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Sign In to Portal
        </h1>
        <p className="text-sm text-slate-400">
          Enter your authorized organization credentials to access your workspace.
        </p>
      </div>

      {/* Session Expired Alert */}
      {isExpired && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Session Expired</p>
            <p className="text-xs text-amber-200/80 mt-0.5">
              Your security session has expired. Please authenticate again to continue.
            </p>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Authentication Error</p>
            <p className="text-xs text-rose-200/80 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Login Card */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300" htmlFor="email">
              Work Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Password input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-slate-300" htmlFor="password">
                Password
              </label>
              <span className="text-xs text-slate-500 cursor-not-allowed" title="Self-service reset pending verified email service">
                Forgot password?
              </span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-11 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition duration-200"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying Credentials...
              </>
            ) : (
              <>
                Sign In to Account
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security badges */}
        <div className="pt-4 border-t border-slate-800/80 space-y-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>HttpOnly SameSite cookies · CSRF protected</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Brute-force login rate limiting (5 attempts/min)</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Server-verified multi-tenant context isolation</span>
          </div>
        </div>
      </div>

      {/* Quick Fill Testing Assist */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-semibold text-slate-300">
            <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
            Test Account Presets (Development):
          </div>
          <span className="text-[11px] text-indigo-300 font-mono bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
            PW: Password123!
          </span>
        </div>
        <p className="text-[11px] text-slate-400">
          Click any preset to auto-fill email and test password:
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => handleFillTestAccount('priya.hr@acme-example.test')}
            className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-500/50 text-left text-slate-300 transition group"
          >
            <span className="block font-medium text-white group-hover:text-indigo-300">Acme HR Admin</span>
            <span className="block text-[10px] text-slate-400 font-mono truncate">priya.hr@...</span>
          </button>
          <button
            type="button"
            onClick={() => handleFillTestAccount('rajesh.manager@acme-example.test')}
            className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-500/50 text-left text-slate-300 transition group"
          >
            <span className="block font-medium text-white group-hover:text-indigo-300">Acme Manager</span>
            <span className="block text-[10px] text-slate-400 font-mono truncate">rajesh.manager@...</span>
          </button>
          <button
            type="button"
            onClick={() => handleFillTestAccount('ananya.dev@acme-example.test')}
            className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-500/50 text-left text-slate-300 transition group"
          >
            <span className="block font-medium text-white group-hover:text-indigo-300">Acme Employee</span>
            <span className="block text-[10px] text-slate-400 font-mono truncate">ananya.dev@...</span>
          </button>
          <button
            type="button"
            onClick={() => handleFillTestAccount('neha.consultant@example.test')}
            className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-500/50 text-left text-slate-300 transition group"
          >
            <span className="block font-medium text-white group-hover:text-indigo-300">Multi-Tenant User</span>
            <span className="block text-[10px] text-slate-400 font-mono truncate">neha.consultant@...</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 bg-radial-glow flex flex-col justify-center items-center px-4 py-12 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="text-slate-400">Loading sign in portal...</div>}>
        <LoginFormContent />
      </Suspense>
    </main>
  );
}
