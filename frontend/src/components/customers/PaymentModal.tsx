import { customersAPI } from '../../services/api';
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
    customerId,
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
    const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
    const [allocations, setAllocations] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(false);

    const formatCurrency = (value: number): string => {
        return new Intl.NumberFormat('vi-VN').format(value);
    };

    const formatDateTime = (dateStr: string): string => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('vi-VN') + ' ' + date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    const resolveInvoiceAmountDue = (invoice: Invoice): number => {
        if (invoice.amountDue !== null && invoice.amountDue !== undefined) {
            return Math.max(0, Number(invoice.amountDue || 0));
        }

        return Math.max(0, Number(invoice.totalAmount || 0) - Number(invoice.amountPaid || 0));
    };

    const outstandingInvoices = invoices.filter((invoice) => resolveInvoiceAmountDue(invoice) > 0);

    const createEmptyAllocations = (): Record<string, number> => {
        const nextAllocations: Record<string, number> = {};
        outstandingInvoices.forEach((invoice) => {
            nextAllocations[invoice.id] = 0;
        });

        return nextAllocations;
    };

    const selectedInvoice = allocateToInvoices
        ? outstandingInvoices.find((invoice) => invoice.id === selectedInvoiceId)
        : undefined;

    useEffect(() => {
        if (isOpen) {
            const now = new Date();
            const dateStr = now.toISOString().slice(0, 16);
            setPaymentDate(dateStr);
            setAmount(0);
            setNote('');
            setAllocateToInvoices(outstandingInvoices.length > 0);
            setSelectedInvoiceId('');
            setAllocations(createEmptyAllocations());
        }
    }, [isOpen, invoices]);

    const effectiveCurrentDebt = outstandingInvoices.length > 0
        ? outstandingInvoices.reduce((sum, invoice) => sum + resolveInvoiceAmountDue(invoice), 0)
        : currentDebt;

    const autoAllocate = (totalAmount: number) => {
        let remaining = totalAmount;
        const newAllocations: Record<string, number> = {};

        // Sort invoices by date (oldest first)
        const sortedInvoices = [...outstandingInvoices].sort((a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        for (const inv of sortedInvoices) {
            const due = resolveInvoiceAmountDue(inv);
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

    const allocateToSelectedInvoice = (invoiceId: string, totalAmount: number) => {
        const invoice = outstandingInvoices.find((item) => item.id === invoiceId);
        if (!invoice) {
            setAllocations(createEmptyAllocations());
            return;
        }

        const nextAllocations = createEmptyAllocations();
        nextAllocations[invoiceId] = Math.min(totalAmount, resolveInvoiceAmountDue(invoice));
        setAllocations(nextAllocations);
    };

    const refreshAllocations = (totalAmount: number, nextSelectedInvoiceId: string, nextAllocateToInvoices: boolean) => {
        if (!nextAllocateToInvoices) {
            setAllocations(createEmptyAllocations());
            return;
        }

        if (nextSelectedInvoiceId) {
            allocateToSelectedInvoice(nextSelectedInvoiceId, totalAmount);
            return;
        }

        autoAllocate(totalAmount);
    };

    const handleAmountChange = (value: string) => {
        const num = parseFloat(value) || 0;
        setAmount(num);

        if (allocateToInvoices) {
            refreshAllocations(num, selectedInvoiceId, true);
        }
    };

    const handleInvoiceSelection = (invoiceId: string) => {
        setSelectedInvoiceId(invoiceId);
        refreshAllocations(amount, invoiceId, true);
    };

    const handleClearSelectedInvoice = () => {
        setSelectedInvoiceId('');
        refreshAllocations(amount, '', true);
    };

    const getTotalAllocated = (): number => {
        return Object.values(allocations).reduce((sum, val) => sum + val, 0);
    };

    const getUnallocated = (): number => {
        return amount - getTotalAllocated();
    };

    const paymentTargetOutstanding = selectedInvoice
        ? resolveInvoiceAmountDue(selectedInvoice)
        : effectiveCurrentDebt;

    const getRemainingDebt = (): number => Math.max(0, paymentTargetOutstanding - amount);

    const getPaymentErrorMessage = (error: any): string => {
        const rawMessage = error?.response?.data?.message;
        if (Array.isArray(rawMessage)) {
            const asStrings = rawMessage.filter((item) => typeof item === 'string');
            if (asStrings.length > 0) {
                return asStrings.join('\n');
            }
            return 'Lỗi khi tạo phiếu thu';
        }

        if (typeof rawMessage !== 'string') {
            const fallback = error?.response?.data?.error;
            if (typeof fallback === 'string' && fallback.trim()) {
                return fallback;
            }
            return 'Lỗi khi tạo phiếu thu';
        }

        if (rawMessage.includes('INVALID_PAYMENT_AMOUNT')) {
            return 'Số tiền thu không hợp lệ.';
        }
        if (rawMessage.includes('INVALID_PAYMENT_DATE')) {
            return 'Thời gian phiếu thu không hợp lệ.';
        }
        if (rawMessage.includes('PAYMENT_EXCEEDS_OUTSTANDING_DEBT')) {
            return 'Số tiền thu không được vượt quá công nợ còn lại.';
        }
        if (rawMessage.includes('ALLOCATIONS_MUST_MATCH_PAYMENT_AMOUNT')) {
            return 'Tổng tiền phân bổ phải bằng số tiền thu.';
        }
        if (rawMessage.includes('DUPLICATE_INVOICE_ALLOCATION')) {
            return 'Một hóa đơn đang bị phân bổ nhiều lần.';
        }
        if (rawMessage.includes('ALLOCATION_EXCEEDS_OUTSTANDING')) {
            return 'Có hóa đơn bị phân bổ vượt quá số còn cần thu.';
        }
        if (rawMessage.includes('INVOICE_NOT_FOUND')) {
            return 'Có hóa đơn phân bổ không hợp lệ hoặc không còn tồn tại.';
        }

        return rawMessage;
    };

    const printReceipt = (payment: any) => {
        const paymentData = payment?.data || payment;
        const paymentAmount = Number(paymentData?.amount || amount || 0);
        const paymentCode = paymentData?.code || 'PT';
        const paymentTime = paymentData?.createdAt || new Date().toISOString();
        const paymentMethodLabel =
            paymentData?.method === 'TRANSFER' ? 'Chuyển khoản'
                : paymentData?.method === 'CARD' ? 'Thẻ'
                    : 'Tiền mặt';
        const allocationsData = Array.isArray(paymentData?.allocations) ? paymentData.allocations : [];
        const allocationRows = allocationsData.length > 0
            ? allocationsData.map((allocation: any, index: number) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${allocation.invoice?.invoiceNumber || ''}</td>
                    <td style="text-align:right;">${new Intl.NumberFormat('vi-VN').format(Number(allocation.amount || 0))}</td>
                </tr>
            `).join('')
            : `
                <tr>
                    <td colspan="3" style="text-align:center;">Thanh toán không phân bổ theo hóa đơn</td>
                </tr>
            `;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Không thể mở cửa sổ in. Vui lòng cho phép popup.');
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8" />
                <title>Phiếu thu ${paymentCode}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
                    .header { text-align: center; margin-bottom: 24px; }
                    .header h1 { margin: 0 0 8px; font-size: 24px; }
                    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; margin-bottom: 20px; }
                    .meta-row strong { display: inline-block; min-width: 120px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
                    th, td { border: 1px solid #333; padding: 8px; font-size: 14px; }
                    th { background: #f3f3f3; }
                    .summary { margin-top: 20px; text-align: right; font-size: 16px; }
                    .note { margin-top: 16px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>PHIEU THU CONG NO</h1>
                    <div>Ma phieu: <strong>${paymentCode}</strong></div>
                </div>
                <div class="meta">
                    <div class="meta-row"><strong>Khach hang:</strong> ${customerName}</div>
                    <div class="meta-row"><strong>Thoi gian:</strong> ${formatDateTime(paymentTime)}</div>
                    <div class="meta-row"><strong>Dia chi:</strong> ${customerAddress || 'N/A'}</div>
                    <div class="meta-row"><strong>Phuong thuc:</strong> ${paymentMethodLabel}</div>
                    <div class="meta-row"><strong>Nguoi thu:</strong> ${paymentData?.collector || collector}</div>
                    <div class="meta-row"><strong>So tien:</strong> ${new Intl.NumberFormat('vi-VN').format(paymentAmount)} đ</div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Hoa don</th>
                            <th>So tien thu</th>
                        </tr>
                    </thead>
                    <tbody>${allocationRows}</tbody>
                </table>
                <div class="summary">
                    <strong>Tong thu: ${new Intl.NumberFormat('vi-VN').format(paymentAmount)} đ</strong>
                </div>
                <div class="note"><strong>Ghi chu:</strong> ${paymentData?.note || note || 'Khong co'}</div>
            </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 250);
    };

    const handleSubmit = async (printAfter: boolean = false) => {
        if (amount <= 0) {
            alert('Vui lòng nhập số tiền thanh toán');
            return;
        }

        if (effectiveCurrentDebt > 0 && amount > effectiveCurrentDebt) {
            alert('Số tiền thanh toán không được vượt quá số nợ cần thu.');
            return;
        }

        if (selectedInvoice && amount > paymentTargetOutstanding) {
            alert(`Số tiền thanh toán không được vượt quá số còn cần thu của hóa đơn ${selectedInvoice.invoiceNumber}.`);
            return;
        }

        if (allocateToInvoices && outstandingInvoices.length > 0 && Math.abs(getUnallocated()) > 0.001) {
            alert('Vui lòng phân bổ hết số tiền thu vào các hóa đơn.');
            return;
        }

        setLoading(true);
        try {
            const response = await customersAPI.payDebt(customerId, {
                amount,
                paymentMethod,
                collector,
                note,
                allocateToInvoices,
                createdAt: paymentDate ? new Date(paymentDate).toISOString() : undefined,
                allocations: Object.entries(allocations)
                    .map(([invoiceId, allocationAmount]) => ({
                        invoiceId,
                        amount: Number(allocationAmount || 0),
                    }))
                    .filter((allocation) => allocation.amount > 0),
            });

            const paymentData = response.data?.data || response.data;

            alert('Tạo phiếu thu thành công!');
            onSuccess();
            onClose();

            if (printAfter) {
                printReceipt(paymentData);
            }
        } catch (error: any) {
            console.error('Payment error:', error);
            console.error('Payment error response:', error?.response?.data);
            alert(getPaymentErrorMessage(error));
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
                            {customerAddress || customerName} · Nợ hiện tại: {formatCurrency(effectiveCurrentDebt)}
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
                                onChange={(e) => {
                                    const nextValue = e.target.checked;
                                    setAllocateToInvoices(nextValue);

                                    if (nextValue) {
                                        refreshAllocations(amount, selectedInvoiceId, true);
                                    } else {
                                        setSelectedInvoiceId('');
                                        setAllocations(createEmptyAllocations());
                                    }
                                }}
                            />
                            Phân bổ vào hóa đơn
                        </label>
                    </div>

                    {/* Invoice allocation table */}
                    {allocateToInvoices && outstandingInvoices.length > 0 && (
                        <div className="payment-allocation-table">
                            <div className="allocation-selection-hint">
                                <div className="allocation-selection-copy">
                                    <span>
                                        {selectedInvoice
                                            ? `Đang thu theo hóa đơn ${selectedInvoice.invoiceNumber}.`
                                            : 'Chưa chọn mã hóa đơn, hệ thống sẽ tự phân bổ vào các hóa đơn cũ nhất.'}
                                    </span>
                                    <strong>
                                        {selectedInvoice
                                            ? `Còn cần thu hóa đơn: ${formatCurrency(paymentTargetOutstanding)}`
                                            : `Tổng nợ hóa đơn: ${formatCurrency(effectiveCurrentDebt)}`}
                                    </strong>
                                </div>
                                {selectedInvoice && (
                                    <button
                                        type="button"
                                        className="clear-selection-btn"
                                        onClick={handleClearSelectedInvoice}
                                    >
                                        Bỏ chọn
                                    </button>
                                )}
                            </div>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Chọn</th>
                                        <th>Mã hóa đơn</th>
                                        <th>Thời gian</th>
                                        <th className="text-right">Giá trị hóa đơn</th>
                                        <th className="text-right">Đã thu trước</th>
                                        <th className="text-right">Còn cần thu</th>
                                        <th className="text-right">Tiền thu</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {outstandingInvoices.map((inv) => {
                                        const amountDue = resolveInvoiceAmountDue(inv);
                                        return (
                                            <tr
                                                key={inv.id}
                                                className={selectedInvoiceId === inv.id ? 'selected-allocation-row' : ''}
                                                onClick={() => handleInvoiceSelection(inv.id)}
                                            >
                                                <td className="text-center">
                                                    <input
                                                        type="radio"
                                                        name="selectedCustomerInvoice"
                                                        checked={selectedInvoiceId === inv.id}
                                                        onChange={() => handleInvoiceSelection(inv.id)}
                                                    />
                                                </td>
                                                <td>
                                                    <a
                                                        href="#"
                                                        className="invoice-link"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            handleInvoiceSelection(inv.id);
                                                        }}
                                                    >
                                                        {inv.invoiceNumber}
                                                    </a>
                                                </td>
                                                <td>{formatDateTime(inv.createdAt)}</td>
                                                <td className="text-right">{formatCurrency(inv.totalAmount)}</td>
                                                <td className="text-right">{formatCurrency(inv.amountPaid)}</td>
                                                <td className="text-right">{formatCurrency(amountDue)}</td>
                                                <td className="text-right">{formatCurrency(allocations[inv.id] || 0)}</td>
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
