import React, { useState, useEffect } from 'react';
import { productsAPI, invoicesAPI, priceListsAPI } from '../../services/api';
import { Toast, useToast } from '../shared/Toast';
import { MdAdd, MdRemove, MdDelete, MdClose, MdShoppingCart, MdPrint, MdRefresh } from 'react-icons/md';
import './POSPage.css';

interface Product {
    id: string;
    sku: string;
    name: string;
    defaultPrice: number;
    defaultCost: number;
    totalStock: number;
    unit?: string;
}

interface PriceList {
    id: string;
    name: string;
    code: string;
    isDefault: boolean;
}

interface CartItem {
    id: string;
    productCode: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    discount: number;
    discountType: 'percent' | 'amount';
    total: number;
}

export default function POSPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [showProductList, setShowProductList] = useState(false);

    // Price Lists
    const [priceLists, setPriceLists] = useState<PriceList[]>([]);
    const [selectedPriceList, setSelectedPriceList] = useState<string>('');

    // Payment
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'wallet' | 'transfer'>('cash');
    const [cashAmount, setCashAmount] = useState(0);
    const [cardAmount, setCardAmount] = useState(0);
    const [walletAmount, setWalletAmount] = useState(0);
    const [transferAmount, setTransferAmount] = useState(0);

    // Customer
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');

    // Invoice discount
    const [invoiceDiscount, setInvoiceDiscount] = useState(0);
    const [invoiceDiscountType, setInvoiceDiscountType] = useState<'percent' | 'amount'>('percent');

    const toast = useToast();

    useEffect(() => {
        fetchPriceLists();
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [selectedPriceList]);

    useEffect(() => {
        if (searchTerm) {
            const filtered = products.filter(p =>
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.sku.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredProducts(filtered);
            setShowProductList(true);
        } else {
            setFilteredProducts([]);
            setShowProductList(false);
        }
    }, [searchTerm, products]);

    const fetchPriceLists = async () => {
        try {
            const response = await priceListsAPI.getAll();
            const lists = (response.data.data || response.data).map((pl: any) => ({
                id: pl.id.toString(),
                name: pl.name,
                code: pl.code,
                isDefault: pl.isDefault,
            }));
            setPriceLists(lists);

            // Auto-select default price list
            const defaultList = lists.find((pl: PriceList) => pl.isDefault);
            if (defaultList) {
                setSelectedPriceList(defaultList.id);
            }
        } catch (error) {
            console.error('Error fetching price lists:', error);
        }
    };

    const fetchProducts = async () => {
        try {
            console.log('Fetching products...');
            const response = await productsAPI.getAll({ page: 1, limit: 1000 });
            console.log('Products API response:', response);
            console.log('Response.data:', response.data);
            const data = response.data?.data || [];
            console.log('Products data array:', data);
            console.log('Products count:', data.length);

            setProducts(data.map((p: any) => {
                // Get price from selected price list if available
                let price = Number(p.defaultPrice || 0);
                if (selectedPriceList && p.productPrices) {
                    const priceListPrice = p.productPrices.find(
                        (pp: any) => pp.priceListId.toString() === selectedPriceList
                    );
                    if (priceListPrice) {
                        price = Number(priceListPrice.price);
                    }
                }

                return {
                    id: p.id.toString(),
                    sku: p.sku,
                    name: p.name,
                    defaultPrice: price,
                    defaultCost: Number(p.defaultCost || 0),
                    totalStock: Number(p.totalStock || 0),
                    unit: p.unit,
                };
            }));
        } catch (error) {
            console.error('Error fetching products:', error);
            toast.error('Không thể tải danh sách sản phẩm');
        }
    };

    const addToCart = (product: Product) => {
        const existingItem = cartItems.find(item => item.productCode === product.sku);

        if (existingItem) {
            // Increase quantity
            setCartItems(cartItems.map(item =>
                item.productCode === product.sku
                    ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unitPrice }
                    : item
            ));
        } else {
            // Add new item
            const newItem: CartItem = {
                id: Date.now().toString(),
                productCode: product.sku,
                productName: product.name,
                unitPrice: product.defaultPrice,
                quantity: 1,
                discount: 0,
                discountType: 'percent',
                total: product.defaultPrice,
            };
            setCartItems([...cartItems, newItem]);
        }

        setSearchTerm('');
        setShowProductList(false);
        toast.success(`Đã thêm ${product.name}`);
    };

    const updateQuantity = (itemId: string, newQty: number) => {
        if (newQty <= 0) {
            removeItem(itemId);
            return;
        }

        setCartItems(cartItems.map(item =>
            item.id === itemId
                ? { ...item, quantity: newQty, total: calculateItemTotal(item.unitPrice, newQty, item.discount, item.discountType) }
                : item
        ));
    };

    const updateDiscount = (itemId: string, discount: number, discountType: 'percent' | 'amount') => {
        setCartItems(cartItems.map(item =>
            item.id === itemId
                ? {
                    ...item,
                    discount,
                    discountType,
                    total: calculateItemTotal(item.unitPrice, item.quantity, discount, discountType)
                }
                : item
        ));
    };

    const calculateItemTotal = (unitPrice: number, quantity: number, discount: number, discountType: 'percent' | 'amount'): number => {
        const subtotal = unitPrice * quantity;
        if (discountType === 'percent') {
            return subtotal * (1 - discount / 100);
        } else {
            return subtotal - discount;
        }
    };

    const removeItem = (itemId: string) => {
        setCartItems(cartItems.filter(item => item.id !== itemId));
    };

    const clearCart = () => {
        setCartItems([]);
        setInvoiceDiscount(0);
        setCashAmount(0);
        setCardAmount(0);
        setWalletAmount(0);
        setTransferAmount(0);
        setCustomerName('');
        setCustomerPhone('');
        toast.success('Đã xóa giỏ hàng');
    };

    // Calculate totals
    const subtotal = cartItems.reduce((sum, item) => sum + item.total, 0);
    const invoiceDiscountAmount = invoiceDiscountType === 'percent'
        ? subtotal * invoiceDiscount / 100
        : invoiceDiscount;
    const grandTotal = subtotal - invoiceDiscountAmount;

    const totalPaid = cashAmount + cardAmount + walletAmount + transferAmount;
    const change = paymentMethod === 'cash' ? Math.max(0, cashAmount - grandTotal) : 0;

    const completeSale = async () => {
        if (cartItems.length === 0) {
            toast.error('Giỏ hàng trống');
            return;
        }

        if (totalPaid < grandTotal) {
            toast.error('Số tiền thanh toán không đủ');
            return;
        }

        try {
            const invoiceData = {
                items: cartItems.map(item => ({
                    productCode: item.productCode,
                    productName: item.productName,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    discountPercent: item.discountType === 'percent' ? item.discount : 0,
                    discountAmount: item.discountType === 'amount' ? item.discount : 0,
                    totalPrice: item.total,
                })),
                totalAmount: subtotal,
                discountAmount: invoiceDiscountAmount,
                amountDue: grandTotal,
                amountPaid: totalPaid,
                cashAmount,
                cardAmount,
                walletAmount,
                transferAmount,
                customerName: customerName || undefined,
                customerPhone: customerPhone || undefined,
                status: 'COMPLETED',
                salesChannel: 'POS',
            };

            const response = await invoicesAPI.create(invoiceData);
            toast.success(`Hóa đơn ${response.data.invoiceNumber} đã tạo thành công!`);

            // Clear cart and reset
            clearCart();

            // Optional: Print receipt
            // window.print();
        } catch (error: any) {
            console.error('Error creating invoice:', error);
            toast.error(error.response?.data?.message || 'Lỗi tạo hóa đơn');
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN').format(value);
    };

    return (
        <div className="pos-page">
            <Toast toasts={toast.toasts} onRemove={toast.removeToast} />

            <div className="pos-header">
                <h2><MdShoppingCart /> Bán hàng (POS)</h2>
                <div className="pos-header-actions">
                    <select
                        className="price-list-selector"
                        value={selectedPriceList}
                        onChange={(e) => setSelectedPriceList(e.target.value)}
                    >
                        <option value="">Giá mặc định</option>
                        {priceLists.map(pl => (
                            <option key={pl.id} value={pl.id}>
                                {pl.name} {pl.isDefault ? '(Mặc định)' : ''}
                            </option>
                        ))}
                    </select>
                    <button className="btn-secondary" onClick={clearCart}>
                        <MdRefresh /> Đơn mới
                    </button>
                </div>
            </div>

            <div className="pos-content">
                {/* Left: Product search + Cart */}
                <div className="pos-left">
                    {/* Product Search */}
                    <div className="product-search-section">
                        <div className="search-box-pos">
                            <input
                                type="text"
                                placeholder="Tìm sản phẩm theo tên hoặc mã SKU..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                            {showProductList && filteredProducts.length > 0 && (
                                <div className="product-dropdown">
                                    {filteredProducts.slice(0, 10).map(product => (
                                        <div
                                            key={product.id}
                                            className="product-item"
                                            onClick={() => addToCart(product)}
                                        >
                                            <div className="product-info">
                                                <strong>{product.name}</strong>
                                                <span className="sku">{product.sku}</span>
                                            </div>
                                            <div className="product-price">
                                                {formatCurrency(product.defaultPrice)}đ
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Product Grid - Browse */}
                    <div className="product-grid-section">
                        <h4>Sản phẩm ({products.length})</h4>
                        <div className="product-grid">
                            {products.slice(0, 50).map(product => (
                                <div
                                    key={product.id}
                                    className="product-card"
                                    onClick={() => addToCart(product)}
                                >
                                    <div className="product-card-name">{product.name}</div>
                                    <div className="product-card-sku">{product.sku}</div>
                                    <div className="product-card-price">
                                        {formatCurrency(product.defaultPrice)}đ
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Shopping Cart */}
                    <div className="cart-section">
                        <h3>Giỏ hàng ({cartItems.length} sản phẩm)</h3>

                        {cartItems.length === 0 ? (
                            <div className="cart-empty">
                                <MdShoppingCart size={64} opacity={0.3} />
                                <p>Giỏ hàng trống</p>
                            </div>
                        ) : (
                            <div className="cart-items">
                                {cartItems.map(item => (
                                    <div key={item.id} className="cart-item">
                                        <div className="item-header">
                                            <div className="item-name">{item.productName}</div>
                                            <button
                                                className="btn-remove"
                                                onClick={() => removeItem(item.id)}
                                            >
                                                <MdDelete />
                                            </button>
                                        </div>

                                        <div className="item-details">
                                            <div className="item-price">
                                                {formatCurrency(item.unitPrice)}đ
                                            </div>

                                            <div className="quantity-control">
                                                <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                                                    <MdRemove />
                                                </button>
                                                <input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                                                    min="1"
                                                />
                                                <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                                                    <MdAdd />
                                                </button>
                                            </div>

                                            <div className="item-total">
                                                {formatCurrency(item.total)}đ
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Payment Panel */}
                <div className="pos-right">
                    <div className="payment-section">
                        <h3>Thanh toán</h3>

                        {/* Customer Info */}
                        <div className="customer-section">
                            <input
                                type="text"
                                placeholder="Tên khách hàng (tùy chọn)"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                            />
                            <input
                                type="text"
                                placeholder="Số điện thoại (tùy chọn)"
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                            />
                        </div>

                        {/* Totals */}
                        <div className="totals-section">
                            <div className="total-row">
                                <span>Tạm tính:</span>
                                <strong>{formatCurrency(subtotal)}đ</strong>
                            </div>

                            <div className="discount-row">
                                <span>Giảm giá:</span>
                                <div className="discount-input">
                                    <input
                                        type="number"
                                        value={invoiceDiscount}
                                        onChange={(e) => setInvoiceDiscount(parseFloat(e.target.value) || 0)}
                                        min="0"
                                    />
                                    <select
                                        value={invoiceDiscountType}
                                        onChange={(e) => setInvoiceDiscountType(e.target.value as 'percent' | 'amount')}
                                    >
                                        <option value="percent">%</option>
                                        <option value="amount">VNĐ</option>
                                    </select>
                                </div>
                            </div>

                            {invoiceDiscountAmount > 0 && (
                                <div className="total-row discount-amount">
                                    <span></span>
                                    <span>-{formatCurrency(invoiceDiscountAmount)}đ</span>
                                </div>
                            )}

                            <div className="total-row grand-total">
                                <span>Tổng cộng:</span>
                                <strong>{formatCurrency(grandTotal)}đ</strong>
                            </div>
                        </div>

                        {/* Payment Method Tabs */}
                        <div className="payment-methods">
                            <button
                                className={paymentMethod === 'cash' ? 'active' : ''}
                                onClick={() => setPaymentMethod('cash')}
                            >
                                Tiền mặt
                            </button>
                            <button
                                className={paymentMethod === 'card' ? 'active' : ''}
                                onClick={() => setPaymentMethod('card')}
                            >
                                Thẻ
                            </button>
                            <button
                                className={paymentMethod === 'wallet' ? 'active' : ''}
                                onClick={() => setPaymentMethod('wallet')}
                            >
                                Ví
                            </button>
                            <button
                                className={paymentMethod === 'transfer' ? 'active' : ''}
                                onClick={() => setPaymentMethod('transfer')}
                            >
                                Chuyển khoản
                            </button>
                        </div>

                        {/* Payment Amount Input */}
                        <div className="payment-amount">
                            {paymentMethod === 'cash' && (
                                <React.Fragment>
                                    <label>Tiền mặt:</label>
                                    <input
                                        type="number"
                                        value={cashAmount || ''}
                                        onChange={(e) => setCashAmount(parseFloat(e.target.value) || 0)}
                                        placeholder="Nhập số tiền"
                                    />
                                    {change > 0 && (
                                        <div className="change-amount">
                                            Tiền thừa: <strong>{formatCurrency(change)}đ</strong>
                                        </div>
                                    )}
                                </React.Fragment>
                            )}
                            {paymentMethod === 'card' && (
                                <React.Fragment>
                                    <label>Thẻ:</label>
                                    <input
                                        type="number"
                                        value={cardAmount || ''}
                                        onChange={(e) => setCardAmount(parseFloat(e.target.value) || 0)}
                                        placeholder="Nhập số tiền"
                                    />
                                </React.Fragment>
                            )}
                            {paymentMethod === 'wallet' && (
                                <React.Fragment>
                                    <label>Ví điện tử:</label>
                                    <input
                                        type="number"
                                        value={walletAmount || ''}
                                        onChange={(e) => setWalletAmount(parseFloat(e.target.value) || 0)}
                                        placeholder="Nhập số tiền"
                                    />
                                </React.Fragment>
                            )}
                            {paymentMethod === 'transfer' && (
                                <React.Fragment>
                                    <label>Chuyển khoản:</label>
                                    <input
                                        type="number"
                                        value={transferAmount || ''}
                                        onChange={(e) => setTransferAmount(parseFloat(e.target.value) || 0)}
                                        placeholder="Nhập số tiền"
                                    />
                                </React.Fragment>
                            )}
                        </div>

                        {/* Complete Button */}
                        <button
                            className="btn-complete-sale"
                            onClick={completeSale}
                            disabled={cartItems.length === 0 || totalPaid < grandTotal}
                        >
                            Hoàn tất ({formatCurrency(grandTotal)}đ)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
