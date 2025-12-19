import { useState, useEffect } from 'react';
import { warehousesAPI } from '../../services/api';
import Modal from '../shared/Modal';
import { Toast, useToast } from '../shared/Toast';
import { MdWarehouse, MdAdd } from 'react-icons/md';
import './WarehouseList.css';

interface Warehouse {
    id: string;
    name: string;
    code?: string;
    address?: string;
    itemCount?: number;
    createdAt?: string;
}

interface WarehouseFormData {
    name: string;
    code: string;
    address: string;
}

export default function WarehouseList() {
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
    const [formData, setFormData] = useState<WarehouseFormData>({
        name: '',
        code: '',
        address: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const toast = useToast();

    useEffect(() => {
        fetchWarehouses();
    }, []);

    const fetchWarehouses = async () => {
        setLoading(true);
        try {
            const response = await warehousesAPI.getAll();
            setWarehouses(response.data?.data || response.data || []);
        } catch (error) {
            console.error('Failed to fetch warehouses:', error);
            toast.error('Không thể tải danh sách kho');
        } finally {
            setLoading(false);
        }
    };

    const openAddModal = () => {
        setEditingWarehouse(null);
        setFormData({ name: '', code: '', address: '' });
        setErrors({});
        setIsModalOpen(true);
    };

    const openEditModal = (warehouse: Warehouse) => {
        setEditingWarehouse(warehouse);
        setFormData({
            name: warehouse.name,
            code: warehouse.code || '',
            address: warehouse.address || '',
        });
        setErrors({});
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingWarehouse(null);
        setFormData({ name: '', code: '', address: '' });
        setErrors({});
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Tên kho là bắt buộc';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setIsSubmitting(true);
        try {
            if (editingWarehouse) {
                await warehousesAPI.update(editingWarehouse.id, formData);
                toast.success('Cập nhật kho thành công');
            } else {
                await warehousesAPI.create(formData);
                toast.success('Thêm kho mới thành công');
            }
            closeModal();
            fetchWarehouses();
        } catch (error: any) {
            const message = error.response?.data?.message || 'Có lỗi xảy ra';
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (warehouse: Warehouse) => {
        if (!confirm(`Bạn có chắc muốn xóa kho "${warehouse.name}"?`)) {
            return;
        }

        try {
            await warehousesAPI.delete(warehouse.id);
            toast.success('Xóa kho thành công');
            fetchWarehouses();
        } catch (error: any) {
            const message = error.response?.data?.message || 'Không thể xóa kho';
            toast.error(message);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    return (
        <div className="warehouse-list">
            <Toast toasts={toast.toasts} onRemove={toast.removeToast} />

            {/* Header */}
            <div className="warehouse-header">
                <h2>Quản lý Kho hàng</h2>
                <button onClick={openAddModal} className="btn-add">
                    <span>➕</span> Thêm kho mới
                </button>
            </div>

            {/* Table */}
            <div className="warehouse-table-wrapper">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner-large"></div>
                        <p>Đang tải dữ liệu...</p>
                    </div>
                ) : warehouses.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon"><MdWarehouse size={64} /></div>
                        <h3>Chưa có kho hàng</h3>
                        <p>Bắt đầu bằng cách thêm kho đầu tiên</p>
                    </div>
                ) : (
                    <table className="warehouse-table">
                        <thead>
                            <tr>
                                <th>Tên kho</th>
                                <th>Mã kho</th>
                                <th>Địa chỉ</th>
                                <th style={{ textAlign: 'center' }}>Số mặt hàng</th>
                                <th style={{ width: '120px' }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {warehouses.map((warehouse) => (
                                <tr key={warehouse.id}>
                                    <td className="warehouse-name">{warehouse.name}</td>
                                    <td className="warehouse-code">{warehouse.code || '—'}</td>
                                    <td>{warehouse.address || '—'}</td>
                                    <td className="item-count-cell">
                                        <span className="item-count-badge">
                                            {warehouse.itemCount ?? 0}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="actions-cell">
                                            <button
                                                onClick={() => openEditModal(warehouse)}
                                                className="btn-edit"
                                            >
                                                Sửa
                                            </button>
                                            <button
                                                onClick={() => handleDelete(warehouse)}
                                                className="btn-delete"
                                            >
                                                Xóa
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal Form */}
            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={editingWarehouse ? 'Sửa kho hàng' : 'Thêm kho mới'}
                size="sm"
            >
                <form onSubmit={handleSubmit} className="warehouse-form">
                    <div className="form-group">
                        <label htmlFor="name" className="form-label">
                            Tên kho <span className="required">*</span>
                        </label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className={`form-input ${errors.name ? 'error' : ''}`}
                            placeholder="VD: Kho chính"
                            autoFocus
                        />
                        {errors.name && <span className="error-text">{errors.name}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="code" className="form-label">
                            Mã kho
                        </label>
                        <input
                            type="text"
                            id="code"
                            name="code"
                            value={formData.code}
                            onChange={handleChange}
                            className="form-input"
                            placeholder="VD: KHO01"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="address" className="form-label">
                            Địa chỉ
                        </label>
                        <input
                            type="text"
                            id="address"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            className="form-input"
                            placeholder="VD: 123 Đường ABC, Quận 1"
                        />
                    </div>

                    <div className="form-actions">
                        <button
                            type="button"
                            onClick={closeModal}
                            className="btn btn-secondary"
                            disabled={isSubmitting}
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="spinner-small"></span>
                                    Đang xử lý...
                                </>
                            ) : editingWarehouse ? (
                                'Cập nhật'
                            ) : (
                                'Thêm mới'
                            )}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
