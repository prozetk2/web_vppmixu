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

    const handleExportFile = () => {
        // Simple export - just transactions list
        if (!customer || !debtData) {
            alert('Không có dữ liệu để xuất');
            return;
        }

        const wb = XLSX.utils.book_new();
        const data = [
            ['Danh sách giao dịch công nợ - ' + customer.name],
            [],
            ['Mã phiếu', 'Thời gian', 'Loại', 'Giá trị', 'Dư nợ'],
            ...debtData.transactions.map(tx => [
                tx.code,
                formatDateTime(tx.time),
                tx.type,
                Math.abs(tx.value),
                tx.runningBalance
            ])
        ];
        const ws = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Giao dịch');
        XLSX.writeFile(wb, `GiaoDich_${customer.code || 'KH'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
                                    <th className="text-right">Dư nợ khách hàng</th>
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
                                                <td className="text-right">{formatCurrency(tx.runningBalance)}</td>
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
                currentDebt={customer.currentDebt || 0}
                invoices={invoices.map(inv => ({
                    ...inv,
                    amountDue: inv.amountDue || (inv.totalAmount - inv.amountPaid)
                }))}
                onSuccess={handlePaymentSuccess}
            />

            {/* Adjustment Modal */}
            <AdjustmentModal
                isOpen={isAdjustmentModalOpen}
                onClose={() => setIsAdjustmentModalOpen(false)}
                customerId={customerId}
                customerName={customer.name}
                currentDebt={customer.currentDebt || 0}
                onSuccess={handleAdjustmentSuccess}
            />

            {/* Discount Modal */}
            <DiscountModal
                isOpen={isDiscountModalOpen}
                onClose={() => setIsDiscountModalOpen(false)}
                customerId={customerId}
                customerName={customer.name}
                customerAddress={customer.address}
                currentDebt={customer.currentDebt || 0}
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
                currentDebt={customer.currentDebt || 0}
                transactions={debtData?.transactions || []}
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
