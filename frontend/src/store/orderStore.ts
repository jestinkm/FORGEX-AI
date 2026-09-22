import { create } from 'zustand';
import { HoldTicketResponse } from '../types';

interface OrderState {
  currentHold: HoldTicketResponse | null;
  setHold: (hold: HoldTicketResponse) => void;
  clearHold: () => void;
}

export const useOrderStore = create<OrderState>((set) => ({
  currentHold: null,

  setHold: (hold: HoldTicketResponse) => {
    set({ currentHold: hold });
  },

  clearHold: () => {
    set({ currentHold: null });
  },
}));
