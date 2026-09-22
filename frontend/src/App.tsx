import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navbar } from './components/Navbar';
import { RateLimitModal } from './components/RateLimitModal';
import { AdmissionExpiredModal } from './components/AdmissionExpiredModal';

// Code-split route components for rapid initial bundle loading
const EventPage = lazy(() => import('./pages/EventPage').then((m) => ({ default: m.EventPage })));
const WaitingRoomPage = lazy(() => import('./pages/WaitingRoomPage').then((m) => ({ default: m.WaitingRoomPage })));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })));
const PaymentPage = lazy(() => import('./pages/PaymentPage').then((m) => ({ default: m.PaymentPage })));
const ConfirmationPage = lazy(() => import('./pages/ConfirmationPage').then((m) => ({ default: m.ConfirmationPage })));
const SoldOutPage = lazy(() => import('./pages/SoldOutPage').then((m) => ({ default: m.SoldOutPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
          <Navbar />

          <main className="flex-1">
            <Suspense
              fallback={
                <div className="flex items-center justify-center min-h-[70vh]">
                  <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                </div>
              }
            >
              <Routes>
                <Route path="/" element={<EventPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="/events/:id" element={<EventPage />} />
                <Route path="/waiting-room/:eventId" element={<WaitingRoomPage />} />
                <Route path="/checkout/:eventId" element={<CheckoutPage />} />
                <Route path="/payment/:orderId" element={<PaymentPage />} />
                <Route path="/confirmation/:orderId" element={<ConfirmationPage />} />
                <Route path="/sold-out" element={<SoldOutPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </main>

          {/* Global Modals */}
          <RateLimitModal />
          <AdmissionExpiredModal />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
