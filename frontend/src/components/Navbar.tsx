import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Ticket, User as UserIcon, LogOut, LogIn, ShieldCheck, Sliders } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useQueueStore } from '../store/queueStore';
import { AuthModal } from './AuthModal';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { admissionToken, status } = useQueueStore();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo */}
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-surge-cyan flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform">
                <Ticket className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  Ticket<span className="text-brand-400">Flow</span>
                </span>
                <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-full bg-brand-900/60 text-brand-300 border border-brand-700/50">
                  Flash Sale Engine
                </span>
              </div>
            </Link>

            {/* Right Navigation & Status Indicators */}
            <div className="flex items-center space-x-4">
              {/* Admission Status Badge if Admitted */}
              {admissionToken && status === 'ADMITTED' && (
                <div className="hidden md:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-surge-emerald/10 border border-surge-emerald/30 text-surge-emerald text-xs font-medium animate-pulse">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Admitted to Checkout</span>
                </div>
              )}

              {/* Auth State */}
              {isAuthenticated && user ? (
                <div className="flex items-center space-x-3">
                  {user.role === 'ROLE_ADMIN' && (
                    <Link
                      to="/admin"
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white text-xs font-bold shadow-md shadow-amber-600/25 transition-all"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Command Center</span>
                    </Link>
                  )}

                  <Link
                    to="/login"
                    className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-sm hover:border-brand-500/50 transition-colors"
                  >
                    <UserIcon className="w-4 h-4 text-brand-400" />
                    <span className="font-medium text-slate-200">{user.email}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-900/80 text-brand-300 uppercase font-semibold">
                      {user.role.replace('ROLE_', '')}
                    </span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link
                    to="/login"
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 font-medium text-xs flex items-center space-x-1.5 transition-all"
                  >
                    <LogIn className="w-3.5 h-3.5 text-brand-400" />
                    <span>Sign In Page</span>
                  </Link>
                  <button
                    onClick={() => setIsAuthOpen(true)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold text-xs shadow-md shadow-brand-500/20 flex items-center space-x-1.5 transition-all"
                  >
                    <span>Sign In / Register</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
};
