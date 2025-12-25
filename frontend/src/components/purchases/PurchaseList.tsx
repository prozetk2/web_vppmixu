import { useState, useEffect } from 'react';
import { purchasesAPI, suppliersAPI, productsAPI, warehousesAPI } from '../../services/api';
import Modal from '../shared/Modal';
import { Toast, useToast } from '../shared/Toast';
import { MdDownload, MdInventory, MdCheck, MdClose, MdEdit, MdVisibility, MdSearch, MdDelete, MdFileDownload, MdAdd, MdInventory2 } from 'react-icons/md';
import './PurchaseList.css';

interface PurchaseItem {
    id: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    variant: {
        product: { name: string; sku?: string };
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

    // Filters
    const [statusFilter, setStatusFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    // Create/Edit Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        supplierId: '',
        warehouseId: '',
        note: '',
    });
    const [items, setItems] = useState<FormItem[]>([{ productId: '', quantity: 1, unitCost: 0 }]);
    const [submitting, setSubmitting] = useState(false);

    // Detail Modal state
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

    // Export Modal state
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [exportFromDate, setExportFromDate] = useState('');
    const [exportToDate, setExportToDate] = useState('');
    const [exportStatus, setExportStatus] = useState('');
    const [exporting, setExporting] = useState(false);

    const toast = useToast();

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        fetchPurchases();
    }, [page, statusFilter, searchQuery, fromDate, toDate]);

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
            if (searchQuery) params.search = searchQuery;
            if (fromDate) params.fromDate = fromDate;
            if (toDate) params.toDate = toDate;

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
        setEditingId(null);
        setFormData({ supplierId: '', warehouseId: '', note: '' });
        setItems([{ productId: '', quantity: 1, unitCost: 0 }]);
        setIsModalOpen(true);
    };

    const openEditModal = (purchase: Purchase) => {
        setEditingId(purchase.id);
        setFormData({
            supplierId: purchase.supplier?.id || '',
            warehouseId: '',
            note: purchase.note || '',
        });
        setItems(purchase.purchaseItems.map(item => {
            const product = products.find(p =>
                item.variant?.product?.name === p.name || item.variant?.product?.sku === p.sku
            );
            return {
                productId: product?.id || '',
                quantity: item.quantity,
                unitCost: Number(item.unitCost),
            };
        }));
        setIsModalOpen(true);
    };

    const openDetailModal = (purchase: Purchase) => {
        setSelectedPurchase(purchase);
        setIsDetailOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
    };

    const closeDetailModal = () => {
        setIsDetailOpen(false);
        setSelectedPurchase(null);
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
            const payload = {
                supplierId: formData.supplierId,
                warehouseId: formData.warehouseId || undefined,
                items: validItems,
                note: formData.note || undefined,
            };

            if (editingId) {
                await purchasesAPI.update(editingId, payload);
                toast.success('Cập nhật đơn nhập thành công');
            } else {
                await purchasesAPI.create(payload);
                toast.success('Tạo đơn nhập hàng thành công');
            }
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

    const handleDelete = async (id: string, orderNumber: string) => {
        if (!confirm(`Xác nhận XÓA VĨNH VIỄN đơn ${orderNumber}?`)) return;
        try {
            await purchasesAPI.delete(id);
            toast.success('Đã xóa đơn nhập hàng');
            fetchPurchases();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
        }
    };

    const openExportModal = () => {
        // Pre-fill with 30 days range
        const today = new Date();
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        setExportFromDate(thirtyDaysAgo.toISOString().slice(0, 10));
        setExportToDate(today.toISOString().slice(0, 10));
        setExportStatus('');
        setIsExportOpen(true);
    };

    const closeExportModal = () => {
        setIsExportOpen(false);
    };

    const doExport = async () => {
        try {
            setExporting(true);
            const params: Record<string, unknown> = {};
            if (exportStatus) params.status = exportStatus;
            if (exportFromDate) params.fromDate = exportFromDate;
            if (exportToDate) params.toDate = exportToDate;

            toast.success('Đang tải dữ liệu...');
            const response = await purchasesAPI.export(params);

            // Handle nested data structure
            let data = response.data;
            if (data && typeof data === 'object' && !Array.isArray(data) && Array.isArray(data.data)) {
                data = data.data;
            }

            if (!Array.isArray(data)) {
                console.error('Export data is not array:', data);
                toast.error('Dữ liệu không hợp lệ');
                return;
            }

            if (data.length === 0) {
                toast.error('Không có dữ liệu trong khoảng thời gian này');
                return;
            }

            // Dynamic import XLSX
            const xlsxModule = await import('xlsx');
            const XLSX = xlsxModule.default || xlsxModule;

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'DonNhapHang');

            const fileName = `don_nhap_hang_${exportFromDate}_${exportToDate}.xlsx`;
            XLSX.writeFile(wb, fileName);
            toast.success(`Đã xuất ${data.length} dòng ra file Excel`);
            closeExportModal();
        } catch (error: any) {
            console.error('Export error:', error);
            const errorMsg = error?.response?.data?.message || error?.message || 'Lỗi xuất Excel';
            toast.error(errorMsg);
        } finally {
            setExporting(false);
        }
    };

    const clearFilters = () => {
        setSearchQuery('');
        setStatusFilter('');
        setFromDate('');
        setToDate('');
        setPage(1);
    };

    const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN').format(value);
    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString('vi-VN');

    const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);

    return (
        <div className="purchase-page">
            <Toast toasts={toast.toasts} onRemove={toast.removeToast} />

            <div className="purchase-header">
                <h2><MdDownload /> Nhập hàng</h2>
                <div className="header-actions">
                    <button onClick={openExportModal} className="btn-export">
                        <MdFileDownload /> Xuất Excel
                    </button>
                    <button onClick={openCreateModal} className="btn-create">
                        <MdAdd /> Tạo đơn nhập
                    </button>
                </div>
            </div>

            <div className="purchase-filters">
                <div className="filter-row">
                    <div className="search-box">
                        <MdSearch className="search-icon" />
                        <input
                            type="text"
                            placeholder="Tìm mã đơn..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setPage(1);
                            }}
                            className="search-input"
                        />
                    </div>
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
                    <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => {
                            setFromDate(e.target.value);
                            setPage(1);
                        }}
                        className="date-input"
                    />
                    <input
                        type="date"
                        value={toDate}
                        onChange={(e) => {
                            setToDate(e.target.value);
                            setPage(1);
                        }}
                        className="date-input"
                    />
                    {(searchQuery || statusFilter || fromDate || toDate) && (
                        <button onClick={clearFilters} className="btn-clear-filter">
                            Xóa lọc
                        </button>
                    )}
                </div>
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
                                <th>Số SP</th>
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
                                        <span
                                            className="order-number clickable"
                                            onClick={() => openDetailModal(p)}
                                        >
                                            {p.orderNumber}
                                        </span>
                                    </td>
                                    <td className="purchase-supplier">{p.supplier?.name}</td>
                                    <td className="purchase-items-count">{p.purchaseItems?.length || 0}</td>
                                    <td className="purchase-total">{formatCurrency(Number(p.totalAmount))}đ</td>
                                    <td>
                                        <span className={`purchase-status ${p.status}`}>
                                            {STATUS_LABELS[p.status] || p.status}
                                        </span>
                                    </td>
                                    <td className="purchase-date">{formatDate(p.createdAt)}</td>
                                    <td>
                                        <div className="action-btns">
                                            <button
                                                className="btn-view"
                                                onClick={() => openDetailModal(p)}
                                                title="Xem chi tiết"
                                            >
                                                <MdVisibility />
                                            </button>
                                            {p.status === 'PENDING' && (
                                                <>
                                                    <button
                                                        className="btn-edit"
                                                        onClick={() => openEditModal(p)}
                                                        title="Sửa"
                                                    >
                                                        <MdEdit />
                                                    </button>
                                                    <button
                                                        className="btn-confirm"
                                                        onClick={() => handleConfirm(p.id)}
                                                        title="Nhập kho"
                                                    >
                                                        <MdCheck />
                                                    </button>
                                                    <button
                                                        className="btn-cancel"
                                                        onClick={() => handleCancel(p.id)}
                                                        title="Hủy"
                                                    >
                                                        <MdClose />
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                className="btn-delete"
                                                onClick={() => handleDelete(p.id, p.orderNumber)}
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

            {meta.totalPages > 1 && (
                <div className="purchase-pagination">
                    <div className="pagination-info">
                        Trang {page} / {meta.totalPages} ({meta.total} đơn)
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

            {/* Create/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={editingId ? 'Sửa đơn nhập hàng' : 'Tạo đơn nhập hàng'}
            >
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
                            {submitting ? 'Đang xử lý...' : (editingId ? 'Cập nhật' : 'Tạo đơn nhập')}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Detail Modal - Improved Layout */}
            <Modal
                isOpen={isDetailOpen}
                onClose={closeDetailModal}
                title={`Chi tiết đơn nhập hàng`}
            >
                {selectedPurchase && (
                    <div className="purchase-detail-v2">
                        {/* Header Info */}
                        <div className="detail-info-grid">
                            <div className="detail-info-card">
                                <div className="info-label">Mã đơn</div>
                                <div className="info-value order-code">{selectedPurchase.orderNumber}</div>
                            </div>
                            <div className="detail-info-card">
                                <div className="info-label">Trạng thái</div>
                                <div className="info-value">
                                    <span className={`purchase-status ${selectedPurchase.status}`}>
                                        {STATUS_LABELS[selectedPurchase.status]}
                                    </span>
                                </div>
                            </div>
                            <div className="detail-info-card">
                                <div className="info-label">Nhà cung cấp</div>
                                <div className="info-value supplier-name">{selectedPurchase.supplier?.name}</div>
                            </div>
                            <div className="detail-info-card">
                                <div className="info-label">Kho nhập</div>
                                <div className="info-value">{selectedPurchase.warehouse?.name || 'Tự động'}</div>
                            </div>
                            <div className="detail-info-card">
                                <div className="info-label">Ngày tạo</div>
                                <div className="info-value">{formatDate(selectedPurchase.createdAt)}</div>
                            </div>
                            {selectedPurchase.confirmedAt && (
                                <div className="detail-info-card">
                                    <div className="info-label">Ngày nhập kho</div>
                                    <div className="info-value confirmed">{formatDate(selectedPurchase.confirmedAt)}</div>
                                </div>
                            )}
                        </div>

                        {selectedPurchase.note && (
                            <div className="detail-note">
                                <strong>Ghi chú:</strong> {selectedPurchase.note}
                            </div>
                        )}

                        {/* Items Table */}
                        <div className="detail-items-section">
                            <h4><MdInventory2 /> Danh sách sản phẩm ({selectedPurchase.purchaseItems.length})</h4>
                            <div className="detail-table-wrapper">
                                <table className="detail-items-table-v2">
                                    <thead>
                                        <tr>
                                            <th className="col-index">#</th>
                                            <th className="col-product">Sản phẩm</th>
                                            <th className="col-qty">SL</th>
                                            <th className="col-price">Đơn giá</th>
                                            <th className="col-total">Thành tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedPurchase.purchaseItems.map((item, idx) => (
                                            <tr key={item.id}>
                                                <td className="col-index">{idx + 1}</td>
                                                <td className="col-product">
                                                    <div className="product-name">{item.variant?.product?.name}</div>
                                                    {item.variant?.product?.sku && (
                                                        <div className="product-sku">SKU: {item.variant.product.sku}</div>
                                                    )}
                                                </td>
                                                <td className="col-qty">{item.quantity}</td>
                                                <td className="col-price">{formatCurrency(Number(item.unitCost))}đ</td>
                                                <td className="col-total">{formatCurrency(Number(item.totalCost))}đ</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="detail-grand-total">
                                <span className="total-label">Tổng cộng:</span>
                                <span className="total-amount">{formatCurrency(Number(selectedPurchase.totalAmount))}đ</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="detail-actions-v2">
                            <button onClick={closeDetailModal} className="btn btn-secondary">
                                Đóng
                            </button>
                            {selectedPurchase.status === 'PENDING' && (
                                <>
                                    <button
                                        onClick={() => {
                                            closeDetailModal();
                                            openEditModal(selectedPurchase);
                                        }}
                                        className="btn btn-warning"
                                    >
                                        <MdEdit /> Sửa đơn
                                    </button>
                                    <button
                                        onClick={() => {
                                            handleConfirm(selectedPurchase.id);
                                            closeDetailModal();
                                        }}
                                        className="btn btn-success"
                                    >
                                        <MdCheck /> Xác nhận nhập kho
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* Export Modal */}
            <Modal
                isOpen={isExportOpen}
                onClose={closeExportModal}
                title="Xuất Excel đơn nhập hàng"
            >
                <div className="export-modal">
                    <p className="export-description">
                        Chọn khoảng thời gian và trạng thái để xuất dữ liệu
                    </p>

                    <div className="export-filters">
                        <div className="export-row">
                            <label>Từ ngày:</label>
                            <input
                                type="date"
                                value={exportFromDate}
                                onChange={(e) => setExportFromDate(e.target.value)}
                                className="export-date-input"
                            />
                        </div>
                        <div className="export-row">
                            <label>Đến ngày:</label>
                            <input
                                type="date"
                                value={exportToDate}
                                onChange={(e) => setExportToDate(e.target.value)}
                                className="export-date-input"
                            />
                        </div>
                        <div className="export-row">
                            <label>Trạng thái:</label>
                            <select
                                value={exportStatus}
                                onChange={(e) => setExportStatus(e.target.value)}
                                className="export-select"
                            >
                                <option value="">Tất cả</option>
                                <option value="PENDING">Chờ xác nhận</option>
                                <option value="CONFIRMED">Đã nhập kho</option>
                                <option value="CANCELLED">Đã hủy</option>
                            </select>
                        </div>
                    </div>

                    <div className="export-actions">
                        <button onClick={closeExportModal} className="btn btn-secondary">
                            Hủy
                        </button>
                        <button
                            onClick={doExport}
                            className="btn btn-primary"
                            disabled={exporting}
                        >
                            {exporting ? 'Đang xuất...' : <><MdFileDownload /> Xuất Excel</>}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
