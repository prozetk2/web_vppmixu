import { useState, useEffect } from 'react';
import Modal from '../shared/Modal';
import { invoicesAPI, productsAPI } from '../../services/api';
import { useToast } from '../shared/Toast';
import { MdAdd, MdDelete, MdSave } from 'react-icons/md';
import './CreateInvoiceModal.css'; // Reuse CSS

interface Product {
    id: number;
    code: string;
    name: string;
    salePrice: number;
    unit?: string;
}

interface Invoice {
    id: string;
    invoiceNumber: string;
    customerName?: string;
    customerPhone?: string;
    customerAddress?: string;
    notes?: string;
    paymentMethod?: string;
    totalAmount: number;
    discountAmount: number;
    amountPaid: number;
    items?: any[];
}

interface EditInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    invoice: Invoice | null;
}

interface InvoiceItemState {
    productId?: string;
    productCode: string;
    productName: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    totalPrice: number;
}

export default function EditInvoiceModal({ isOpen, onClose, onSuccess, invoice }: EditInvoiceModalProps) {
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);

    // Form state
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [amountPaid, setAmountPaid] = useState<number>(0);
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<InvoiceItemState[]>([]);

    useEffect(() => {
        if (isOpen && invoice) {
            fetchProducts();
            // Pre-fill form
            setCustomerName(invoice.customerName || '');
            setCustomerPhone(invoice.customerPhone || '');
            setCustomerAddress(invoice.customerAddress || '');
            setPaymentMethod(invoice.paymentMethod || 'CASH');
            setAmountPaid(Number(invoice.amountPaid) || 0);
            setNotes(invoice.notes || '');

            if (invoice.items && invoice.items.length > 0) {
                setItems(invoice.items.map(item => ({
                    productCode: item.productCode || '',
                    productName: item.productName || '',
                    unit: item.unit || '',
                    quantity: Number(item.quantity) || 1,
                    unitPrice: Number(item.unitPrice) || 0,
                    discountAmount: Number(item.discountAmount) || 0,
                    totalPrice: Number(item.totalPrice) || 0
                })));
            } else {
                setItems([createEmptyItem()]);
            }
        }
    }, [isOpen, invoice]);

    const fetchProducts = async () => {
        try {
            const response = await productsAPI.getAll({ limit: 1000 });
            const data = response.data?.data || response.data || [];
            setProducts(data);
        } catch (error) {
            console.error('Failed to fetch products:', error);
            toast.error('Không thể tải danh sách sản phẩm');
        }
    };

    const createEmptyItem = (): InvoiceItemState => ({
        productCode: '',
        productName: '',
        unit: '',
        quantity: 1,
        unitPrice: 0,
        discountAmount: 0,
        totalPrice: 0
    });

    const handleAddItem = () => {
        setItems([...items, createEmptyItem()]);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const handleItemChange = (index: number, field: keyof InvoiceItemState, value: any) => {
        const newItems = [...items];
        const item = { ...newItems[index], [field]: value };

        // Recalculate totals if necessary
        if (field === 'quantity' || field === 'unitPrice' || field === 'discountAmount') {
            const qty = field === 'quantity' ? Number(value) : item.quantity;
            const price = field === 'unitPrice' ? Number(value) : item.unitPrice;
            const discount = field === 'discountAmount' ? Number(value) : item.discountAmount;
            item.totalPrice = (qty * price) - discount;
        }

        // Handle product selection
        if (field === 'productCode') {
            const product = products.find(p => p.code === value);
            if (product) {
                item.productName = product.name;
                item.unitPrice = product.salePrice;
                item.unit = product.unit || '';
                item.totalPrice = (item.quantity * product.salePrice) - item.discountAmount;
            }
        }

        newItems[index] = item;
        setItems(newItems);
    };

    const calculateTotalAmount = () => {
        return items.reduce((sum, item) => sum + item.totalPrice, 0);
    };

    const handleSubmit = async () => {
        if (!invoice) return;

        // Validation
        if (items.length === 0) {
            toast.error('Vui lòng thêm ít nhất một sản phẩm');
            return;
        }
        if (items.some(i => !i.productName)) {
            toast.error('Tên sản phẩm không được để trống');
            return;
        }

        setLoading(true);
        try {
            const totalAmount = calculateTotalAmount();
            const discountAmount = 0;
            const amountDue = totalAmount - discountAmount;

            const payload = {
                customerName,
                customerPhone,
                customerAddress,
                notes,
                paymentMethod,
                totalAmount,
                discountAmount,
                amountDue,
                amountPaid: Number(amountPaid),
                status: 'COMPLETED',
                cashAmount: paymentMethod === 'CASH' ? Number(amountPaid) : 0,
                cardAmount: paymentMethod === 'CARD' ? Number(amountPaid) : 0,
                transferAmount: paymentMethod === 'TRANSFER' ? Number(amountPaid) : 0,

                items: items.map(item => ({
                    productCode: item.productCode,
                    productName: item.productName,
                    unit: item.unit,
                    quantity: Number(item.quantity),
                    unitPrice: Number(item.unitPrice),
                    discountAmount: Number(item.discountAmount),
                    totalPrice: Number(item.totalPrice)
                }))
            };

            await invoicesAPI.update(invoice.id, payload);
            toast.success('Cập nhật hóa đơn thành công');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Update invoice error:', error);
            toast.error(error.response?.data?.message || 'Lỗi khi cập nhật hóa đơn');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Sửa hóa đơn ${invoice?.invoiceNumber}`} size="lg">
            <div className="create-invoice-form">
                <div className="form-section">
                    <h4>Thông tin khách hàng</h4>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Tên khách hàng</label>
                            <input
                                type="text"
                                value={customerName}
                                onChange={e => setCustomerName(e.target.value)}
                                placeholder="Khách lẻ"
                            />
                        </div>
                        <div className="form-group">
                            <label>Số điện thoại</label>
                            <input
                                type="text"
                                value={customerPhone}
                                onChange={e => setCustomerPhone(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Địa chỉ</label>
                        <input
                            type="text"
                            value={customerAddress}
                            onChange={e => setCustomerAddress(e.target.value)}
                        />
                    </div>
                </div>

                <div className="form-section">
                    <h4>Chi tiết đơn hàng</h4>
                    <table className="items-table-edit">
                        <thead>
                            <tr>
                                <th>Mã SP</th>
                                <th>Tên sản phẩm</th>
                                <th style={{ width: '80px' }}>SL</th>
                                <th>Đơn giá</th>
                                <th>Giảm giá</th>
                                <th>Thành tiền</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, index) => (
                                <tr key={index}>
                                    <td>
                                        <input
                                            list={`products-edit-${index}`}
                                            value={item.productCode}
                                            onChange={e => handleItemChange(index, 'productCode', e.target.value)}
                                            placeholder="Mã..."
                                            className="input-code"
                                        />
                                        <datalist id={`products-edit-${index}`}>
                                            {products.map(p => (
                                                <option key={p.id} value={p.code}>{p.name}</option>
                                            ))}
                                        </datalist>
                                    </td>
                                    <td>
                                        <input
                                            value={item.productName}
                                            onChange={e => handleItemChange(index, 'productName', e.target.value)}
                                            placeholder="Tên sp..."
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                                            min="1"
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="number"
                                            value={item.unitPrice}
                                            onChange={e => handleItemChange(index, 'unitPrice', e.target.value)}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="number"
                                            value={item.discountAmount}
                                            onChange={e => handleItemChange(index, 'discountAmount', e.target.value)}
                                        />
                                    </td>
                                    <td className="text-right">
                                        {new Intl.NumberFormat('vi-VN').format(item.totalPrice)}
                                    </td>
                                    <td>
                                        <button className="btn-icon-delete" onClick={() => handleRemoveItem(index)}>
                                            <MdDelete />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button className="btn-add-item" onClick={handleAddItem}>
                        <MdAdd /> Thêm dòng
                    </button>
                </div>

                <div className="form-section totals-section">
                    <div className="form-row">
                        <div className="form-group" style={{ flex: 2 }}>
                            <label>Ghi chú</label>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                rows={3}
                            />
                        </div>
                        <div className="totals-calculate" style={{ flex: 1 }}>
                            <div className="total-row">
                                <span>Tổng tiền:</span>
                                <strong>{new Intl.NumberFormat('vi-VN').format(calculateTotalAmount())}</strong>
                            </div>
                            <div className="form-group">
                                <label>Thanh toán</label>
                                <select
                                    value={paymentMethod}
                                    onChange={e => setPaymentMethod(e.target.value)}
                                >
                                    <option value="CASH">Tiền mặt</option>
                                    <option value="TRANSFER">Chuyển khoản</option>
                                    <option value="CARD">Thẻ</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Khách trả</label>
                                <input
                                    type="number"
                                    value={amountPaid}
                                    onChange={e => setAmountPaid(Number(e.target.value))}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="modal-actions">
                    <button className="btn-cancel" onClick={onClose} disabled={loading}>
                        Hủy
                    </button>
                    <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
                        <MdSave /> {loading ? 'Đang lưu...' : 'Lưu hóa đơn'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
