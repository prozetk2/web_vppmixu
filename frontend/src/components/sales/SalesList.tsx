import { useState, useEffect } from 'react';
import { salesAPI } from '../../services/api';
import Modal from '../shared/Modal';
import { Toast, useToast } from '../shared/Toast';
import './SalesList.css';

interface OrderItem {
    id: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    variant: {
        product: { name: string };
    };
}

interface Order {
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    subtotal: number;
    discountAmount?: number;
    createdAt: string;
    customer?: { name: string; phone?: string };
    orderItems: OrderItem[];
    payments?: { amount: number; method: string }[];
}

const STATUS_LABELS: Record<string, string> = {
    PENDING: 'Chờ xử lý',
    COMPLETED: 'Hoàn thành',
    CANCELLED: 'Đã hủy',
    RETURNED: 'Đã trả hàng',
};

export default function SalesList() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [returning, setReturning] = useState(false);

    const toast = useToast();

    useEffect(() => {
        fetchOrders();
    }, [page, statusFilter]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const params: Record<string, unknown> = { page, limit: 15 };
            if (search) params.search = search;
            if (statusFilter) params.status = statusFilter;

            const response = await salesAPI.getAll(params);
            const data = response.data?.data || [];
            setOrders(data.map((o: any) => ({
                ...o,
                id: o.id.toString(),
            })));
            setMeta(response.data?.meta || { total: 0, totalPages: 1 });
        } catch (error) {
            console.error('Failed to fetch orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        setPage(1);
        fetchOrders();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearch();
    };

    const openDetail = (order: Order) => {
        setSelectedOrder(order);
    };

    const closeDetail = () => {
        setSelectedOrder(null);
    };

    const handleReturn = async () => {
        if (!selectedOrder) return;
        if (!confirm(`Xác nhận trả hàng đơn ${selectedOrder.orderNumber}?`)) return;

        setReturning(true);
        try {
            await salesAPI.returnOrder(selectedOrder.id);
            toast.success('Trả hàng thành công');
            closeDetail();
            fetchOrders();
        } catch (error: any) {
            const message = error.response?.data?.message || 'Có lỗi xảy ra';
            toast.error(message);
        } finally {
            setReturning(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN').format(value);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('vi-VN');
    };

    return (
        <div className="sales-list">
            <Toast toasts={toast.toasts} onRemove={toast.removeToast} />

            <div className="sales-header">
                <h2>📄 Danh sách hóa đơn</h2>
            </div>

            <div className="sales-filters">
                <input
                    type="text"
                    placeholder="Tìm mã đơn hàng..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="filter-input"
                />
                <select
                    value={statusFilter}
                    onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setPage(1);
                    }}
                    className="filter-select"
                >
                    <option value="">Tất cả trạng thái</option>
                    <option value="COMPLETED">Hoàn thành</option>
                    <option value="PENDING">Chờ xử lý</option>
                    <option value="CANCELLED">Đã hủy</option>
                    <option value="RETURNED">Đã trả hàng</option>
                </select>
                <button onClick={handleSearch} className="filter-input" style={{ cursor: 'pointer' }}>
                    🔍 Tìm
                </button>
            </div>

            <div className="sales-table-wrapper">
                {loading ? (
                    <div className="sales-loading">Đang tải...</div>
                ) : orders.length === 0 ? (
                    <div className="sales-empty">
                        <div className="sales-empty-icon">📭</div>
                        <p>Chưa có hóa đơn nào</p>
                    </div>
                ) : (
                    <table className="sales-table">
                        <thead>
                            <tr>
                                <th>Mã đơn</th>
                                <th>Khách hàng</th>
                                <th>Tổng tiền</th>
                                <th>Trạng thái</th>
                                <th>Ngày tạo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order) => (
                                <tr key={order.id}>
                                    <td>
                                        <span
                                            className="order-number"
                                            onClick={() => openDetail(order)}
                                        >
                                            {order.orderNumber}
                                        </span>
                                    </td>
                                    <td className="order-customer">
                                        {order.customer?.name || 'Khách lẻ'}
                                    </td>
                                    <td className="order-total">
                                        {formatCurrency(Number(order.totalAmount))}đ
                                    </td>
                                    <td>
                                        <span className={`order-status ${order.status}`}>
                                            {STATUS_LABELS[order.status] || order.status}
                                        </span>
                                    </td>
                                    <td className="order-date">
                                        {formatDate(order.createdAt)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {meta.totalPages > 1 && (
                <div className="sales-pagination">
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

            {/* Order Detail Modal */}
            <Modal
                isOpen={!!selectedOrder}
                onClose={closeDetail}
                title={`Chi tiết đơn hàng ${selectedOrder?.orderNumber || ''}`}
            >
                {selectedOrder && (
                    <div className="order-detail">
                        <div className="order-info-grid">
                            <div className="info-item">
                                <span className="info-label">Mã đơn</span>
                                <span className="info-value">{selectedOrder.orderNumber}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Trạng thái</span>
                                <span className={`order-status ${selectedOrder.status}`}>
                                    {STATUS_LABELS[selectedOrder.status]}
                                </span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Khách hàng</span>
                                <span className="info-value">
                                    {selectedOrder.customer?.name || 'Khách lẻ'}
                                </span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Ngày tạo</span>
                                <span className="info-value">
                                    {formatDate(selectedOrder.createdAt)}
                                </span>
                            </div>
                        </div>

                        <table className="order-items-table">
                            <thead>
                                <tr>
                                    <th>Sản phẩm</th>
                                    <th>SL</th>
                                    <th>Đơn giá</th>
                                    <th>Thành tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedOrder.orderItems.map((item) => (
                                    <tr key={item.id}>
                                        <td>{item.variant?.product?.name || 'N/A'}</td>
                                        <td>{Number(item.quantity)}</td>
                                        <td>{formatCurrency(Number(item.unitPrice))}đ</td>
                                        <td>{formatCurrency(Number(item.totalPrice))}đ</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="order-totals">
                            <div className="order-total-row">
                                <span>Tạm tính:</span>
                                <span>{formatCurrency(Number(selectedOrder.subtotal))}đ</span>
                            </div>
                            {Number(selectedOrder.discountAmount) > 0 && (
                                <div className="order-total-row">
                                    <span>Giảm giá:</span>
                                    <span>-{formatCurrency(Number(selectedOrder.discountAmount))}đ</span>
                                </div>
                            )}
                            <div className="order-total-row grand">
                                <span>Tổng cộng:</span>
                                <span>{formatCurrency(Number(selectedOrder.totalAmount))}đ</span>
                            </div>
                        </div>

                        <div className="order-actions">
                            {selectedOrder.status === 'COMPLETED' && (
                                <button
                                    className="btn-return"
                                    onClick={handleReturn}
                                    disabled={returning}
                                >
                                    {returning ? 'Đang xử lý...' : '↩️ Trả hàng'}
                                </button>
                            )}
                            <button className="btn-close" onClick={closeDetail}>
                                Đóng
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
