import { useState, useEffect } from 'react';
import { purchasesAPI, suppliersAPI, productsAPI, warehousesAPI } from '../../services/api';
import Modal from '../shared/Modal';
import { Toast, useToast } from '../shared/Toast';
import { MdDownload, MdInventory, MdCheck, MdClose } from 'react-icons/md';
import './PurchaseList.css';

interface PurchaseItem {
    id: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    variant: {
        product: { name: string };
    };
}

interface Purchase {
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    note?: string;
    createdAt: string;
    confirmedAt?: string;
    supplier: { id: string; name: string };
    warehouse?: { name: string };
    purchaseItems: PurchaseItem[];
}

interface Supplier {
    id: string;
    name: string;
}

interface Product {
    id: string;
    name: string;
    sku?: string;
    defaultCost?: number;
}

interface Warehouse {
    id: string;
    name: string;
}

interface FormItem {
    productId: string;
    quantity: number;
    unitCost: number;
}

const STATUS_LABELS: Record<string, string> = {
    PENDING: 'Chờ xác nhận',
    CONFIRMED: 'Đã nhập kho',
    CANCELLED: 'Đã hủy',
};

export default function PurchaseList() {
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
    const [statusFilter, setStatusFilter] = useState('');

    // Form state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        supplierId: '',
        warehouseId: '',
        note: '',
    });
    const [items, setItems] = useState<FormItem[]>([{ productId: '', quantity: 1, unitCost: 0 }]);
    const [submitting, setSubmitting] = useState(false);

    const toast = useToast();

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        fetchPurchases();
    }, [page, statusFilter]);

    const fetchData = async () => {
        try {
            const [suppliersRes, productsRes, warehousesRes] = await Promise.all([
                suppliersAPI.getAll(),
                productsAPI.getAll({ limit: 1000 }),
                warehousesAPI.getAll(),
            ]);
            setSuppliers((suppliersRes.data?.data || suppliersRes.data || []).map((s: any) => ({
                ...s,
                id: s.id.toString(),
            })));
            setProducts((productsRes.data?.data || []).map((p: any) => ({
                ...p,
                id: p.id.toString(),
            })));
            setWarehouses((warehousesRes.data?.data || warehousesRes.data || []).map((w: any) => ({
                ...w,
                id: w.id.toString(),
            })));
        } catch (error) {
            console.error('Failed to fetch data:', error);
        }
    };

    const fetchPurchases = async () => {
        setLoading(true);
        try {
            const params: Record<string, unknown> = { page, limit: 15 };
            if (statusFilter) params.status = statusFilter;

            const response = await purchasesAPI.getAll(params);
            setPurchases((response.data?.data || []).map((p: any) => ({
                ...p,
                id: p.id.toString(),
            })));
            setMeta(response.data?.meta || { total: 0, totalPages: 1 });
        } catch (error) {
            console.error('Failed to fetch purchases:', error);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setFormData({ supplierId: '', warehouseId: '', note: '' });
        setItems([{ productId: '', quantity: 1, unitCost: 0 }]);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
    };

    const addItem = () => {
        setItems([...items, { productId: '', quantity: 1, unitCost: 0 }]);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: keyof FormItem, value: string | number) => {
        const newItems = [...items];
        if (field === 'productId') {
            newItems[index].productId = value as string;
            // Auto-fill cost
            const product = products.find((p) => p.id === value);
            if (product?.defaultCost) {
                newItems[index].unitCost = Number(product.defaultCost);
            }
        } else if (field === 'quantity') {
            newItems[index].quantity = Number(value) || 1;
        } else if (field === 'unitCost') {
            newItems[index].unitCost = Number(value) || 0;
        }
        setItems(newItems);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.supplierId) {
            toast.error('Vui lòng chọn nhà cung cấp');
            return;
        }
        const validItems = items.filter((i) => i.productId && i.quantity > 0);
        if (validItems.length === 0) {
            toast.error('Vui lòng thêm ít nhất 1 sản phẩm');
            return;
        }

        setSubmitting(true);
        try {
            await purchasesAPI.create({
                supplierId: formData.supplierId,
                warehouseId: formData.warehouseId || undefined,
                items: validItems,
                note: formData.note || undefined,
            });
            toast.success('Tạo đơn nhập hàng thành công');
            closeModal();
            fetchPurchases();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
        } finally {
            setSubmitting(false);
        }
    };

    const handleConfirm = async (id: string) => {
        if (!confirm('Xác nhận nhập kho đơn hàng này?')) return;
        try {
            await purchasesAPI.confirm(id);
            toast.success('Đã nhập kho thành công');
            fetchPurchases();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
        }
    };

    const handleCancel = async (id: string) => {
        if (!confirm('Xác nhận hủy đơn hàng này?')) return;
        try {
            await purchasesAPI.cancel(id);
            toast.success('Đã hủy đơn hàng');
            fetchPurchases();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
        }
    };

    const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN').format(value);
    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString('vi-VN');

    const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);

    return (
        <div className="purchase-page">
            <Toast toasts={toast.toasts} onRemove={toast.removeToast} />

            <div className="purchase-header">
                <h2><MdDownload /> Nhập hàng</h2>
                <button onClick={openCreateModal} className="btn-create">
                    ➕ Tạo đơn nhập
                </button>
            </div>

            <div className="purchase-filters">
                <select
                    value={statusFilter}
                    onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setPage(1);
                    }}
                    className="filter-select"
                >
                    <option value="">Tất cả trạng thái</option>
                    <option value="PENDING">Chờ xác nhận</option>
                    <option value="CONFIRMED">Đã nhập kho</option>
                    <option value="CANCELLED">Đã hủy</option>
                </select>
            </div>

            <div className="purchase-table-wrapper">
                {loading ? (
                    <div className="purchase-loading">Đang tải...</div>
                ) : purchases.length === 0 ? (
                    <div className="purchase-empty">
                        <div className="purchase-empty-icon"><MdInventory size={64} /></div>
                        <p>Chưa có đơn nhập hàng</p>
                    </div>
                ) : (
                    <table className="purchase-table">
                        <thead>
                            <tr>
                                <th>Mã đơn</th>
                                <th>Nhà cung cấp</th>
                                <th>Tổng tiền</th>
                                <th>Trạng thái</th>
                                <th>Ngày tạo</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {purchases.map((p) => (
                                <tr key={p.id}>
                                    <td>
                                        <span className="order-number">{p.orderNumber}</span>
                                    </td>
                                    <td className="purchase-supplier">{p.supplier?.name}</td>
                                    <td className="purchase-total">{formatCurrency(Number(p.totalAmount))}đ</td>
                                    <td>
                                        <span className={`purchase-status ${p.status}`}>
                                            {STATUS_LABELS[p.status] || p.status}
                                        </span>
                                    </td>
                                    <td className="purchase-date">{formatDate(p.createdAt)}</td>
                                    <td>
                                        <div className="action-btns">
                                            {p.status === 'PENDING' && (
                                                <>
                                                    <button
                                                        className="btn-confirm"
                                                        onClick={() => handleConfirm(p.id)}
                                                    >
                                                        <MdCheck /> Nhập kho
                                                    </button>
                                                    <button
                                                        className="btn-cancel"
                                                        onClick={() => handleCancel(p.id)}
                                                    >
                                                        <MdClose /> Hủy
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {meta.totalPages > 1 && (
                <div className="purchase-pagination">
                    <div className="pagination-info">
                        Trang {page} / {meta.totalPages}
                    </div>
                    <div className="pagination-buttons">
                        <button
                            className="pagination-btn"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1}
                        >
                            ← Trước
                        </button>
                        <button
                            className="pagination-btn"
                            onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                            disabled={page >= meta.totalPages}
                        >
                            Sau →
                        </button>
                    </div>
                </div>
            )}

            {/* Create Modal */}
            <Modal isOpen={isModalOpen} onClose={closeModal} title="Tạo đơn nhập hàng">
                <form onSubmit={handleSubmit} className="purchase-form">
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">
                                Nhà cung cấp <span className="required">*</span>
                            </label>
                            <select
                                value={formData.supplierId}
                                onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                                className="form-select"
                            >
                                <option value="">-- Chọn NCC --</option>
                                {suppliers.map((s) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Kho nhập</label>
                            <select
                                value={formData.warehouseId}
                                onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                                className="form-select"
                            >
                                <option value="">-- Tự động --</option>
                                {warehouses.map((w) => (
                                    <option key={w.id} value={w.id}>{w.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="items-section">
                        <div className="items-header">
                            <h4>Sản phẩm nhập</h4>
                            <button type="button" onClick={addItem} className="btn-add-item">
                                + Thêm SP
                            </button>
                        </div>
                        {items.map((item, idx) => (
                            <div key={idx} className="item-row">
                                <select
                                    value={item.productId}
                                    onChange={(e) => updateItem(idx, 'productId', e.target.value)}
                                >
                                    <option value="">-- Chọn SP --</option>
                                    {products.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} {p.sku ? `(${p.sku})` : ''}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                                    placeholder="SL"
                                />
                                <input
                                    type="number"
                                    min="0"
                                    value={item.unitCost}
                                    onChange={(e) => updateItem(idx, 'unitCost', e.target.value)}
                                    placeholder="Giá nhập"
                                />
                                {items.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeItem(idx)}
                                        className="btn-remove-item"
                                    >
                                        <MdClose />
                                    </button>
                                )}
                            </div>
                        ))}
                        <div className="items-total">
                            Tổng: {formatCurrency(totalAmount)}đ
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Ghi chú</label>
                        <textarea
                            value={formData.note}
                            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                            className="form-textarea"
                            rows={2}
                            placeholder="Ghi chú đơn nhập..."
                        />
                    </div>

                    <div className="form-actions">
                        <button type="button" onClick={closeModal} className="btn btn-secondary">
                            Hủy
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={submitting}>
                            {submitting ? 'Đang tạo...' : 'Tạo đơn nhập'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
