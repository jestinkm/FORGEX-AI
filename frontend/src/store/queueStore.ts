import { create } from 'zustand';

interface QueueState {
  eventId: string | null;
  queuePosition: number | null;
  queueDepth: number;
  estimatedWaitSeconds: number | null;
  status: 'IDLE' | 'WAITING' | 'ADMITTED' | 'NOT_IN_QUEUE';
  admissionToken: string | null;

  setQueueState: (data: {
    eventId: string;
    queuePosition: number | null;
    queueDepth: number;
    estimatedWaitSeconds: number | null;
    status: 'IDLE' | 'WAITING' | 'ADMITTED' | 'NOT_IN_QUEUE';
    admissionToken?: string | null;
  }) => void;

  setAdmissionToken: (eventId: string, token: string) => void;
  clearQueue: () => void;
}

export const useQueueStore = create<QueueState>((set) => ({
  eventId: sessionStorage.getItem('tf_admission_event'),
  queuePosition: null,
  queueDepth: 0,
  estimatedWaitSeconds: null,
  status: sessionStorage.getItem('tf_admission_token') ? 'ADMITTED' : 'IDLE',
  admissionToken: sessionStorage.getItem('tf_admission_token'),

  setQueueState: (data) => {
    if (data.admissionToken) {
      sessionStorage.setItem('tf_admission_token', data.admissionToken);
      sessionStorage.setItem('tf_admission_event', data.eventId);
    }
    set((state) => ({
      ...state,
      eventId: data.eventId,
      queuePosition: data.queuePosition,
      queueDepth: data.queueDepth,
      estimatedWaitSeconds: data.estimatedWaitSeconds,
      status: data.status,
      admissionToken: data.admissionToken !== undefined ? data.admissionToken : state.admissionToken,
    }));
  },

  setAdmissionToken: (eventId: string, token: string) => {
    // Stored in sessionStorage per specifications so it clears on tab close
    sessionStorage.setItem('tf_admission_token', token);
    sessionStorage.setItem('tf_admission_event', eventId);
    set({
      eventId,
      admissionToken: token,
      status: 'ADMITTED',
      queuePosition: 0,
    });
  },

  clearQueue: () => {
    sessionStorage.removeItem('tf_admission_token');
    sessionStorage.removeItem('tf_admission_event');
    set({
      eventId: null,
      queuePosition: null,
      queueDepth: 0,
      estimatedWaitSeconds: null,
      status: 'IDLE',
      admissionToken: null,
    });
  },
}));
