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

export const authAPI = {
    login: (username: string, password: string) =>
        api.post('/auth/login', { username, password }),
    getProfile: () => api.get('/auth/profile'),
};

export const productsAPI = {
    getAll: () => api.get('/products'),
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
    importFromExcel: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/categories/import', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
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
};

export const suppliersAPI = {
    getAll: () => api.get('/suppliers'),
    getOne: (id: string) => api.get(`/suppliers/${id}`),
    create: (data: any) => api.post('/suppliers', data),
    update: (id: string, data: any) => api.put(`/suppliers/${id}`, data),
    delete: (id: string) => api.delete(`/suppliers/${id}`),
};

export default api;
