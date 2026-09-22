import { useEffect, useRef, useState, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useQueueStore } from '../store/queueStore';
import { useAuthStore } from '../store/authStore';
import { queueApi } from '../api/endpoints';
import { ConnectionStatus, QueueStatusResponse } from '../types';

interface UseQueueSocketProps {
  eventId: string;
  onAdmitted?: (token: string) => void;
  enabled?: boolean;
}

export function useQueueSocket({ eventId, onAdmitted, enabled = true }: UseQueueSocketProps) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('reconnecting');
  const stompClientRef = useRef<Client | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  const pollingTimerRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const { user } = useAuthStore();
  const { setQueueState, setAdmissionToken } = useQueueStore();

  // Throttled UI state updater (prevents excessive re-renders under socket churn)
  const handleQueueUpdate = useCallback((statusData: QueueStatusResponse) => {
    const now = Date.now();
    // Allow immediate update if status changed to ADMITTED or throttled by 500ms
    if (statusData.status === 'ADMITTED' || now - lastUpdateRef.current > 500) {
      lastUpdateRef.current = now;

      setQueueState({
        eventId,
        queuePosition: statusData.queuePosition,
        queueDepth: statusData.queueDepth,
        estimatedWaitSeconds: statusData.estimatedWaitSeconds,
        status: statusData.status,
        admissionToken: statusData.admissionToken,
      });

      if (statusData.status === 'ADMITTED' && statusData.admissionToken) {
        setAdmissionToken(eventId, statusData.admissionToken);
        if (onAdmitted) {
          onAdmitted(statusData.admissionToken);
        }
      }
    }
  }, [eventId, onAdmitted, setQueueState, setAdmissionToken]);

  // Fallback Polling Mechanism with exponential jitter backoff
  const startPollingFallback = useCallback(() => {
    setConnectionStatus('polling');

    const poll = async () => {
      try {
        const data = await queueApi.getStatus(eventId);
        handleQueueUpdate(data);

        if (data.status !== 'ADMITTED') {
          // Poll every 1.5 - 2.5 seconds
          const delay = 1500 + Math.random() * 1000;
          pollingTimerRef.current = window.setTimeout(poll, delay);
        }
      } catch (err) {
        // Exponential backoff on failure (4s)
        pollingTimerRef.current = window.setTimeout(poll, 4000);
      }
    };

    poll();
  }, [eventId, handleQueueUpdate]);

  useEffect(() => {
    if (!enabled || !eventId || !user) return;

    let isSubscribed = true;
    const wsBaseUrl = import.meta.env.VITE_WS_BASE_URL || 'http://localhost:8080/ws/queue';

    // Tier 1: Initialize STOMP WebSocket Client
    try {
      const client = new Client({
        webSocketFactory: () => new SockJS(wsBaseUrl),
        reconnectDelay: 3000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        onConnect: () => {
          if (!isSubscribed) return;
          setConnectionStatus('connected');

          // Subscribe to personalized queue updates
          const topic = `/topic/queue/${eventId}/${user.id}`;
          client.subscribe(topic, (message) => {
            try {
              const payload: QueueStatusResponse = JSON.parse(message.body);
              handleQueueUpdate(payload);
            } catch (e) {
              console.error('Failed parsing socket payload', e);
            }
          });
        },
        onStompError: (frame) => {
          console.warn('STOMP protocol error:', frame.headers['message']);
          setConnectionStatus('reconnecting');
        },
        onWebSocketClose: () => {
          if (!isSubscribed) return;
          setConnectionStatus('reconnecting');
          // Switch to SSE or polling if WS cannot maintain connection
          if (!sseRef.current && !pollingTimerRef.current) {
            startPollingFallback();
          }
        },
      });

      client.activate();
      stompClientRef.current = client;
    } catch (e) {
      console.warn('WebSocket initiation failed, falling back to SSE/Polling', e);
      startPollingFallback();
    }

    // Immediate initial status check
    queueApi.getStatus(eventId)
      .then(handleQueueUpdate)
      .catch(() => setConnectionStatus('offline'));

    return () => {
      isSubscribed = false;
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
        stompClientRef.current = null;
      }
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    };
  }, [eventId, user, enabled, handleQueueUpdate, startPollingFallback]);

  return { connectionStatus };
}
