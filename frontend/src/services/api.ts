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
    bulkImport: (data: { items: any[]; warehouseId?: string }) => api.post('/products/bulk', data),
    testBulk: (data: { items: any[] }) => api.post('/products/test-bulk', data),
    export: (params?: Record<string, unknown>) => api.get('/products/export', { params }),
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

export const storesAPI = {
    getAll: (params?: Record<string, unknown>) => api.get('/stores', { params }),
    getOne: (id: string) => api.get(`/stores/${id}`),
    create: (data: any) => api.post('/stores', data),
    update: (id: string, data: any) => api.put(`/stores/${id}`, data),
    delete: (id: string) => api.delete(`/stores/${id}`),
};

export const priceListsAPI = {
    getAll: () => api.get('/price-lists'),
    getOne: (id: string) => api.get(`/price-lists/${id}`),
    create: (data: any) => api.post('/price-lists', data),
    update: (id: string, data: any) => api.put(`/price-lists/${id}`, data),
    delete: (id: string) => api.delete(`/price-lists/${id}`),
    getProducts: (id: string) => api.get(`/price-lists/${id}/products`),
    setProductPrice: (data: { productId: string; priceListId: string; price: number }) =>
        api.post('/price-lists/product-price', data),
    bulkSetPrices: (id: string, prices: Array<{ productId: string; price: number }>) =>
        api.post(`/price-lists/${id}/bulk-prices`, { prices }),
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
    getAll: (params?: Record<string, unknown>) => api.get('/suppliers', { params }),
    getOne: (id: string) => api.get(`/suppliers/${id}`),
    create: (data: any) => api.post('/suppliers', data),
    update: (id: string, data: any) => api.put(`/suppliers/${id}`, data),
    delete: (id: string) => api.delete(`/suppliers/${id}`),
};

export const inventoryAPI = {
    getStock: (params?: Record<string, unknown>) => api.get('/inventory/stock', { params }),
    getReport: (params?: {
        fromDate?: string;
        toDate?: string;
        warehouseId?: string;
        storeId?: string;
        search?: string;
        page?: number;
        limit?: number;
    }) => api.get('/inventory/report', { params }),
    adjustStock: (data: {
        warehouseId: string;
        productId: string;
        quantity: number;
        type: 'IMPORT' | 'EXPORT' | 'ADJUST';
        note?: string;
        storeId?: string;
    }) => api.post('/inventory/adjust', data),
    bulkAdjust: (data: {
        items: {
            productCode: string;
            productName?: string;
            warehouseId: string;
            quantity: number;
            type: 'IMPORT' | 'EXPORT' | 'ADJUST';
            note?: string;
            storeId?: string;
        }[];
    }) => api.post('/inventory/bulk', data),
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
    update: (id: string, data: {
        supplierId?: string;
        warehouseId?: string;
        items?: { productId: string; quantity: number; unitCost: number }[];
        note?: string;
    }) => api.put(`/purchases/${id}`, data),
    delete: (id: string) => api.delete(`/purchases/${id}`),
    confirm: (id: string) => api.post(`/purchases/${id}/confirm`),
    cancel: (id: string) => api.post(`/purchases/${id}/cancel`),
    export: (params?: Record<string, unknown>) => api.get('/purchases/export', { params }),
};

export const invoicesAPI = {
    getAll: (params?: Record<string, unknown>) => api.get('/invoices', { params }),
    getOne: (id: string) => api.get(`/invoices/${id}`),
    create: (data: any) => api.post('/invoices', data),
    bulkCreate: (data: any[]) => api.post('/invoices/bulk', data),
    update: (id: string, data: any) => api.put(`/invoices/${id}`, data),
    delete: (id: string) => api.delete(`/invoices/${id}`),
    getFilterOptions: () => api.get('/invoices/filter-options'),
};

export default api;
