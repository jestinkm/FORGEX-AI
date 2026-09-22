import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';
import { useQueueStore } from '../store/queueStore';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request Interceptor: attach Auth & Admission Tokens
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const authToken = useAuthStore.getState().token;
    if (authToken && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }

    const admissionToken = useQueueStore.getState().admissionToken;
    if (admissionToken && !config.headers['X-Admission-Token']) {
      config.headers['X-Admission-Token'] = admissionToken;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: handle 429 Rate Limiting and 401/403 Edge Cases
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 429) {
      const retryAfterHeader = error.response.headers['retry-after'];
      const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 2;

      // Dispatch global rate limit event for UI toast/modal
      window.dispatchEvent(
        new CustomEvent('app:rate-limited', {
          detail: {
            retryAfter,
            message: (error.response.data as any)?.message || 'Too many requests. Please slow down.',
          },
        })
      );
    } else if (error.response?.status === 401) {
      // Clear expired auth session
      useAuthStore.getState().logout();
    } else if (error.response?.status === 403) {
      const errorMsg = (error.response.data as any)?.message || '';
      if (errorMsg.toLowerCase().includes('admission') || errorMsg.toLowerCase().includes('waiting room')) {
        // Admission token expired or missing
        useQueueStore.getState().clearQueue();
        window.dispatchEvent(new CustomEvent('app:admission-expired'));
      }
    }

    return Promise.reject(error);
  }
);
