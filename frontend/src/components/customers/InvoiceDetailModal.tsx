import { useState, useEffect } from 'react';
import { invoicesAPI } from '../../services/api';
import { MdClose, MdOpenInNew, MdEdit } from 'react-icons/md';
import './InvoiceDetailModal.css';

interface InvoiceItem {
    id: string;
    productCode?: string;
    barcode?: string;
    productName?: string;
    unit?: string;
    quantity: number;
    unitPrice: number;
    discountPercent?: number;
    discountAmount?: number;
    salePrice?: number;
    totalPrice: number;
}

interface InvoiceDetail {
    id: string;
    invoiceNumber: string;
    branch?: string;
    customerCode?: string;
    customerName?: string;
    customerPhone?: string;
    customerAddress?: string;
    seller?: string;
    creator?: string;
    salesChannel?: string;
    priceList?: string;
    status: string;
    totalAmount: number;
    discountAmount?: number;
    amountDue?: number;
    amountPaid?: number;
    notes?: string;
    createdAt: string;
    items?: InvoiceItem[];
}

interface InvoiceDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoiceId: string;
    onOpenInvoice?: (invoiceId: string) => void;
}

export default function InvoiceDetailModal({
    isOpen,
    onClose,
    invoiceId,
    onOpenInvoice,
}: InvoiceDetailModalProps) {
    const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && invoiceId) {
            fetchInvoiceDetail();
        }
    }, [isOpen, invoiceId]);

    const fetchInvoiceDetail = async () => {
        setLoading(true);
        try {
            const response = await invoicesAPI.getOne(invoiceId);
            const data = response.data?.data || response.data;
            setInvoice({
                ...data,
                id: data.id?.toString() || invoiceId,
                items: Array.isArray(data.items)
                    ? data.items.map((item: any) => ({
                        ...item,
                        id: item.id?.toString(),
                    }))
                    : [],
            });
        } catch (error) {
            console.error('Failed to fetch invoice detail:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: number): string => {
        return new Intl.NumberFormat('vi-VN').format(value || 0);
    };

    const formatDateTime = (dateStr: string): string => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('vi-VN') + ' ' + date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'Hoàn thành';
            case 'CANCELLED': return 'Đã hủy';
            case 'DRAFT': return 'Nháp';
            default: return status;
        }
    };

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'status-completed';
            case 'CANCELLED': return 'status-cancelled';
            case 'DRAFT': return 'status-draft';
            default: return '';
        }
    };

    const handleOpenInvoice = () => {
        onClose();
        if (onOpenInvoice) {
            onOpenInvoice(invoiceId);
        }
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const totalQuantity = invoice?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    const totalItemsAmount = invoice?.items?.reduce((sum, item) => sum + item.totalPrice, 0) || 0;
    const discountAmount = invoice?.discountAmount || 0;
    const amountDue = invoice?.amountDue || (totalItemsAmount - discountAmount);
    const amountPaid = invoice?.amountPaid || 0;

    return (
        <div className="invoice-detail-modal-overlay" onClick={handleOverlayClick}>
            <div className="invoice-detail-modal">
                {/* Header */}
                <div className="invoice-detail-header">
                    <h3>Hóa đơn</h3>
                    <button className="close-btn" onClick={onClose}>
                        <MdClose size={20} />
                    </button>
                </div>

                {loading ? (
                    <div className="invoice-detail-loading">Đang tải...</div>
                ) : invoice ? (
                    <div className="invoice-detail-content">
                        {/* Customer & Invoice Info */}
                        <div className="invoice-info-row">
                            <div className="invoice-customer-info">
                                <span className="customer-name">{invoice.customerName || 'Khách lẻ'}</span>
                                <a href="#" className="invoice-number-link">
                                    <MdOpenInNew size={14} />
                                    {invoice.invoiceNumber}
                                </a>
                                <span className={`status-badge ${getStatusClass(invoice.status)}`}>
                                    {getStatusLabel(invoice.status)}
                                </span>
                            </div>
                            <div className="invoice-branch">
                                {invoice.branch || 'Chi nhánh trung tâm'}
                            </div>
                        </div>

                        {/* Metadata */}
                        <div className="invoice-metadata">
                            <div className="metadata-row">
                                <div className="metadata-item">
                                    <span className="label">Người tạo:</span>
                                    <span className="value">{invoice.creator || 'N/A'}</span>
                                </div>
                                <div className="metadata-item">
                                    <span className="label">Người bán:</span>
                                    <span className="value">{invoice.seller || 'N/A'}</span>
                                </div>
                                <div className="metadata-item">
                                    <span className="label">Ngày bán:</span>
                                    <span className="value">{formatDateTime(invoice.createdAt)}</span>
                                </div>
                            </div>
                            <div className="metadata-row">
                                <div className="metadata-item">
                                    <span className="label">Kênh bán:</span>
                                    <span className="value">{invoice.salesChannel || 'Bán trực tiếp'}</span>
                                </div>
                                <div className="metadata-item">
                                    <span className="label">Bảng giá:</span>
                                    <span className="value">{invoice.priceList || 'Bảng giá chung'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="invoice-items-table-wrapper">
                            <table className="invoice-items-table">
                                <thead>
                                    <tr>
                                        <th className="col-code">Mã hàng</th>
                                        <th className="col-name">Tên hàng</th>
                                        <th className="col-qty text-center">Số lượng</th>
                                        <th className="col-price text-right">Đơn giá</th>
                                        <th className="col-discount text-right">Giảm giá</th>
                                        <th className="col-sale-price text-right">Giá bán</th>
                                        <th className="col-total text-right">Thành tiền</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoice.items && invoice.items.length > 0 ? (
                                        invoice.items.map((item, index) => (
                                            <tr key={item.id || index}>
                                                <td className="code-cell">
                                                    <a href="#">{item.productCode || item.barcode || '-'}</a>
                                                </td>
                                                <td>{item.productName || '-'}</td>
                                                <td className="text-center">{item.quantity}</td>
                                                <td className="text-right">{formatCurrency(item.unitPrice)}</td>
                                                <td className="text-right">{formatCurrency(item.discountAmount || 0)}</td>
                                                <td className="text-right">{formatCurrency(item.salePrice || item.unitPrice)}</td>
                                                <td className="text-right total-cell">{formatCurrency(item.totalPrice)}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className="empty-row">Không có sản phẩm</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer Section - Notes + Totals */}
                        <div className="invoice-footer-section">
                            {/* Notes - Left side */}
                            <div className="invoice-notes">
                                <MdEdit size={16} />
                                <span>{invoice.notes || 'Chưa có ghi chú'}</span>
                            </div>

                            {/* Totals - Right side */}
                            <div className="invoice-totals">
                                <div className="total-row">
                                    <span className="total-label">Tổng tiền hàng ({totalQuantity})</span>
                                    <span className="total-value">{formatCurrency(totalItemsAmount)}</span>
                                </div>
                                <div className="total-row">
                                    <span className="total-label">Giảm giá hóa đơn</span>
                                    <span className="total-value">{formatCurrency(discountAmount)}</span>
                                </div>
                                <div className="total-row highlight">
                                    <span className="total-label">Khách cần trả</span>
                                    <span className="total-value">{formatCurrency(amountDue)}</span>
                                </div>
                                <div className="total-row">
                                    <span className="total-label">Khách đã trả</span>
                                    <span className="total-value paid">{formatCurrency(amountPaid)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Footer */}
                        <div className="invoice-detail-footer">
                            <button className="btn-open-invoice" onClick={handleOpenInvoice}>
                                <MdOpenInNew size={16} />
                                Mở phiếu
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="invoice-detail-error">Không thể tải thông tin hóa đơn</div>
                )}
            </div>
        </div>
    );
}
