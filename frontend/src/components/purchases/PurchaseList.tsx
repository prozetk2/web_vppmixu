import { useState, useEffect } from 'react';
import { purchasesAPI, suppliersAPI, productsAPI, warehousesAPI } from '../../services/api';
import Modal from '../shared/Modal';
import { Toast, useToast } from '../shared/Toast';
import { MdDownload, MdInventory, MdCheck, MdClose, MdEdit, MdVisibility, MdSearch, MdDelete, MdFileDownload, MdAdd, MdInventory2, MdStar, MdStarBorder, MdSettings, MdHelp, MdChevronLeft, MdChevronRight } from 'react-icons/md';
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
    supplier: { id: string; name: string; code?: string };
    warehouse?: { name: string };
    purchaseItems: PurchaseItem[];
    starred?: boolean;
}

interface Supplier {
    id: string;
    name: string;
    code?: string;
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
    PENDING: 'Phiếu tạm',
    CONFIRMED: 'Đã nhập hàng',
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
    const [itemsPerPage, setItemsPerPage] = useState(15);

    // Sidebar Filters - Status checkboxes
    const [statusPending, setStatusPending] = useState(true);
    const [statusConfirmed, setStatusConfirmed] = useState(true);
    const [statusCancelled, setStatusCancelled] = useState(false);

    // Sidebar Filters - Date range
    const [dateRangeType, setDateRangeType] = useState<'last_year' | 'custom'>('custom');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    // Sidebar Filters - Creator/Importer (placeholders)
    const [creatorFilter, setCreatorFilter] = useState('');
    const [importerFilter, setImporterFilter] = useState('');

    // Search
    const [searchQuery, setSearchQuery] = useState('');

    // Selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [starredIds, setStarredIds] = useState<Set<string>>(new Set());

    // Sidebar collapsed state
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

    // Legacy statusFilter for API compatibility
    const statusFilter = [statusPending && 'PENDING', statusConfirmed && 'CONFIRMED', statusCancelled && 'CANCELLED'].filter(Boolean).join(',');

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        fetchPurchases();
    }, [page, statusPending, statusConfirmed, statusCancelled, searchQuery, fromDate, toDate]);

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
        setStatusPending(true);
        setStatusConfirmed(true);
        setStatusCancelled(false);
        setFromDate('');
        setToDate('');
        setPage(1);
    };

    // Toggle star
    const toggleStar = (id: string) => {
        setStarredIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    // Toggle selection
    const toggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    // Select all
    const toggleSelectAll = () => {
        if (selectedIds.size === purchases.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(purchases.map(p => p.id)));
        }
    };

    const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN').format(value);
    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString('vi-VN');

    const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);

    return (
        <div className="purchase-page">
            <Toast toasts={toast.toasts} onRemove={toast.removeToast} />

            {/* Header - KiotViet style */}
            <div className="purchase-header-v2">
                <h2>Nhập hàng</h2>
                <div className="header-center">
                    <div className="search-box-v2">
                        <MdSearch className="search-icon" />
                        <input
                            type="text"
                            placeholder="Theo mã phiếu nhập"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setPage(1);
                            }}
                            className="search-input"
                        />
                    </div>
                </div>
                <div className="header-actions-v2">
                    <button onClick={openCreateModal} className="btn-create-v2">
                        <MdAdd /> Nhập hàng
                    </button>
                    <button onClick={openExportModal} className="btn-export-v2">
                        <MdFileDownload /> Xuất file
                    </button>
                    <button className="btn-icon" title="Cài đặt">
                        <MdSettings />
                    </button>
                    <button className="btn-icon" title="Trợ giúp">
                        <MdHelp />
                    </button>
                </div>
            </div>

            {/* Main Container with Sidebar */}
            <div className="purchase-container">
                {/* Sidebar Filters */}
                <div className={`purchase-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
                    <button
                        className="sidebar-toggle"
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        title={sidebarCollapsed ? 'Mở rộng' : 'Thu gọn'}
                    >
                        {sidebarCollapsed ? <MdChevronRight /> : <MdChevronLeft />}
                    </button>

                    {/* Trạng thái Filter */}
                    <div className="filter-group">
                        <label className="filter-label">Trạng thái</label>
                        <div className="checkbox-group">
                            <label className="checkbox-item">
                                <input
                                    type="checkbox"
                                    checked={statusPending}
                                    onChange={(e) => { setStatusPending(e.target.checked); setPage(1); }}
                                />
                                <span className="checkbox-custom"></span>
                                <span>Phiếu tạm</span>
                            </label>
                            <label className="checkbox-item">
                                <input
                                    type="checkbox"
                                    checked={statusConfirmed}
                                    onChange={(e) => { setStatusConfirmed(e.target.checked); setPage(1); }}
                                />
                                <span className="checkbox-custom"></span>
                                <span>Đã nhập hàng</span>
                            </label>
                            <label className="checkbox-item">
                                <input
                                    type="checkbox"
                                    checked={statusCancelled}
                                    onChange={(e) => { setStatusCancelled(e.target.checked); setPage(1); }}
                                />
                                <span className="checkbox-custom"></span>
                                <span>Đã hủy</span>
                            </label>
                        </div>
                    </div>

                    {/* Thời gian Filter */}
                    <div className="filter-group">
                        <label className="filter-label">Thời gian ▼</label>
                        <div className="radio-group">
                            <label className="radio-item">
                                <input
                                    type="radio"
                                    name="dateRange"
                                    value="last_year"
                                    checked={dateRangeType === 'last_year'}
                                    onChange={() => setDateRangeType('last_year')}
                                />
                                <span className="radio-custom"></span>
                                <span>Năm trước</span>
                            </label>
                            <label className="radio-item">
                                <input
                                    type="radio"
                                    name="dateRange"
                                    value="custom"
                                    checked={dateRangeType === 'custom'}
                                    onChange={() => setDateRangeType('custom')}
                                />
                                <span className="radio-custom"></span>
                                <span>Tùy chọn</span>
                            </label>
                        </div>
                        {dateRangeType === 'custom' && (
                            <div className="date-range-inputs">
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
                                    className="date-input-v2"
                                />
                                <span className="date-separator">-</span>
                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => { setToDate(e.target.value); setPage(1); }}
                                    className="date-input-v2"
                                />
                            </div>
                        )}
                    </div>

                    {/* Người tạo Filter */}
                    <div className="filter-group">
                        <label className="filter-label">Người tạo</label>
                        <input
                            type="text"
                            placeholder="Chọn người tạo"
                            value={creatorFilter}
                            onChange={(e) => setCreatorFilter(e.target.value)}
                            className="filter-input-v2"
                        />
                    </div>

                    {/* Người nhập Filter */}
                    <div className="filter-group">
                        <label className="filter-label">Người nhập</label>
                        <input
                            type="text"
                            placeholder="Chọn người nhập"
                            value={importerFilter}
                            onChange={(e) => setImporterFilter(e.target.value)}
                            className="filter-input-v2"
                        />
                    </div>
                </div>

                {/* Main Content */}
                <div className="purchase-main">
                    <div className="purchase-table-wrapper-v2">
                        {loading ? (
                            <div className="purchase-loading">Đang tải...</div>
                        ) : purchases.length === 0 ? (
                            <div className="purchase-empty">
                                <div className="purchase-empty-icon"><MdInventory size={64} /></div>
                                <p>Chưa có đơn nhập hàng</p>
                            </div>
                        ) : (
                            <table className="purchase-table-v2">
                                <thead>
                                    <tr>
                                        <th className="col-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.size === purchases.length && purchases.length > 0}
                                                onChange={toggleSelectAll}
                                            />
                                        </th>
                                        <th className="col-star"></th>
                                        <th>Mã nhập hàng</th>
                                        <th>Thời gian</th>
                                        <th>Mã NCC</th>
                                        <th>Nhà cung cấp</th>
                                        <th className="col-amount">Cần trả NCC</th>
                                        <th>Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {purchases.map((p) => (
                                        <tr key={p.id} className={selectedIds.has(p.id) ? 'selected' : ''}>
                                            <td className="col-checkbox">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(p.id)}
                                                    onChange={() => toggleSelection(p.id)}
                                                />
                                            </td>
                                            <td className="col-star">
                                                <button className="btn-star" onClick={() => toggleStar(p.id)}>
                                                    {starredIds.has(p.id) ? <MdStar className="starred" /> : <MdStarBorder />}
                                                </button>
                                            </td>
                                            <td>
                                                <span
                                                    className="order-number-v2"
                                                    onClick={() => openDetailModal(p)}
                                                >
                                                    {p.orderNumber}
                                                </span>
                                            </td>
                                            <td className="col-date">{formatDate(p.createdAt)}</td>
                                            <td className="col-supplier-code">{p.supplier?.code || 'NCC' + p.supplier?.id?.slice(-6)}</td>
                                            <td className="col-supplier">{p.supplier?.name}</td>
                                            <td className="col-amount">{formatCurrency(Number(p.totalAmount))}</td>
                                            <td>
                                                <span className={`status-badge-v2 ${p.status}`}>
                                                    {STATUS_LABELS[p.status] || p.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Pagination - KiotViet style */}
                    <div className="purchase-pagination-v2">
                        <div className="pagination-left">
                            <span>Hiển thị</span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setPage(1); }}
                                className="items-per-page"
                            >
                                <option value={15}>15 dòng</option>
                                <option value={30}>30 dòng</option>
                                <option value={50}>50 dòng</option>
                            </select>
                        </div>
                        <div className="pagination-center">
                            <button
                                className="pagination-btn-v2"
                                onClick={() => setPage(1)}
                                disabled={page <= 1}
                            >
                                ⟨⟨
                            </button>
                            <button
                                className="pagination-btn-v2"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1}
                            >
                                ⟨
                            </button>
                            <span className="pagination-current">{page}</span>
                            <button
                                className="pagination-btn-v2"
                                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                                disabled={page >= meta.totalPages}
                            >
                                ⟩
                            </button>
                            <button
                                className="pagination-btn-v2"
                                onClick={() => setPage(meta.totalPages)}
                                disabled={page >= meta.totalPages}
                            >
                                ⟩⟩
                            </button>
                        </div>
                        <div className="pagination-right">
                            {((page - 1) * itemsPerPage) + 1} - {Math.min(page * itemsPerPage, meta.total)} trong {meta.total} giao dịch
                        </div>
                    </div>
                </div>
            </div>

            {/* Full-page Create/Edit Purchase Form */}
            {isModalOpen && (
                <div className="purchase-create-page">
                    {/* Header */}
                    <div className="create-header">
                        <div className="create-header-left">
                            <button className="btn-back" onClick={closeModal}>
                                ←
                            </button>
                            <h2>Nhập hàng</h2>
                        </div>
                        <div className="create-header-center">
                            <div className="product-search-box">
                                <MdSearch className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Tìm hàng hóa theo mã hoặc tên (F3)"
                                    className="product-search-input"
                                />
                            </div>
                            <button className="btn-barcode" title="Quét mã vạch">
                                <span>⊞</span>
                            </button>
                            <button className="btn-add-inline" onClick={addItem}>
                                +
                            </button>
                        </div>
                        <div className="create-header-right">
                            <span className="create-date">{new Date().toLocaleDateString('vi-VN')} {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="create-content">
                        {/* Left: Product Table */}
                        <div className="create-left">
                            <table className="create-product-table">
                                <thead>
                                    <tr>
                                        <th className="col-stt">STT</th>
                                        <th className="col-code">Mã hàng</th>
                                        <th className="col-name">Tên hàng</th>
                                        <th className="col-unit">ĐVT</th>
                                        <th className="col-qty">Số lượng</th>
                                        <th className="col-price">Đơn giá</th>
                                        <th className="col-discount">Giảm giá</th>
                                        <th className="col-total">Thành tiền</th>
                                        <th className="col-action"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, idx) => {
                                        const product = products.find(p => p.id === item.productId);
                                        const lineTotal = item.quantity * item.unitCost;
                                        return (
                                            <tr key={idx}>
                                                <td className="col-stt">{idx + 1}</td>
                                                <td className="col-code">
                                                    <select
                                                        value={item.productId}
                                                        onChange={(e) => updateItem(idx, 'productId', e.target.value)}
                                                        className="inline-select"
                                                    >
                                                        <option value="">-- Chọn SP --</option>
                                                        {products.map((p) => (
                                                            <option key={p.id} value={p.id}>
                                                                {p.sku || p.id.slice(-8)}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="col-name">{product?.name || '-'}</td>
                                                <td className="col-unit">Cái</td>
                                                <td className="col-qty">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity}
                                                        onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                                                        className="inline-input qty-input"
                                                    />
                                                </td>
                                                <td className="col-price">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={item.unitCost}
                                                        onChange={(e) => updateItem(idx, 'unitCost', e.target.value)}
                                                        className="inline-input price-input"
                                                    />
                                                </td>
                                                <td className="col-discount">0</td>
                                                <td className="col-total">{formatCurrency(lineTotal)}</td>
                                                <td className="col-action">
                                                    {items.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeItem(idx)}
                                                            className="btn-remove-row"
                                                        >
                                                            ×
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {items.length === 1 && !items[0].productId && (
                                <div className="empty-products">
                                    <h3>Thêm sản phẩm từ file excel</h3>
                                    <p>(Tải về file mẫu: <a href="#">Excel file</a>)</p>
                                    <button className="btn-import-excel">
                                        📁 Chọn file dữ liệu
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Right: Info Sidebar */}
                        <div className="create-right">
                            <div className="info-section">
                                <div className="store-search">
                                    <select className="store-select">
                                        <option>Mixu</option>
                                    </select>
                                    <button className="btn-add-store">+</button>
                                </div>
                            </div>

                            <div className="info-section compact">
                                <div className="supplier-search-compact">
                                    <select
                                        value={formData.supplierId}
                                        onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                                        className="supplier-select-sm"
                                    >
                                        <option value="">Tìm NCC</option>
                                        {suppliers.map((s) => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                    <button className="btn-add-supplier-sm">+</button>
                                </div>
                            </div>

                            <div className="info-row">
                                <span className="info-label">Mã phiếu nhập</span>
                                <span className={`info-value ${items.some(i => i.productId) ? 'code-active' : 'muted'}`}>
                                    {items.some(i => i.productId)
                                        ? `PN${new Date().toISOString().slice(0, 10).replace(/-/g, '')}0001`
                                        : 'Mã phiếu tự động'}
                                </span>
                            </div>

                            <div className="info-row">
                                <span className="info-label">Mã đặt hàng nhập</span>
                                <span className="info-value"></span>
                            </div>

                            <div className="info-row">
                                <span className="info-label">Trạng thái</span>
                                <span className="info-value status-temp">Phiếu tạm</span>
                            </div>

                            <div className="info-row">
                                <span className="info-label">Tổng tiền hàng</span>
                                <input type="text" value="0" readOnly className="info-input" />
                                <span className="info-amount">{formatCurrency(totalAmount)}</span>
                            </div>

                            <div className="info-row">
                                <span className="info-label">Giảm giá</span>
                                <input type="text" value="0" className="info-input discount-input" />
                            </div>

                            <div className="info-row highlight">
                                <span className="info-label">Cần trả nhà cung cấp</span>
                                <span className="info-amount total-pay">{formatCurrency(totalAmount)}</span>
                            </div>

                            <div className="note-section">
                                <textarea
                                    value={formData.note}
                                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                                    placeholder="Ghi chú"
                                    className="note-textarea"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="create-footer">
                        <button
                            type="button"
                            onClick={() => { handleSubmit(new Event('submit') as any); }}
                            className="btn-save-temp"
                            disabled={submitting}
                        >
                            💾 Lưu tạm
                        </button>
                        <button
                            type="button"
                            onClick={() => { handleSubmit(new Event('submit') as any); }}
                            className="btn-complete"
                            disabled={submitting}
                        >
                            ✓ Hoàn thành
                        </button>
                    </div>
                </div>
            )}

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
