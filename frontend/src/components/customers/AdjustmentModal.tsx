import { useState, useEffect } from 'react';
import { MdClose, MdInfo } from 'react-icons/md';
import './AdjustmentModal.css';

interface AdjustmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    customerId: string;
    customerName: string;
    currentDebt: number;
    onSuccess: () => void;
}

export default function AdjustmentModal({
    isOpen,
    onClose,
    currentDebt,
    onSuccess,
}: AdjustmentModalProps) {
    const [adjustmentDate, setAdjustmentDate] = useState('');
    const [newDebtValue, setNewDebtValue] = useState<number>(0);
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Set default date to today
            const now = new Date();
            const dateStr = now.toISOString().slice(0, 10);
            setAdjustmentDate(dateStr);
            setNewDebtValue(currentDebt);
            setDescription('');
        }
    }, [isOpen, currentDebt]);

    const formatCurrency = (value: number): string => {
        return new Intl.NumberFormat('vi-VN').format(value);
    };

    const handleSubmit = async () => {
        alert('Chức năng điều chỉnh công nợ khách đang được hoàn thiện, hiện chưa lưu dữ liệu thật.');
    };

    if (!isOpen) return null;

    return (
        <div className="adjustment-modal-overlay">
            <div className="adjustment-modal">
                <div className="adjustment-modal-header">
                    <div className="adjustment-modal-title">
                        <h2>Điều chỉnh <MdInfo className="info-icon" /></h2>
                    </div>
                    <button className="adjustment-close-btn" onClick={onClose}>
                        <MdClose size={20} />
                    </button>
                </div>

                <div className="adjustment-modal-body">
                    {/* Current debt */}
                    <div className="adjustment-form-row">
                        <label>Nợ cần thu hiện tại</label>
                        <span className="current-debt-value">{formatCurrency(currentDebt)}</span>
                    </div>

                    {/* Adjustment date */}
                    <div className="adjustment-form-row">
                        <label>Ngày điều chỉnh</label>
                        <input
                            type="date"
                            value={adjustmentDate}
                            onChange={(e) => setAdjustmentDate(e.target.value)}
                        />
                    </div>

                    {/* New debt value */}
                    <div className="adjustment-form-row">
                        <label>Giá trị nợ điều chỉnh</label>
                        <input
                            type="number"
                            value={newDebtValue || ''}
                            onChange={(e) => setNewDebtValue(parseFloat(e.target.value) || 0)}
                            placeholder="0"
                        />
                    </div>

                    {/* Description */}
                    <div className="adjustment-form-row">
                        <label>Mô tả</label>
                        <div className="description-input-wrapper">
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Nhập mô tả điều chỉnh..."
                            />
                            <span className="edit-icon">✏️</span>
                        </div>
                    </div>
                </div>

                <div className="adjustment-modal-footer">
                    <button className="btn-cancel" onClick={onClose} disabled={loading}>
                        Bỏ qua
                    </button>
                    <button
                        className="btn-primary"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? 'Đang xử lý...' : 'Cập nhật'}
                    </button>
                </div>
            </div>
        </div>
    );
}
