import axios from 'axios';

const API_URL = 'http://localhost:3000';

const api = axios.create({
    baseURL: API_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

let isLoggingOut = false;

// Auto-logout on 401 to avoid stuck invalid tokens
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error?.response?.status === 401) {
            const requestUrl = error?.config?.url ?? '';
            // Allow login errors to surface (wrong credentials) instead of reloading
            if (requestUrl.includes('/auth/login')) {
                return Promise.reject(error);
            }

            // Log once; let caller decide how to handle (no auto reload)
            if (!isLoggingOut) {
                isLoggingOut = true;
                console.error('401 from API:', error?.response?.data);
            }
        }
        return Promise.reject(error);
    }
);

export const authAPI = {
    login: (username: string, password: string) =>
        api.post('/auth/login', { username, password }),
    getProfile: () => api.get('/auth/me'),
};

export const productsAPI = {
    getAll: (params?: Record<string, unknown>) => api.get('/products', { params }),
    getOne: (id: string) => api.get(`/products/${id}`),
    create: (data: any) => api.post('/products', data),
    update: (id: string, data: any) => api.put(`/products/${id}`, data),
    delete: (id: string) => api.delete(`/products/${id}`),
};

export const categoriesAPI = {
    getAll: () => api.get('/categories'),
    getOne: (id: string) => api.get(`/categories/${id}`),
    create: (data: any) => api.post('/categories', data),
    update: (id: string, data: any) => api.put(`/categories/${id}`, data),
    delete: (id: string) => api.delete(`/categories/${id}`),
};

export const warehousesAPI = {
    getAll: () => api.get('/warehouses'),
    getOne: (id: string) => api.get(`/warehouses/${id}`),
    create: (data: any) => api.post('/warehouses', data),
    update: (id: string, data: any) => api.put(`/warehouses/${id}`, data),
    delete: (id: string) => api.delete(`/warehouses/${id}`),
};

export const customersAPI = {
    getAll: () => api.get('/customers'),
    getOne: (id: string) => api.get(`/customers/${id}`),
    create: (data: any) => api.post('/customers', data),
    update: (id: string, data: any) => api.put(`/customers/${id}`, data),
    delete: (id: string) => api.delete(`/customers/${id}`),
    getOrders: (id: string) => api.get(`/customers/${id}/orders`),
    getDebts: (id: string) => api.get(`/customers/${id}/debts`),
};

export const suppliersAPI = {
    getAll: () => api.get('/suppliers'),
    getOne: (id: string) => api.get(`/suppliers/${id}`),
    create: (data: any) => api.post('/suppliers', data),
    update: (id: string, data: any) => api.put(`/suppliers/${id}`, data),
    delete: (id: string) => api.delete(`/suppliers/${id}`),
};

export const inventoryAPI = {
    getStock: (params?: Record<string, unknown>) => api.get('/inventory/stock', { params }),
    adjustStock: (data: {
        warehouseId: string;
        productId: string;
        quantity: number;
        type: 'IMPORT' | 'EXPORT' | 'ADJUST';
        note?: string;
    }) => api.post('/inventory/adjust', data),
    getMovements: (params?: Record<string, unknown>) => api.get('/inventory/movements', { params }),
};

export const dashboardAPI = {
    getStats: (params?: Record<string, unknown>) => api.get('/dashboard/stats', { params }),
    getRevenueChart: (params?: Record<string, unknown>) => api.get('/dashboard/revenue-chart', { params }),
    getTopProducts: (params?: Record<string, unknown>) => api.get('/dashboard/top-products', { params }),
    getTopCustomers: (params?: Record<string, unknown>) => api.get('/dashboard/top-customers', { params }),
    getRecentActivities: () => api.get('/dashboard/recent-activities'),
};

export const salesAPI = {
    create: (data: {
        customerId?: string;
        warehouseId?: string;
        items: { productId: string; quantity: number; unitPrice?: number; discount?: number }[];
        payment?: { amount: number; method?: string; reference?: string };
        discountAmount?: number;
        note?: string;
    }) => api.post('/sales', data),
    getAll: (params?: Record<string, unknown>) => api.get('/sales', { params }),
    getOne: (id: string) => api.get(`/sales/${id}`),
    returnOrder: (id: string, note?: string) => api.post(`/sales/${id}/return`, { note }),
};

export const purchasesAPI = {
    create: (data: {
        supplierId: string;
        warehouseId?: string;
        items: { productId: string; quantity: number; unitCost: number }[];
        note?: string;
    }) => api.post('/purchases', data),
    getAll: (params?: Record<string, unknown>) => api.get('/purchases', { params }),
    getOne: (id: string) => api.get(`/purchases/${id}`),
    confirm: (id: string) => api.post(`/purchases/${id}/confirm`),
    cancel: (id: string) => api.post(`/purchases/${id}/cancel`),
};

export default api;
