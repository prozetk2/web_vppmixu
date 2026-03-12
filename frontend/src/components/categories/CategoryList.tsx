import { useState, useEffect } from 'react';
import { categoriesAPI } from '../../services/api';
import Modal from '../shared/Modal';
import { Toast, useToast } from '../shared/Toast';
import CategoryForm from './CategoryForm';
import { MdSearch, MdFolder, MdEdit, MdDelete, MdAdd, MdRefresh } from 'react-icons/md';
import './CategoryList.css';

interface Category {
    id: string;
    name: string;
    code?: string;
    parentId?: string;
    parent?: { id: string; name: string };
    description?: string;
}

export default function CategoryList() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Toast
    const toast = useToast();

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const response = await categoriesAPI.getAll();
            setCategories(response.data?.data || response.data || []);
        } catch (error) {
            console.error('Failed to fetch categories:', error);
            toast.error('Không thể tải danh sách danh mục');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setEditingCategory(null);
        setIsFormOpen(true);
    };

    const handleEdit = (category: Category) => {
        setEditingCategory(category);
        setIsFormOpen(true);
    };

    const handleDeleteClick = (category: Category) => {
        setDeletingCategory(category);
        setIsDeleteOpen(true);
    };

    const handleFormSubmit = async (formData: any) => {
        setIsSubmitting(true);
        try {
            if (editingCategory) {
                await categoriesAPI.update(editingCategory.id, {
                    name: formData.name,
                    code: formData.code || null,
                    parentId: formData.parentId || null,
                    description: formData.description || null,
                });
                toast.success('Cập nhật danh mục thành công');
            } else {
                await categoriesAPI.create({
                    name: formData.name,
                    code: formData.code || null,
                    parentId: formData.parentId || null,
                    description: formData.description || null,
                });
                toast.success('Thêm danh mục thành công');
            }
            setIsFormOpen(false);
            fetchCategories();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deletingCategory) return;

        setIsSubmitting(true);
        try {
            await categoriesAPI.delete(deletingCategory.id);
            toast.success('Xóa danh mục thành công');
            setIsDeleteOpen(false);
            setDeletingCategory(null);
            fetchCategories();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Không thể xóa danh mục');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filter categories by search
    const filteredCategories = categories.filter((cat) =>
        cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cat.code && cat.code.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Get parent name
    const getParentName = (parentId?: string) => {
        if (!parentId) return '—';
        const parent = categories.find((c) => c.id === parentId);
        return parent?.name || '—';
    };

    return (
        <div className="category-list">
            <Toast toasts={toast.toasts} onRemove={toast.removeToast} />

            {/* Header */}
            <div className="page-header">
                <h2>Danh mục</h2>
                <div className="search-box">
                    <MdSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm danh mục..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button
                            className="search-clear"
                            onClick={() => setSearchTerm('')}
                            style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#999' }}
                        >
                            ×
                        </button>
                    )}
                </div>
                <div className="header-actions">
                    <button onClick={handleAdd} className="btn-outline-primary" style={{ fontWeight: 'bold', color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}>
                        <MdAdd /> Thêm danh mục
                    </button>
                    <button className="btn-icon" onClick={fetchCategories} title="Làm mới">
                        <MdRefresh />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="category-table-wrapper">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner-large"></div>
                        <p>Đang tải dữ liệu...</p>
                    </div>
                ) : filteredCategories.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon"><MdFolder size={64} /></div>
                        <h3>Chưa có danh mục</h3>
                        <p>Bắt đầu thêm danh mục đầu tiên của bạn</p>
                        <button onClick={handleAdd} className="btn-add">
                            + Thêm danh mục
                        </button>
                    </div>
                ) : (
                    <table className="category-table">
                        <thead>
                            <tr>
                                <th>Tên danh mục</th>
                                <th>Mã</th>
                                <th>Danh mục cha</th>
                                <th>Mô tả</th>
                                <th className="text-center">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCategories.map((category) => (
                                <tr key={category.id}>
                                    <td className="category-name">
                                        <span className="category-icon"><MdFolder /></span>
                                        {category.name}
                                    </td>
                                    <td className="category-code">{category.code || '—'}</td>
                                    <td>{getParentName(category.parentId)}</td>
                                    <td className="category-desc">
                                        {category.description || '—'}
                                    </td>
                                    <td className="text-center">
                                        <div className="actions">
                                            <button
                                                className="btn-icon btn-edit"
                                                onClick={() => handleEdit(category)}
                                                title="Sửa"
                                            >
                                                <MdEdit />
                                            </button>
                                            <button
                                                className="btn-icon btn-delete"
                                                onClick={() => handleDeleteClick(category)}
                                                title="Xóa"
                                            >
                                                <MdDelete />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                title={editingCategory ? 'Sửa danh mục' : 'Thêm danh mục mới'}
                size="md"
            >
                <CategoryForm
                    category={editingCategory}
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
                        Bạn có chắc chắn muốn xóa danh mục{' '}
                        <strong>"{deletingCategory?.name}"</strong>?
                    </p>
                    <p className="warning-text">
                        Các sản phẩm thuộc danh mục này sẽ không còn có danh mục.
                    </p>
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
