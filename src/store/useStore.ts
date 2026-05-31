import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: any | null;
  token: string | null;
  shopDetails: any | null;
  language: 'en' | 'fr' | 'ar';
  setAuth: (user: any, token: string) => void;
  logout: () => void;
  setLanguage: (lang: 'en' | 'fr' | 'ar') => void;
  setShopDetails: (details: any) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      shopDetails: null,
      language: 'fr',
      setAuth: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
      setLanguage: (language) => set({ language }),
      setShopDetails: (shopDetails) => set({ shopDetails }),
    }),
    {
      name: 'pos-auth-storage',
    }
  )
);

export const useStore = create((set) => ({
  isSidebarOpen: false,
  toggleSidebar: () => set((state: any) => ({ isSidebarOpen: !state.isSidebarOpen })),
  closeSidebar: () => set({ isSidebarOpen: false }),
}));
