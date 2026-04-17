import { useState, useEffect } from 'react';
import { customersAPI } from '../../services/api';
import {
    MdPerson,
    MdPhone,
    MdEmail,
    MdLocationOn,
    MdCake,
    MdEdit,
    MdDelete,
    MdAttachMoney,
    MdFileDownload,
    MdPayment,
    MdTune,
    MdQrCode,
    MdBusiness,
    MdFacebook,
} from 'react-icons/md';
import PaymentModal from './PaymentModal';
import AdjustmentModal from './AdjustmentModal';
import DiscountModal from './DiscountModal';
import ExportDebtModal from './ExportDebtModal';
import InvoiceDetailModal from './InvoiceDetailModal';
import * as XLSX from 'xlsx';
import './CustomerDetail.css';

interface CustomerDetailProps {
    customerId: string;
    onEdit: () => void;
    onDelete: () => void;
    onRefresh?: () => void;
    onOpenInvoice?: (invoiceId: string) => void;
}

interface Customer {
    id: string;
    code?: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    taxNumber?: string;
    branch?: string;
    customerGroup?: string;
    creator?: string;
    createdAt: string;
    birthDate?: string;
    gender?: string;
    facebook?: string;
    notes?: string;
    company?: string;
    active?: boolean;
    currentDebt?: number;
    totalSales?: number;
    debtDays?: number;
}

interface Invoice {
    id: string;
    invoiceNumber: string;
    orderCode?: string;
    totalAmount: number;
    amountPaid: number;
    amountDue: number;
    status: string;
    seller: string;
    branch?: string;
    createdAt: string;
    items?: TransactionItem[];
}

interface TransactionItem {
    productCode: string;
    productName: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    salePrice: number;
    totalPrice: number;
}

interface DebtTransaction {
    id: string;
    code: string;
    time: string;
    type: string;
    value: number;
    runningBalance: number;
    items?: TransactionItem[];
    note?: string;
}

interface DebtData {
    customerId: string;
    customerName: string;
    customerCode?: string;
    totalSales: number;
    totalPaid: number;
    totalDebt: number;
    transactionCount: number;
    transactions: DebtTransaction[];
}

type TabType = 'info' | 'history' | 'debt';

export default function CustomerDetail({
    customerId,
    onEdit,
    onDelete,
    onOpenInvoice,
}: CustomerDetailProps) {
    const [activeTab, setActiveTab] = useState<TabType>('info');
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [debtData, setDebtData] = useState<DebtData | null>(null);
    const [loading, setLoading] = useState(true);
    const [debtFilter, setDebtFilter] = useState('all');
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
    const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
    const [isExportDebtModalOpen, setIsExportDebtModalOpen] = useState(false);
    const [isInvoiceDetailModalOpen, setIsInvoiceDetailModalOpen] = useState(false);
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

    const handleInvoiceClick = (invoiceId: string) => {
        setSelectedInvoiceId(invoiceId);
        setIsInvoiceDetailModalOpen(true);
    };

    const handleOpenInvoiceFromModal = (invoiceId: string) => {
        setIsInvoiceDetailModalOpen(false);
        if (onOpenInvoice) {
            onOpenInvoice(invoiceId);
        }
    };

    useEffect(() => {
        fetchCustomer();
    }, [customerId]);

    useEffect(() => {
        if (activeTab === 'history') {
            fetchInvoices();
        } else if (activeTab === 'debt') {
            fetchDebts();
            fetchInvoices(); // Also fetch invoices to match codes for clicking
        }
    }, [activeTab, customerId]);

    useEffect(() => {
        if (activeTab === 'debt') {
            fetchDebts();
        }
    }, [debtFilter]);

    const fetchCustomer = async () => {
        setLoading(true);
        try {
            const response = await customersAPI.getOne(customerId);
            setCustomer(response.data?.data || response.data);
        } catch (error) {
            console.error('Failed to fetch customer:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchInvoices = async () => {
        try {
            const response = await customersAPI.getInvoices(customerId);
            setInvoices(response.data?.data || response.data || []);
        } catch (error) {
            console.error('Failed to fetch invoices:', error);
        }
    };

    const fetchDebts = async () => {
        try {
            const response = await customersAPI.getDebts(customerId, debtFilter);
            setDebtData(response.data?.data || response.data);
        } catch (error) {
            console.error('Failed to fetch debts:', error);
        }
    };

    const formatCurrency = (value: number): string => {
        return new Intl.NumberFormat('vi-VN').format(value);
    };

    const getPositiveDebtValue = (value?: number | null): number => {
        return Math.abs(Number(value || 0));
    };

    const resolveInvoiceAmountDue = (invoice: Pick<Invoice, 'amountDue' | 'totalAmount' | 'amountPaid'>): number => {
        if (invoice.amountDue !== null && invoice.amountDue !== undefined) {
            return Math.max(0, Number(invoice.amountDue || 0));
        }

        return Math.max(0, Number(invoice.totalAmount || 0) - Number(invoice.amountPaid || 0));
    };

    const formatDate = (dateStr: string): string => {
        if (!dateStr) return 'Chưa có';
        const date = new Date(dateStr);
        return date.toLocaleDateString('vi-VN');
    };

    const formatDateTime = (dateStr: string): string => {
        if (!dateStr) return 'Chưa có';
        const date = new Date(dateStr);
        return date.toLocaleDateString('vi-VN') + ' ' + date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    const getInvoiceStatusLabel = (status?: string): string => {
        if (status === 'COMPLETED') return 'Hoàn thành';
        if (status === 'CANCELLED') return 'Đã hủy';
        if (status === 'DRAFT') return 'Nháp';
        return status || '';
    };

    const getTransactionItems = (tx: DebtTransaction): TransactionItem[] => {
        if (tx.items && tx.items.length > 0) {
            return tx.items;
        }

        const hasDetailedSibling = debtData?.transactions.some(
            (other) => other.id !== tx.id && other.code === tx.code && !!other.items?.length
        );
        if (hasDetailedSibling) {
            return [];
        }

        return invoices.find((inv) => inv.invoiceNumber === tx.code)?.items || [];
    };

    const handleExportFile = () => {
        if (!customer) {
            alert('Không có dữ liệu để xuất');
            return;
        }

        if (activeTab === 'history') {
            // Export invoice history with invoice line details
            if (!invoices || invoices.length === 0) {
                alert('Không có lịch sử bán hàng để xuất');
                return;
            }

            const headers = [
                'Mã hóa đơn',
                'Thời gian',
                'Người bán',
                'Trạng thái',
                'Mã hàng',
                'Tên hàng',
                'ĐVT',
                'Số lượng',
                'Đơn giá',
                'Giảm giá',
                'Giá bán',
                'Thành tiền',
                'Tổng cộng',
                'Đã thanh toán',
                'Còn nợ',
            ];

            const exportRows = invoices.flatMap((inv) => {
                const invoiceItems = inv.items || [];
                const amountDue = getPositiveDebtValue(resolveInvoiceAmountDue(inv));

                if (invoiceItems.length > 0) {
                    return invoiceItems.map((item, index) => ([
                        index === 0 ? inv.invoiceNumber : '',
                        index === 0 ? formatDateTime(inv.createdAt) : '',
                        index === 0 ? (inv.seller || 'N/A') : '',
                        index === 0 ? getInvoiceStatusLabel(inv.status) : '',
                        item.productCode || '',
                        item.productName || '',
                        item.unit || '',
                        item.quantity || 0,
                        item.unitPrice || 0,
                        item.discountAmount || 0,
                        item.salePrice || 0,
                        item.totalPrice || 0,
                        index === 0 ? inv.totalAmount : '',
                        index === 0 ? (inv.amountPaid || 0) : '',
                        index === 0 ? amountDue : '',
                    ]));
                }

                return [[
                    inv.invoiceNumber,
                    formatDateTime(inv.createdAt),
                    inv.seller || 'N/A',
                    getInvoiceStatusLabel(inv.status),
                    '',
                    '',
                    '',
                    '',
                    '',
                    '',
                    '',
                    '',
                    inv.totalAmount,
                    inv.amountPaid || 0,
                    amountDue,
                ]];
            });

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet([headers, ...exportRows]);
            ws['!cols'] = [
                { wch: 18 }, // Mã hóa đơn
                { wch: 20 }, // Thời gian
                { wch: 15 }, // Người bán
                { wch: 15 }, // Trạng thái
                { wch: 15 }, // Mã hàng
                { wch: 30 }, // Tên hàng
                { wch: 10 }, // ĐVT
                { wch: 10 }, // Số lượng
                { wch: 15 }, // Đơn giá
                { wch: 15 }, // Giảm giá
                { wch: 15 }, // Giá bán
                { wch: 15 }, // Thành tiền
                { wch: 15 }, // Tổng cộng
                { wch: 15 }, // Đã thanh toán
                { wch: 15 }, // Còn nợ
            ];

            const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
            for (let row = range.s.r + 1; row <= range.e.r; row++) {
                ['H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'].forEach((col) => {
                    const cell = ws[`${col}${row + 1}`];
                    if (cell && typeof cell.v === 'number') {
                        cell.z = '#,##0';
                    }
                });
            }

            XLSX.utils.book_append_sheet(wb, ws, 'Lịch sử bán hàng');
            XLSX.writeFile(wb, `LichSuBanHangChiTiet_${customer.code || 'KH'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
        } else {
            // Export debt transactions with invoice line details
            if (!debtData || debtData.transactions.length === 0) {
                alert('Không có dữ liệu công nợ để xuất');
                return;
            }

            const headers = [
                'Mã phiếu',
                'Thời gian',
                'Loại',
                'Mã hàng',
                'Tên hàng',
                'ĐVT',
                'Số lượng',
                'Đơn giá',
                'Giảm giá',
                'Giá bán',
                'Thành tiền',
                'Giá trị',
                'Nợ của khách hàng',
            ];

            const exportRows = debtData.transactions.flatMap((tx) => {
                const transactionValue = getPositiveDebtValue(tx.value);
                const runningDebt = getPositiveDebtValue(tx.runningBalance);
                const transactionItems = getTransactionItems(tx);

                if (transactionItems.length > 0) {
                    return transactionItems.map((item, index) => ([
                        index === 0 ? tx.code : '',
                        index === 0 ? formatDateTime(tx.time) : '',
                        index === 0 ? tx.type : '',
                        item.productCode || '',
                        item.productName || '',
                        item.unit || '',
                        item.quantity || 0,
                        item.unitPrice || 0,
                        item.discountAmount || 0,
                        item.salePrice || 0,
                        item.totalPrice || 0,
                        index === 0 ? transactionValue : '',
                        index === 0 ? runningDebt : '',
                    ]));
                }

                return [[
                    tx.code,
                    formatDateTime(tx.time),
                    tx.type,
                    '',
                    '',
                    '',
                    '',
                    '',
                    '',
                    '',
                    '',
                    transactionValue,
                    runningDebt,
                ]];
            });

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet([headers, ...exportRows]);
            ws['!cols'] = [
                { wch: 18 }, // Mã phiếu
                { wch: 20 }, // Thời gian
                { wch: 12 }, // Loại
                { wch: 15 }, // Mã hàng
                { wch: 30 }, // Tên hàng
                { wch: 10 }, // ĐVT
                { wch: 10 }, // Số lượng
                { wch: 15 }, // Đơn giá
                { wch: 15 }, // Giảm giá
                { wch: 15 }, // Giá bán
                { wch: 15 }, // Thành tiền
                { wch: 15 }, // Giá trị
                { wch: 18 }, // Nợ của khách hàng
            ];

            const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
            for (let row = range.s.r + 1; row <= range.e.r; row++) {
                ['G', 'H', 'I', 'J', 'K', 'L', 'M'].forEach((col) => {
                    const cell = ws[`${col}${row + 1}`];
                    if (cell && typeof cell.v === 'number') {
                        cell.z = '#,##0';
                    }
                });
            }

            XLSX.utils.book_append_sheet(wb, ws, 'Công nợ chi tiết');
            XLSX.writeFile(wb, `CongNoChiTiet_${customer.code || 'KH'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
        }
    };

    const handleExportDebtFile = () => {
        setIsExportDebtModalOpen(true);
    };

    const handlePayment = () => {
        setIsPaymentModalOpen(true);
    };

    const handleAdjustment = () => {
        setIsAdjustmentModalOpen(true);
    };

    const handleCreateQR = () => {
        // TODO: Implement QR generation
        alert('Chức năng tạo QR đang được phát triển');
    };

    const handlePaymentSuccess = () => {
        // Refresh data after payment
        fetchCustomer();
        fetchDebts();
        fetchInvoices();
    };

    const handleAdjustmentSuccess = () => {
        // Refresh data after adjustment
        fetchCustomer();
        fetchDebts();
    };

    const handleDiscount = () => {
        setIsDiscountModalOpen(true);
    };

    const handleDiscountSuccess = () => {
        // Refresh data after discount
        fetchCustomer();
        fetchDebts();
    };

    if (loading || !customer) {
        return (
            <div className="customer-detail-panel">
                <div className="customer-detail-loading">Đang tải...</div>
            </div>
        );
    }

    return (
        <div className="customer-detail-panel">


            {/* Tabs Navigation */}
            <div className="customer-detail-tabs">
                <button
                    className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
                    onClick={() => setActiveTab('info')}
                >
                    Thông tin
                </button>
                <button
                    className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                >
                    Lịch sử bán/trả hàng
                </button>
                <button
                    className={`tab-btn ${activeTab === 'debt' ? 'active' : ''}`}
                    onClick={() => setActiveTab('debt')}
                >
                    Nợ cần thu từ khách
                </button>
            </div>

            {/* Tab Content */}
            <div className="customer-detail-content">
                {/* Tab: Thông tin */}
                {activeTab === 'info' && (
                    <div className="tab-info">
                        {/* Customer Profile Header */}
                        <div className="customer-profile-header">
                            <div className="customer-avatar">
                                <MdPerson size={48} />
                            </div>
                            <div className="customer-profile-info">
                                <h3 className="customer-profile-name">
                                    {customer.name} <span className="customer-profile-code">{customer.code}</span>
                                </h3>
                                <div className="customer-profile-meta">
                                    <span>Người tạo: <strong>{customer.creator || 'N/A'}</strong></span>
                                    <span>Ngày tạo: <strong>{formatDate(customer.createdAt)}</strong></span>
                                    <span>Nhóm khách: <strong>{customer.customerGroup || 'Chưa có'}</strong></span>
                                </div>
                                <a href="#" className="customer-analysis-link">
                                    📊 Xem phân tích
                                </a>
                            </div>
                            <div className="customer-branch">
                                {customer.branch || 'Chi nhánh trung tâm'}
                            </div>
                        </div>

                        {/* Info Grid */}
                        <div className="customer-info-grid">
                            <div className="info-row">
                                <div className="info-item">
                                    <label><MdPhone /> Điện thoại</label>
                                    <span>{customer.phone || 'Chưa có'}</span>
                                </div>
                                <div className="info-item">
                                    <label><MdCake /> Sinh nhật</label>
                                    <span>{customer.birthDate ? formatDate(customer.birthDate) : 'Chưa có'}</span>
                                </div>
                                <div className="info-item">
                                    <label>Giới tính</label>
                                    <span>{customer.gender || 'Chưa có'}</span>
                                </div>
                            </div>

                            <div className="info-row">
                                <div className="info-item">
                                    <label><MdEmail /> Email</label>
                                    <span>{customer.email || 'Chưa có'}</span>
                                </div>
                                <div className="info-item">
                                    <label><MdFacebook /> Facebook</label>
                                    <span>{customer.facebook || 'Chưa có'}</span>
                                </div>
                            </div>

                            <div className="info-row full-width">
                                <div className="info-item">
                                    <label><MdLocationOn /> Địa chỉ</label>
                                    <span>{customer.address || 'Chưa có'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Invoice Info Box */}
                        <div className="invoice-info-box">
                            <div className="invoice-info-title">Thông tin xuất hóa đơn</div>
                            <div className="invoice-info-content">
                                {customer.name} / {customer.phone || '—'}
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="customer-notes">
                            <MdEdit className="notes-icon" />
                            <span>{customer.notes || 'Chưa có ghi chú'}</span>
                        </div>

                        {/* Action Buttons */}
                        <div className="customer-info-actions">
                            <button className="btn-delete-outline" onClick={onDelete}>
                                <MdDelete /> Xóa
                            </button>
                            <div className="action-buttons-right">
                                <button className="btn-primary" onClick={onEdit}>
                                    <MdEdit /> Chỉnh sửa
                                </button>
                                <button className="btn-outline">
                                    <MdBusiness /> Ngừng hoạt động
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab: Lịch sử bán/trả hàng */}
                {activeTab === 'history' && (
                    <div className="tab-history">
                        <table className="history-table">
                            <thead>
                                <tr>
                                    <th>Mã hóa đơn</th>
                                    <th>Thời gian</th>
                                    <th>Người bán</th>
                                    <th className="text-right">Tổng cộng</th>
                                    <th className="text-center">Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="empty-message">
                                            Chưa có lịch sử bán hàng
                                        </td>
                                    </tr>
                                ) : (
                                    invoices.map((inv) => (
                                        <tr key={inv.id}>
                                            <td>
                                                <a
                                                    href="#"
                                                    className="invoice-link"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        handleInvoiceClick(inv.id);
                                                    }}
                                                >
                                                    {inv.invoiceNumber}
                                                </a>
                                            </td>
                                            <td>{formatDateTime(inv.createdAt)}</td>
                                            <td>{inv.seller || 'N/A'}</td>
                                            <td className="text-right">{formatCurrency(inv.totalAmount)}</td>
                                            <td className="text-center">
                                                <span className={`status-badge ${inv.status?.toLowerCase()}`}>
                                                    {inv.status === 'COMPLETED' ? 'Hoàn thành' : inv.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>

                        <div className="history-actions">
                            <button className="btn-outline" onClick={handleExportFile}>
                                <MdFileDownload /> Xuất file
                            </button>
                        </div>
                    </div>
                )}

                {/* Tab: Nợ cần thu từ khách */}
                {activeTab === 'debt' && (
                    <div className="tab-debt">
                        {/* Filter */}
                        <div className="debt-filter">
                            <select
                                value={debtFilter}
                                onChange={(e) => setDebtFilter(e.target.value)}
                                className="debt-filter-select"
                            >
                                <option value="all">Tất cả giao dịch</option>
                                <option value="Bán hàng">Bán hàng</option>
                                <option value="Thanh toán">Thanh toán</option>
                            </select>
                        </div>

                        {/* Debt Table */}
                        <table className="debt-table">
                            <thead>
                                <tr>
                                    <th>Mã phiếu</th>
                                    <th>Thời gian</th>
                                    <th>Loại</th>
                                    <th className="text-right">Giá trị</th>
                                    <th className="text-right">Nợ của khách hàng</th>
                                </tr>
                            </thead>
                            <tbody>
                                {!debtData || debtData.transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="empty-message">
                                            Chưa có giao dịch công nợ
                                        </td>
                                    </tr>
                                ) : (
                                    debtData.transactions.map((tx) => {
                                        // Find matching invoice for HD codes
                                        const matchingInvoice = tx.code.startsWith('HD')
                                            ? invoices.find(inv => inv.invoiceNumber === tx.code)
                                            : null;

                                        return (
                                            <tr key={tx.id}>
                                                <td>
                                                    {matchingInvoice ? (
                                                        <a
                                                            href="#"
                                                            className="invoice-link"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                handleInvoiceClick(matchingInvoice.id);
                                                            }}
                                                        >
                                                            {tx.code}
                                                        </a>
                                                    ) : (
                                                        <span className="code-text">{tx.code}</span>
                                                    )}
                                                </td>
                                                <td>{formatDateTime(tx.time)}</td>
                                                <td>{tx.type}</td>
                                                <td className="text-right">{formatCurrency(Math.abs(tx.value))}</td>
                                                <td className="text-right">{formatCurrency(getPositiveDebtValue(tx.runningBalance))}</td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>

                        {/* Debt Actions */}
                        <div className="debt-actions">
                            <div className="debt-actions-left">
                                <button className="btn-outline" onClick={handleExportDebtFile}>
                                    <MdFileDownload /> Xuất file công nợ
                                </button>
                                <button className="btn-outline" onClick={handleExportFile}>
                                    <MdFileDownload /> Xuất file
                                </button>
                            </div>
                            <div className="debt-actions-right">
                                <button className="btn-primary" onClick={handlePayment}>
                                    <MdPayment /> Thanh toán
                                </button>
                                <button className="btn-outline" onClick={handleAdjustment}>
                                    <MdTune /> Điều chỉnh
                                </button>
                                <button className="btn-outline" onClick={handleDiscount}>
                                    <MdAttachMoney /> Chiết khấu thanh toán
                                </button>
                                <button className="btn-outline" onClick={handleCreateQR}>
                                    <MdQrCode /> Tạo QR
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Payment Modal */}
            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                customerId={customerId}
                customerName={customer.name}
                customerAddress={customer.address}
                currentDebt={getPositiveDebtValue(customer.currentDebt)}
                invoices={invoices.map(inv => ({
                    ...inv,
                    amountDue: resolveInvoiceAmountDue(inv)
                }))}
                onSuccess={handlePaymentSuccess}
            />

            {/* Adjustment Modal */}
            <AdjustmentModal
                isOpen={isAdjustmentModalOpen}
                onClose={() => setIsAdjustmentModalOpen(false)}
                customerId={customerId}
                customerName={customer.name}
                currentDebt={getPositiveDebtValue(customer.currentDebt)}
                onSuccess={handleAdjustmentSuccess}
            />

            {/* Discount Modal */}
            <DiscountModal
                isOpen={isDiscountModalOpen}
                onClose={() => setIsDiscountModalOpen(false)}
                customerId={customerId}
                customerName={customer.name}
                customerAddress={customer.address}
                currentDebt={getPositiveDebtValue(customer.currentDebt)}
                onSuccess={handleDiscountSuccess}
            />

            {/* Export Debt Modal */}
            <ExportDebtModal
                isOpen={isExportDebtModalOpen}
                onClose={() => setIsExportDebtModalOpen(false)}
                customerName={customer.name}
                customerCode={customer.code}
                customerAddress={customer.address}
                customerPhone={customer.phone}
                currentDebt={getPositiveDebtValue(customer.currentDebt)}
                transactions={debtData?.transactions || []}
                invoiceItemsByCode={Object.fromEntries(
                    invoices
                        .filter((invoice) => invoice.invoiceNumber && invoice.items?.length)
                        .map((invoice) => [invoice.invoiceNumber, invoice.items || []])
                )}
            />

            {/* Invoice Detail Modal */}
            {selectedInvoiceId && (
                <InvoiceDetailModal
                    isOpen={isInvoiceDetailModalOpen}
                    onClose={() => setIsInvoiceDetailModalOpen(false)}
                    invoiceId={selectedInvoiceId}
                    onOpenInvoice={handleOpenInvoiceFromModal}
                />
            )}
        </div>
    );
}
