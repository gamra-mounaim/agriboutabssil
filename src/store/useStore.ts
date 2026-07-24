import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../services/apiService';
import { Product, Category, Customer, Supplier, Sale, CheckDoc, Payment, UserProfile, ActivityLog, Notification, DraftSale } from '../types';

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

interface AppState {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  
  products: Product[];
  categories: Category[];
  customers: Customer[];
  suppliers: Supplier[];
  sales: Sale[];
  checks: CheckDoc[];
  payments: Payment[];
  stats: any;
  appUsers: UserProfile[];
  activities: ActivityLog[];
  settings: any;
  notifications: Notification[];
  latestBackup: any;
  draftSales: DraftSale[];

  setMessage: (message: { text: string, type: 'success' | 'error' } | null) => void;
  message: { text: string, type: 'success' | 'error' } | null;

  fetchData: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;

  salesTotal: number;
  salesPage: number;
  fetchSalesPage: (page: number, search?: string) => Promise<void>;

  activitiesTotal: number;
  activitiesPage: number;
  fetchActivitiesPage: (page: number) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  isSidebarOpen: false,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  closeSidebar: () => set({ isSidebarOpen: false }),

  products: [],
  categories: [],
  customers: [],
  suppliers: [],
  sales: [],
  checks: [],
  payments: [],
  stats: null,
  appUsers: [],
  activities: [],
  settings: null,
  notifications: [],
  latestBackup: null,
  draftSales: [],
  message: null,

  setMessage: (message) => set({ message }),

  markNotificationRead: async (id: string) => {
    try {
      await api.markNotificationRead(id);
      set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id)
      }));
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  },

  salesTotal: 0,
  salesPage: 1,
  fetchSalesPage: async (page: number, search?: string) => {
    try {
      const res = await api.getSales(page, 50, search) as any;
      set({ sales: res.data || [], salesTotal: res.total || 0, salesPage: res.page || 1 });
    } catch (err) {
      console.error("Failed to fetch paginated sales", err);
    }
  },

  activitiesTotal: 0,
  activitiesPage: 1,
  fetchActivitiesPage: async (page: number) => {
    try {
      const user = useAuthStore.getState().user;
      const userId = user?.role !== 'admin' ? user?.id : undefined;
      const res = await api.getActivityLogs(page, 50, userId) as any;
      set({ activities: res.data || [], activitiesTotal: res.total || 0, activitiesPage: res.page || 1 });
    } catch (err) {
      console.error("Failed to fetch paginated activities", err);
    }
  },

  fetchData: async () => {
    const user = useAuthStore.getState().user;
    const userId = user?.role !== 'admin' ? user?.id : undefined;
    const fetchApi = async (fn: () => Promise<any>, fallback: any, name: string, retries = 3): Promise<any> => {
      try {
        return await fn();
      } catch (err: any) {
        if (err.name === 'AbortError') return fallback;
        const isNetworkError = err.message?.includes('Failed to fetch') || 
                               err.message?.includes('NetworkError') ||
                               err.message?.includes('status: 502') ||
                               err.message?.includes('status: 503') ||
                               err.message?.includes('status: 504');
        if (retries > 0 && isNetworkError) {
          console.warn(`Retrying fetch for ${name}... (${retries} retries left)`);
          await new Promise(r => setTimeout(r, 2000));
          return fetchApi(fn, fallback, name, retries - 1);
        }
        console.error(`Error fetching ${name}:`, err);
        return fallback;
      }
    };

    try {
      const [
        prods, cats, custs, supps, sls, cks, pymts, stts, usrs, logs, stngs, notes, latest, drafts
      ] = await Promise.all([
        fetchApi(api.getProducts, [], 'Products'),
        fetchApi(api.getCategories, [], 'Categories'),
        fetchApi(api.getCustomers, [], 'Customers'),
        fetchApi(api.getSuppliers, [], 'Suppliers'),
        fetchApi(() => api.getSales(1, 50), { data: [], total: 0, page: 1 }, 'Sales'),
        fetchApi(api.getChecks, [], 'Checks'),
        fetchApi(api.getPayments, [], 'Payments'),
        fetchApi(api.getStats, null, 'Stats'),
        fetchApi(api.getUsers, [], 'Users'),
        fetchApi(() => api.getActivityLogs(1, 50, userId), { data: [], total: 0, page: 1 }, 'Activity'),
        fetchApi(api.getSettings, null, 'Settings'),
        fetchApi(api.getNotifications, [], 'Notifications'),
        fetchApi(api.getLatestBackup, null, 'LatestBackup'),
        fetchApi(api.getDraftSales, [], 'Drafts')
      ]);

      set({
        products: Array.isArray(prods) ? prods : [],
        categories: Array.isArray(cats) ? cats : [],
        customers: Array.isArray(custs) ? custs : [],
        suppliers: Array.isArray(supps) ? supps : [],
        sales: sls?.data || [],
        salesTotal: sls?.total || 0,
        salesPage: sls?.page || 1,
        checks: Array.isArray(cks) ? cks : [],
        payments: Array.isArray(pymts) ? pymts : [],
        stats: stts,
        appUsers: Array.isArray(usrs) ? usrs : [],
        activities: logs?.data || [],
        activitiesTotal: logs?.total || 0,
        activitiesPage: logs?.page || 1,
        settings: stngs,
        notifications: Array.isArray(notes) ? notes : [],
        latestBackup: latest,
        draftSales: Array.isArray(drafts) ? drafts : []
      });
    } catch (e) {
      console.error("Critical Refresh Error:", e);
    }
  }
}));
