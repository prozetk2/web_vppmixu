import { useState, useEffect, useCallback } from 'react';
import { productsAPI, categoriesAPI } from '../../services/api';
import Modal from '../shared/Modal';
import { Toast, useToast } from '../shared/Toast';
import Pagination from '../shared/Pagination';
import ProductForm from './ProductForm';
import './ProductList.css';

interface Product {
    id: string;
    name: string;
    sku?: string;
    categoryId?: string;
    category?: { id: string; name: string };
    defaultPrice: number;
    defaultCost?: number;
}

interface Category {
    id: string;
    name: string;
}

interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
}

export default function ProductList() {
    // Data state
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState<PaginationMeta>({
        page: 1,
        limit: 10,
        total: 0,
    });

    // Filter state
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Modal state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Toast
    const toast = useToast();

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPagination((prev) => ({ ...prev, page: 1 }));
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Fetch categories on mount
    useEffect(() => {
        fetchCategories();
    }, []);

    // Fetch products when filters change
    useEffect(() => {
        fetchProducts();
    }, [debouncedSearch, categoryFilter, pagination.page]);

    const fetchCategories = async () => {
        try {
            const response = await categoriesAPI.getAll();
            setCategories(response.data?.data || response.data || []);
        } catch (error) {
            console.error('Failed to fetch categories:', error);
        }
    };

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const response = await productsAPI.getAll({
                page: pagination.page,
                limit: pagination.limit,
                search: debouncedSearch || undefined,
                categoryId: categoryFilter || undefined,
            });

            const data = response.data;
            setProducts(data.data || []);
            if (data.meta) {
                setPagination((prev) => ({
                    ...prev,
                    total: data.meta.total,
                }));
            }
        } catch (error) {
            console.error('Failed to fetch products:', error);
            toast.error('Không thể tải danh sách sản phẩm');
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, debouncedSearch, categoryFilter]);

    const handleAdd = () => {
        setEditingProduct(null);
        setIsFormOpen(true);
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setIsFormOpen(true);
    };

    const handleDeleteClick = (product: Product) => {
        setDeletingProduct(product);
        setIsDeleteOpen(true);
    };

    const handleFormSubmit = async (formData: any) => {
        setIsSubmitting(true);
        try {
            if (editingProduct) {
                await productsAPI.update(editingProduct.id, {
                    name: formData.name,
                    barcode: formData.sku,
                    categoryId: formData.categoryId || null,
                    price: formData.defaultPrice,
                    cost: formData.defaultCost,
                });
                toast.success('Cập nhật sản phẩm thành công');
            } else {
                await productsAPI.create({
                    name: formData.name,
                    barcode: formData.sku,
                    categoryId: formData.categoryId || null,
                    price: formData.defaultPrice,
                    cost: formData.defaultCost,
                });
                toast.success('Thêm sản phẩm thành công');
            }
            setIsFormOpen(false);
            fetchProducts();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deletingProduct) return;

        setIsSubmitting(true);
        try {
            await productsAPI.delete(deletingProduct.id);
            toast.success('Xóa sản phẩm thành công');
            setIsDeleteOpen(false);
            setDeletingProduct(null);
            fetchProducts();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Không thể xóa sản phẩm');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePageChange = (page: number) => {
        setPagination((prev) => ({ ...prev, page }));
    };

    const formatCurrency = (value: unknown) => {
        const num =
            typeof value === 'number'
                ? value
                : typeof value === 'string'
                    ? Number(value)
                    : Number.NaN;

        if (!Number.isFinite(num)) return '—';
        return new Intl.NumberFormat('vi-VN').format(num) + ' ₫';
    };

    const totalPages = Math.ceil(pagination.total / pagination.limit);

    return (
        <div className="product-list">
            <Toast toasts={toast.toasts} onRemove={toast.removeToast} />

            {/* Toolbar */}
            <div className="product-toolbar">
                <div className="search-filter">
                    <div className="search-box">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo tên, SKU..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                        {searchTerm && (
                            <button
                                className="search-clear"
                                onClick={() => setSearchTerm('')}
                            >
                                ×
                            </button>
                        )}
                    </div>
                    <select
                        value={categoryFilter}
                        onChange={(e) => {
                            setCategoryFilter(e.target.value);
                            setPagination((prev) => ({ ...prev, page: 1 }));
                        }}
                        className="filter-select"
                    >
                        <option value="">Tất cả danh mục</option>
                        {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                                {cat.name}
                            </option>
                        ))}
                    </select>
                </div>
                <button onClick={handleAdd} className="btn-add">
                    <span>+</span> Thêm sản phẩm
                </button>
            </div>

            {/* Table */}
            <div className="product-table-wrapper">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner-large"></div>
                        <p>Đang tải dữ liệu...</p>
                    </div>
                ) : products.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📦</div>
                        <h3>Chưa có sản phẩm</h3>
                        <p>Bắt đầu thêm sản phẩm đầu tiên của bạn</p>
                        <button onClick={handleAdd} className="btn-add">
                            + Thêm sản phẩm
                        </button>
                    </div>
                ) : (
                    <table className="product-table">
                        <thead>
                            <tr>
                                <th>Tên sản phẩm</th>
                                <th>SKU</th>
                                <th>Danh mục</th>
                                <th className="text-right">Giá bán</th>
                                <th className="text-right">Giá vốn</th>
                                <th className="text-center">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((product) => (
                                <tr key={product.id}>
                                    <td className="product-name">{product.name}</td>
                                    <td className="product-sku">{product.sku || '—'}</td>
                                    <td>{product.category?.name || '—'}</td>
                                    <td className="text-right price">
                                        {formatCurrency(product.defaultPrice)}
                                    </td>
                                    <td className="text-right cost">
                                        {formatCurrency(product.defaultCost)}
                                    </td>
                                    <td className="text-center actions">
                                        <button
                                            className="btn-icon btn-edit"
                                            onClick={() => handleEdit(product)}
                                            title="Sửa"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            className="btn-icon btn-delete"
                                            onClick={() => handleDeleteClick(product)}
                                            title="Xóa"
                                        >
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            {products.length > 0 && (
                <Pagination
                    currentPage={pagination.page}
                    totalPages={totalPages}
                    totalItems={pagination.total}
                    itemsPerPage={pagination.limit}
                    onPageChange={handlePageChange}
                />
            )}

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                title={editingProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}
                size="md"
            >
                <ProductForm
                    product={editingProduct}
                    categories={categories}
                    onSubmit={handleFormSubmit}
                    onCancel={() => setIsFormOpen(false)}
                    isLoading={isSubmitting}
                />
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                title="Xác nhận xóa"
                size="sm"
            >
                <div className="confirm-dialog">
                    <p>
                        Bạn có chắc chắn muốn xóa sản phẩm{' '}
                        <strong>"{deletingProduct?.name}"</strong>?
                    </p>
                    <p className="warning-text">Hành động này không thể hoàn tác.</p>
                    <div className="form-actions">
                        <button
                            className="btn btn-secondary"
                            onClick={() => setIsDeleteOpen(false)}
                            disabled={isSubmitting}
                        >
                            Hủy
                        </button>
                        <button
                            className="btn btn-danger"
                            onClick={handleDeleteConfirm}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Đang xóa...' : 'Xóa'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
