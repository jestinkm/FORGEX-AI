import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, Mail, ArrowRight, AlertCircle, CheckCircle2, Ticket, ShieldCheck, LogOut } from 'lucide-react';
import { authApi } from '../api/endpoints';
import { useAuthStore } from '../store/authStore';

export const LoginPage: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const navigate = useNavigate();
  const { user, isAuthenticated, setAuth, logout } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (mode === 'login') {
        const res = await authApi.login(email, password);
        setAuth(res.token, { id: res.userId, email: res.email, name: res.name, role: res.role });
        if (res.role === 'ROLE_ADMIN') {
          setSuccessMsg('Admin credentials verified! Entering Operations Command Center...');
          setTimeout(() => navigate('/admin'), 600);
        } else {
          setSuccessMsg('Successfully logged in! Redirecting to events...');
          setTimeout(() => navigate('/'), 900);
        }
      } else {
        const res = await authApi.register(email, password, name);
        setAuth(res.token, { id: res.userId, email: res.email, name: res.name, role: res.role });
        setSuccessMsg('Account created successfully! Redirecting...');
        setTimeout(() => navigate('/'), 900);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Authentication failed. Please verify your credentials or server status.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-md w-full glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl relative">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-surge-cyan flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-brand-500/25">
            <Ticket className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {isAuthenticated ? 'Account Session Active' : mode === 'login' ? 'Sign In to TicketFlow' : 'Create an Account'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isAuthenticated
              ? 'You are already authenticated for high-concurrency flash sales.'
              : 'Join queues, purchase tickets with guaranteed anti-bot protection.'}
          </p>
        </div>

        {isAuthenticated && user ? (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">
                    {user.name ? `${user.name}` : user.email}
                  </div>
                  {user.name && (
                    <div className="text-xs text-slate-400">{user.email}</div>
                  )}
                  <div className="text-xs text-slate-400 flex items-center space-x-1.5 mt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-surge-emerald" />
                    <span>Role: <strong className="text-brand-300">{user.role}</strong></span>
                  </div>
                </div>
              </div>
            </div>

            {user.role === 'ROLE_ADMIN' && (
              <Link
                to="/admin"
                className="w-full py-3.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white shadow-lg shadow-amber-600/25 flex items-center justify-center space-x-2 transition-all text-center"
              >
                <span>Enter Operations Command Center</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/"
                className="py-3 px-4 rounded-xl font-semibold text-xs bg-slate-900 hover:bg-slate-800 border border-slate-750 text-white flex items-center justify-center space-x-1.5 transition-all text-center"
              >
                <span>View Storefront</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={logout}
                className="py-3 px-4 rounded-xl font-semibold text-xs bg-slate-900 hover:bg-slate-800 text-rose-300 border border-rose-900/40 hover:border-rose-700/60 flex items-center justify-center space-x-1.5 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Mode Switcher */}
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 mb-6">
              <button
                type="button"
                onClick={() => { setMode('login'); setErrorMsg(null); }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'login' ? 'bg-brand-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setErrorMsg(null); }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'register' ? 'bg-brand-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Register
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Priya Sharma / Alex Johnson"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-brand-500 focus:outline-none placeholder-slate-500"
                    />
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-brand-500 focus:outline-none placeholder-slate-500"
                  />
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-brand-500 focus:outline-none placeholder-slate-500"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white shadow-lg shadow-brand-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                <span>{isLoading ? 'Authenticating...' : mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Admin Security Portal Access */}
            <div className="mt-8 pt-6 border-t border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                  Administrator Portal
                </span>
                <span className="text-[10px] text-amber-400 font-mono flex items-center space-x-1">
                  <Lock className="w-3 h-3 inline" />
                  <span>Password Protected</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setEmail('admin@ticketflow.com');
                  setPassword('');
                  setErrorMsg('Admin Portal selected. Please enter your administrator password to authenticate.');
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-750 hover:border-amber-500/50 text-xs font-medium flex items-center justify-center space-x-2 transition-all shadow-sm"
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Switch to Admin Sign In (Requires Password)</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
