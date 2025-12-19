import { useState, useEffect, useCallback } from 'react';
import { inventoryAPI, warehousesAPI } from '../../services/api';
import Modal from '../shared/Modal';
import { Toast, useToast } from '../shared/Toast';
import StockAdjustment from './StockAdjustment';
import { MdSearch, MdInventory } from 'react-icons/md';
import './InventoryOverview.css';

interface StockItem {
    id: string;
    warehouseId: string;
    warehouseName: string;
    warehouseCode?: string;
    productId: string;
    productName: string;
    sku?: string;
    barcode?: string;
    categoryName?: string;
    quantity: number;
    reserved: number;
    available: number;
    updatedAt: string;
}

interface Warehouse {
    id: string;
    name: string;
    code?: string;
}

interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
}

export default function InventoryOverview() {
    const [stockItems, setStockItems] = useState<StockItem[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState<PaginationMeta>({
        page: 1,
        limit: 20,
        total: 0,
    });

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [warehouseFilter, setWarehouseFilter] = useState('');

    // Modal
    const [isAdjustOpen, setIsAdjustOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const toast = useToast();

    // Fetch warehouses on mount
    useEffect(() => {
        fetchWarehouses();
    }, []);

    // Fetch stock when filters change
    useEffect(() => {
        fetchStock();
    }, [warehouseFilter, pagination.page]);

    const fetchWarehouses = async () => {
        try {
            const response = await warehousesAPI.getAll();
            setWarehouses(response.data?.data || response.data || []);
        } catch (error) {
            console.error('Failed to fetch warehouses:', error);
        }
    };

    const fetchStock = useCallback(async () => {
        setLoading(true);
        try {
            const response = await inventoryAPI.getStock({
                warehouseId: warehouseFilter || undefined,
                page: pagination.page,
                limit: pagination.limit,
            });

            const data = response.data;
            setStockItems(data.data || []);
            if (data.meta) {
                setPagination((prev) => ({
                    ...prev,
                    total: data.meta.total,
                }));
            }
        } catch (error) {
            console.error('Failed to fetch stock:', error);
            toast.error('Không thể tải dữ liệu tồn kho');
        } finally {
            setLoading(false);
        }
    }, [warehouseFilter, pagination.page, pagination.limit]);

    const handleAdjustSubmit = async (data: {
        warehouseId: string;
        productId: string;
        quantity: number;
        type: 'IMPORT' | 'EXPORT' | 'ADJUST';
        note?: string;
    }) => {
        setIsSubmitting(true);
        try {
            await inventoryAPI.adjustStock(data);
            toast.success('Điều chỉnh tồn kho thành công');
            setIsAdjustOpen(false);
            fetchStock();
        } catch (error: any) {
            const message = error.response?.data?.message;
            if (message === 'INSUFFICIENT_STOCK') {
                toast.error('Tồn kho không đủ để xuất');
            } else {
                toast.error(message || 'Có lỗi xảy ra');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const getQuantityClass = (qty: number) => {
        if (qty <= 0) return 'low';
        if (qty < 10) return 'medium';
        return 'high';
    };

    const getStatusBadge = (available: number) => {
        if (available <= 0) return <span className="badge badge-danger">Hết hàng</span>;
        if (available < 10) return <span className="badge badge-warning">Sắp hết</span>;
        return <span className="badge badge-success">Còn hàng</span>;
    };

    // Summary stats
    const totalItems = stockItems.length;
    const totalQuantity = stockItems.reduce((sum, item) => sum + item.quantity, 0);
    const lowStockCount = stockItems.filter((item) => item.available < 10).length;

    // Filter by search term (client-side for immediate feedback)
    const filteredItems = stockItems.filter(
        (item) =>
            !searchTerm ||
            item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="inventory-overview">
            <Toast toasts={toast.toasts} onRemove={toast.removeToast} />

            {/* Summary Cards */}
            <div className="summary-cards">
                <div className="summary-card">
                    <div className="summary-card-title">Tổng mặt hàng</div>
                    <div className="summary-card-value">{totalItems}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-title">Tổng tồn kho</div>
                    <div className="summary-card-value">{totalQuantity.toLocaleString()}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-title">Sắp hết hàng</div>
                    <div className="summary-card-value" style={{ color: lowStockCount > 0 ? '#f59e0b' : undefined }}>
                        {lowStockCount}
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="inventory-toolbar">
                <div className="toolbar-filters">
                    <div className="search-box">
                        <span className="search-icon"><MdSearch /></span>
                        <input
                            type="text"
                            placeholder="Tìm theo tên, SKU..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </div>
                    <select
                        value={warehouseFilter}
                        onChange={(e) => {
                            setWarehouseFilter(e.target.value);
                            setPagination((prev) => ({ ...prev, page: 1 }));
                        }}
                        className="filter-select"
                    >
                        <option value="">Tất cả kho</option>
                        {warehouses.map((wh) => (
                            <option key={wh.id} value={wh.id}>
                                {wh.name}
                            </option>
                        ))}
                    </select>
                </div>
                <button onClick={() => setIsAdjustOpen(true)} className="btn-adjust">
                    <span><MdInventory /></span> Điều chỉnh kho
                </button>
            </div>

            {/* Table */}
            <div className="inventory-table-wrapper">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner-large"></div>
                        <p>Đang tải dữ liệu...</p>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon"><MdInventory size={64} /></div>
                        <h3>Chưa có dữ liệu tồn kho</h3>
                        <p>Thêm sản phẩm vào kho bằng cách điều chỉnh tồn kho</p>
                    </div>
                ) : (
                    <table className="inventory-table">
                        <thead>
                            <tr>
                                <th>Sản phẩm</th>
                                <th>SKU</th>
                                <th>Kho</th>
                                <th>Danh mục</th>
                                <th className="text-right">Số lượng</th>
                                <th className="text-right">Đã đặt</th>
                                <th className="text-right">Khả dụng</th>
                                <th className="text-center">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.map((item) => (
                                <tr key={item.id}>
                                    <td className="product-name">{item.productName}</td>
                                    <td className="sku">{item.sku || '—'}</td>
                                    <td>
                                        <div className="warehouse-name">
                                            {item.warehouseName}
                                            {item.warehouseCode && (
                                                <span className="warehouse-code">{item.warehouseCode}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>{item.categoryName || '—'}</td>
                                    <td className="text-right">
                                        <span className={`quantity ${getQuantityClass(item.quantity)}`}>
                                            {item.quantity.toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="text-right">{item.reserved.toLocaleString()}</td>
                                    <td className="text-right">
                                        <span className={`quantity ${getQuantityClass(item.available)}`}>
                                            {item.available.toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="text-center">{getStatusBadge(item.available)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Adjust Modal */}
            <Modal
                isOpen={isAdjustOpen}
                onClose={() => setIsAdjustOpen(false)}
                title="Điều chỉnh tồn kho"
                size="md"
            >
                <StockAdjustment
                    warehouses={warehouses}
                    onSubmit={handleAdjustSubmit}
                    onCancel={() => setIsAdjustOpen(false)}
                    isLoading={isSubmitting}
                />
            </Modal>
        </div>
    );
}
