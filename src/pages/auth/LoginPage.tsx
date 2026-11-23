import React, { useState } from 'react';
import { School, Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, Building, Award } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/db/database';

export const LoginPage: React.FC = () => {
  const { login, loginAsUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const settings = db.getSettings();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your institutional credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Retain ONLY THREE demonstration accounts per requirements
  const demoAccounts = [
    {
      role: 'Admin / HOD',
      name: 'Dr. A.G. Nataraj',
      email: 'admin@portal.edu',
      desc: 'HOD & Professor, Computer Science & Engineering • Institution-wide analytics, regulations & audit logs',
      userId: 'user-amcec-admin',
      badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    },
    {
      role: 'Faculty Teacher',
      name: 'Prof. Sandhya S.',
      email: 'teacher@portal.edu',
      desc: 'Assistant Professor, Dept of CSE (Emp ID: FAC-CSE-028) • Timetable management, 1-click attendance & student roster',
      userId: 'user-amcec-teacher',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    },
    {
      role: 'Student (2022 Scheme)',
      name: 'Rahul M.',
      email: 'student@portal.edu',
      desc: 'Roll No: ENG22CS089 • 5th Semester, Section A, B.E. Computer Science & Engineering',
      userId: 'user-amcec-student',
      badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      {/* College Identity Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center space-y-2">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0f172a] text-white shadow-xl shadow-slate-900/20 mb-1 border-2 border-blue-500/30">
          <School className="w-8 h-8 text-blue-400" />
        </div>
        
        <div>
          <span className="text-[11px] font-bold tracking-widest uppercase text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
            College of Engineering & Technology
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-2">
            SMART ATTENDANCE & ACADEMIC PORTAL
          </h1>
          <p className="text-xs font-semibold text-slate-600 mt-0.5">
            Academic & Attendance Management System
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] text-slate-500 mt-2">
            <span>Autonomous Technical Institute</span>
            <span>•</span>
            <span>AICTE Approved</span>
            <span>•</span>
            <span>Faculty of Engineering</span>
          </div>
          <p className="text-[10px] text-slate-400 max-w-md mx-auto mt-0.5">
            University Campus, Bengaluru
          </p>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 sm:rounded-2xl sm:px-10">
          {error && (
            <div className="mb-6 rounded-lg bg-rose-50 border border-rose-200 p-4 text-xs text-rose-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <p className="font-semibold">Authentication Error</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Institutional Email Address
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@college.edu"
                  className="block w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <span className="text-[11px] text-slate-400 font-mono">Demo: password123</span>
              </div>
              <div className="relative rounded-lg shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#0f172a] hover:bg-slate-800 px-4 py-2.5 text-xs font-semibold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
            >
              {isSubmitting ? 'Verifying Credentials...' : 'Sign In to Academic Portal'}
              <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
            </button>
          </form>

          {/* Connected Demonstration Profiles */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Official Demonstration Accounts
              </span>
              <span className="text-[10px] text-slate-400">1-Click Fast Access</span>
            </div>

            <div className="space-y-2.5">
              {demoAccounts.map((account) => (
                <button
                  key={account.userId}
                  type="button"
                  onClick={() => loginAsUser(account.userId)}
                  className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 transition group flex items-start justify-between gap-3 bg-white"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${account.badgeClass}`}>
                        {account.role}
                      </span>
                      <span className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition">
                        {account.name}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">{account.desc}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{account.email}</p>
                  </div>
                  <div className="shrink-0 self-center">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                      Log in <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-6">
          Smart Attendance & Academic Management System • All Rights Reserved
        </p>
      </div>
    </div>
  );
};
