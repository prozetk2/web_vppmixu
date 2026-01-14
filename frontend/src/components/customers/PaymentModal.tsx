import { useState, useEffect } from 'react';
import { MdClose, MdPrint, MdSave } from 'react-icons/md';
import './PaymentModal.css';

interface Invoice {
    id: string;
    invoiceNumber: string;
    createdAt: string;
    totalAmount: number;
    amountPaid: number;
    amountDue: number;
}

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    customerId: string;
    customerName: string;
    customerAddress?: string;
    currentDebt: number;
    invoices: Invoice[];
    onSuccess: () => void;
}

export default function PaymentModal({
    isOpen,
    onClose,
    customerName,
    customerAddress,
    currentDebt,
    invoices,
    onSuccess,
}: PaymentModalProps) {
    const [paymentDate, setPaymentDate] = useState('');
    const [collector, setCollector] = useState('Mixu');
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [amount, setAmount] = useState<number>(0);
    const [note, setNote] = useState('');
    const [allocateToInvoices, setAllocateToInvoices] = useState(true);
    const [allocations, setAllocations] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Set default date to now
            const now = new Date();
            const dateStr = now.toISOString().slice(0, 16);
            setPaymentDate(dateStr);
            setAmount(0);
            setNote('');

            // Initialize allocations
            const allocs: Record<string, number> = {};
            invoices.forEach(inv => {
                allocs[inv.id] = 0;
            });
            setAllocations(allocs);
        }
    }, [isOpen, invoices]);

    const formatCurrency = (value: number): string => {
        return new Intl.NumberFormat('vi-VN').format(value);
    };

    const formatDateTime = (dateStr: string): string => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('vi-VN') + ' ' + date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    const handleAmountChange = (value: string) => {
        const num = parseFloat(value) || 0;
        setAmount(num);

        // Auto-allocate to invoices if enabled
        if (allocateToInvoices) {
            autoAllocate(num);
        }
    };

    const autoAllocate = (totalAmount: number) => {
        let remaining = totalAmount;
        const newAllocations: Record<string, number> = {};

        // Sort invoices by date (oldest first)
        const sortedInvoices = [...invoices].sort((a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        for (const inv of sortedInvoices) {
            const due = inv.amountDue || (inv.totalAmount - inv.amountPaid);
            if (remaining > 0 && due > 0) {
                const allocate = Math.min(remaining, due);
                newAllocations[inv.id] = allocate;
                remaining -= allocate;
            } else {
                newAllocations[inv.id] = 0;
            }
        }

        setAllocations(newAllocations);
    };

    const handleAllocationChange = (invoiceId: string, value: string) => {
        const num = parseFloat(value) || 0;
        setAllocations(prev => ({
            ...prev,
            [invoiceId]: num
        }));
    };

    const getTotalAllocated = (): number => {
        return Object.values(allocations).reduce((sum, val) => sum + val, 0);
    };

    const getUnallocated = (): number => {
        return amount - getTotalAllocated();
    };

    const getRemainingDebt = (): number => {
        return currentDebt - amount;
    };

    const handleSubmit = async (printAfter: boolean = false) => {
        if (amount <= 0) {
            alert('Vui lòng nhập số tiền thanh toán');
            return;
        }

        setLoading(true);
        try {
            // TODO: Call API to create payment receipt
            // const payload = {
            //     customerId,
            //     amount,
            //     paymentDate,
            //     collector,
            //     paymentMethod,
            //     note,
            //     allocations: allocateToInvoices ? allocations : {},
            // };
            // await paymentsAPI.create(payload);

            alert('Tạo phiếu thu thành công!');
            onSuccess();
            onClose();

            if (printAfter) {
                // TODO: Open print dialog
                console.log('Print receipt');
            }
        } catch (error) {
            console.error('Payment error:', error);
            alert('Lỗi khi tạo phiếu thu');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="payment-modal-overlay">
            <div className="payment-modal">
                <div className="payment-modal-header">
                    <div className="payment-modal-title">
                        <h2>Thanh toán</h2>
                        <span className="payment-customer-info">
                            {customerAddress || customerName} · Nợ hiện tại: {formatCurrency(currentDebt)}
                        </span>
                    </div>
                    <button className="payment-close-btn" onClick={onClose}>
                        <MdClose size={20} />
                    </button>
                </div>

                <div className="payment-modal-body">
                    {/* Row 1: Date & Collector */}
                    <div className="payment-form-row">
                        <div className="payment-form-group">
                            <label>Thời gian</label>
                            <input
                                type="datetime-local"
                                value={paymentDate}
                                onChange={(e) => setPaymentDate(e.target.value)}
                            />
                        </div>
                        <div className="payment-form-group">
                            <label>Người thu</label>
                            <select value={collector} onChange={(e) => setCollector(e.target.value)}>
                                <option value="Mixu">Mixu</option>
                                <option value="Admin">Admin</option>
                            </select>
                        </div>
                    </div>

                    {/* Row 2: Payment Method */}
                    <div className="payment-form-row">
                        <div className="payment-form-group" style={{ flex: 1 }}>
                            <label>Phương thức thanh toán</label>
                            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                                <option value="CASH">Tiền mặt</option>
                                <option value="TRANSFER">Chuyển khoản</option>
                                <option value="CARD">Thẻ</option>
                            </select>
                        </div>
                    </div>

                    {/* Row 3: Amount */}
                    <div className="payment-form-row">
                        <div className="payment-form-group amount-group">
                            <label>Số tiền</label>
                            <input
                                type="number"
                                value={amount || ''}
                                onChange={(e) => handleAmountChange(e.target.value)}
                                placeholder="0"
                                className="amount-input"
                            />
                            <span className="remaining-debt">Nợ còn: {formatCurrency(getRemainingDebt())}</span>
                        </div>
                    </div>

                    {/* Row 4: Note */}
                    <div className="payment-form-row">
                        <div className="payment-form-group">
                            <label>Ghi chú</label>
                            <input
                                type="text"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Nhập ghi chú"
                            />
                        </div>
                    </div>

                    {/* Allocate to invoices */}
                    <div className="payment-allocate-section">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={allocateToInvoices}
                                onChange={(e) => setAllocateToInvoices(e.target.checked)}
                            />
                            Phân bổ vào hóa đơn
                        </label>
                    </div>

                    {/* Invoice allocation table */}
                    {allocateToInvoices && (
                        <div className="payment-allocation-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Mã hóa đơn</th>
                                        <th>Thời gian</th>
                                        <th className="text-right">Giá trị hóa đơn</th>
                                        <th className="text-right">Đã thu trước</th>
                                        <th className="text-right">Còn cần thu</th>
                                        <th className="text-right">Tiền thu</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="total-row">
                                        <td colSpan={4}></td>
                                        <td className="text-right"><strong>{formatCurrency(currentDebt)}</strong></td>
                                        <td></td>
                                    </tr>
                                    {invoices.map((inv) => {
                                        const amountDue = inv.amountDue || (inv.totalAmount - inv.amountPaid);
                                        return (
                                            <tr key={inv.id}>
                                                <td>
                                                    <a href="#" className="invoice-link">{inv.invoiceNumber}</a>
                                                </td>
                                                <td>{formatDateTime(inv.createdAt)}</td>
                                                <td className="text-right">{formatCurrency(inv.totalAmount)}</td>
                                                <td className="text-right">{formatCurrency(inv.amountPaid)}</td>
                                                <td className="text-right">{formatCurrency(amountDue)}</td>
                                                <td className="text-right">
                                                    <input
                                                        type="number"
                                                        value={allocations[inv.id] || ''}
                                                        onChange={(e) => handleAllocationChange(inv.id, e.target.value)}
                                                        className="allocation-input"
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            <div className="unallocated-amount">
                                <span>Tiền chưa phân bổ:</span>
                                <strong>{formatCurrency(getUnallocated())}</strong>
                            </div>
                        </div>
                    )}
                </div>

                <div className="payment-modal-footer">
                    <button className="btn-cancel" onClick={onClose} disabled={loading}>
                        Bỏ qua
                    </button>
                    <button
                        className="btn-secondary"
                        onClick={() => handleSubmit(true)}
                        disabled={loading}
                    >
                        <MdPrint /> Tạo phiếu thu & In
                    </button>
                    <button
                        className="btn-primary"
                        onClick={() => handleSubmit(false)}
                        disabled={loading}
                    >
                        <MdSave /> {loading ? 'Đang xử lý...' : 'Tạo phiếu thu'}
                    </button>
                </div>
            </div>
        </div>
    );
}
