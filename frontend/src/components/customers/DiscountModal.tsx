import { useState, useEffect } from 'react';
import { MdClose } from 'react-icons/md';
import './DiscountModal.css';

interface DiscountModalProps {
    isOpen: boolean;
    onClose: () => void;
    customerId: string;
    customerName: string;
    customerAddress?: string;
    currentDebt: number;
    onSuccess: () => void;
}

export default function DiscountModal({
    isOpen,
    onClose,
    customerAddress,
    currentDebt,
    onSuccess,
}: DiscountModalProps) {
    const [discountDate, setDiscountDate] = useState('');
    const [executor, setExecutor] = useState('Mixu');
    const [discountAmount, setDiscountAmount] = useState<number>(0);
    const [note, setNote] = useState('');
    const [allocateToInvoices, setAllocateToInvoices] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Set default date to now
            const now = new Date();
            const dateStr = now.toISOString().slice(0, 16);
            setDiscountDate(dateStr);
            setDiscountAmount(0);
            setNote('');
            setAllocateToInvoices(false);
        }
    }, [isOpen]);

    const formatCurrency = (value: number): string => {
        return new Intl.NumberFormat('vi-VN').format(value);
    };

    const getRemainingDebt = (): number => {
        return currentDebt - discountAmount;
    };

    const handleSubmit = async () => {
        if (discountAmount <= 0) {
            alert('Vui lòng nhập số tiền chiết khấu');
            return;
        }

        setLoading(true);
        try {
            // TODO: Call API to create discount receipt
            // const payload = {
            //     customerId,
            //     discountAmount,
            //     discountDate,
            //     executor,
            //     note,
            //     allocateToInvoices,
            // };
            // await discountsAPI.create(payload);

            alert('Tạo phiếu chiết khấu thành công!');
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Discount error:', error);
            alert('Lỗi khi tạo phiếu chiết khấu');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="discount-modal-overlay">
            <div className="discount-modal">
                <div className="discount-modal-header">
                    <div className="discount-modal-title">
                        <h2>Chiết khấu thanh toán</h2>
                        <span className="discount-customer-info">
                            {customerAddress || 'N/A'} · Nợ hiện tại: {formatCurrency(currentDebt)}
                        </span>
                    </div>
                    <button className="discount-close-btn" onClick={onClose}>
                        <MdClose size={20} />
                    </button>
                </div>

                <div className="discount-modal-body">
                    {/* Row 1: Date & Executor */}
                    <div className="discount-form-row">
                        <div className="discount-form-group">
                            <label>Thời gian</label>
                            <input
                                type="datetime-local"
                                value={discountDate}
                                onChange={(e) => setDiscountDate(e.target.value)}
                            />
                        </div>
                        <div className="discount-form-group">
                            <label>Người thực hiện</label>
                            <select value={executor} onChange={(e) => setExecutor(e.target.value)}>
                                <option value="Mixu">Mixu</option>
                                <option value="Admin">Admin</option>
                            </select>
                        </div>
                    </div>

                    {/* Discount Amount */}
                    <div className="discount-form-row">
                        <div className="discount-form-group amount-group">
                            <label>Chiết khấu cho khách</label>
                            <input
                                type="number"
                                value={discountAmount || ''}
                                onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                className="discount-input"
                            />
                            <span className="remaining-debt">Nợ còn lại: {formatCurrency(getRemainingDebt())}</span>
                        </div>
                    </div>

                    {/* Note */}
                    <div className="discount-form-row">
                        <div className="discount-form-group">
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
                    <div className="discount-allocate-section">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={allocateToInvoices}
                                onChange={(e) => setAllocateToInvoices(e.target.checked)}
                            />
                            Phân bổ vào hóa đơn
                        </label>
                    </div>
                </div>

                <div className="discount-modal-footer">
                    <button className="btn-cancel" onClick={onClose} disabled={loading}>
                        Bỏ qua
                    </button>
                    <button
                        className="btn-primary"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? 'Đang xử lý...' : 'Tạo phiếu'}
                    </button>
                </div>
            </div>
        </div>
    );
}
