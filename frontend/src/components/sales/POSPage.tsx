import { useState, useEffect, useMemo, useRef } from 'react';
import { productsAPI, customersAPI, warehousesAPI, salesAPI, inventoryAPI } from '../../services/api';
import { Toast, useToast } from '../shared/Toast';
import { MdShoppingCart, MdClose, MdCheckCircle, MdGridView, MdViewList, MdInventory2, MdAttachMoney, MdAccountBalance, MdCreditCard, MdQrCodeScanner, MdPrint, MdPercent, MdAssignmentReturn, MdSearch } from 'react-icons/md';
import './POSPage.css';

interface Product {
    id: string;
    name: string;
    sku?: string;
    defaultPrice: number;
    stock?: number;
    imageUrl?: string;
}

interface CartItem {
    product: Product;
    quantity: number;
    unitPrice: number;
}

interface Customer {
    id: string;
    name: string;
    phone?: string;
}

interface Warehouse {
    id: string;
    name: string;
}

type PaymentMethod = 'CASH' | 'TRANSFER' | 'CARD';
type ViewMode = 'grid' | 'list';

export default function POSPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [_warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [search, setSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [selectedWarehouse, setSelectedWarehouse] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [lastOrderNumber, setLastOrderNumber] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('list');

    // Discount state
    const [discountPercent, setDiscountPercent] = useState(0);
    const [discountAmount, setDiscountAmount] = useState(0);

    // Return flow state
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnOrderSearch, setReturnOrderSearch] = useState('');
    const [returnOrderData, setReturnOrderData] = useState<any>(null);
    const [searchingOrder, setSearchingOrder] = useState(false);
    const [returningOrder, setReturningOrder] = useState(false);

    // Barcode scanner ref
    const searchInputRef = useRef<HTMLInputElement>(null);

    const toast = useToast();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [productsRes, customersRes, warehousesRes, stockRes] = await Promise.all([
                productsAPI.getAll({ limit: 1000 }),
                customersAPI.getAll(),
                warehousesAPI.getAll(),
                inventoryAPI.getStock({ limit: 1000 }),
            ]);

            // Map stock to products
            const stockMap = new Map<string, number>();
            const stockData = stockRes.data?.data || stockRes.data || [];
            stockData.forEach((inv: any) => {
                const productId = inv.variant?.productId?.toString() || inv.productId?.toString();
                if (productId) {
                    stockMap.set(productId, (stockMap.get(productId) || 0) + Number(inv.quantity || 0));
                }
            });

            const productsData = productsRes.data?.data || [];
            setProducts(productsData.map((p: any) => ({
                ...p,
                id: p.id.toString(),
                stock: stockMap.get(p.id.toString()) || 0,
            })));

            setCustomers((customersRes.data?.data || customersRes.data || []).map((c: any) => ({
                ...c,
                id: c.id.toString(),
            })));

            const whs = (warehousesRes.data?.data || warehousesRes.data || []).map((w: any) => ({
                ...w,
                id: w.id.toString(),
            }));
            setWarehouses(whs);
            if (whs.length > 0) setSelectedWarehouse(whs[0].id);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter products by search
    const filteredProducts = useMemo(() => {
        if (!search.trim()) return products;
        const term = search.toLowerCase();
        return products.filter(
            (p) =>
                p.name.toLowerCase().includes(term) ||
                (p.sku && p.sku.toLowerCase().includes(term))
        );
    }, [products, search]);

    // Add product to cart
    const addToCart = (product: Product) => {
        setCart((prev) => {
            const existing = prev.find((item) => item.product.id === product.id);
            if (existing) {
                return prev.map((item) =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { product, quantity: 1, unitPrice: Number(product.defaultPrice) || 0 }];
        });
    };

    // Update cart item quantity
    const updateQuantity = (productId: string, delta: number) => {
        setCart((prev) =>
            prev
                .map((item) =>
                    item.product.id === productId
                        ? { ...item, quantity: Math.max(0, item.quantity + delta) }
                        : item
                )
                .filter((item) => item.quantity > 0)
        );
    };

    // Remove from cart
    const removeFromCart = (productId: string) => {
        setCart((prev) => prev.filter((item) => item.product.id !== productId));
    };

    // Calculate totals with discount
    const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const calculatedDiscount = discountPercent > 0
        ? Math.round(subtotal * discountPercent / 100)
        : discountAmount;
    const total = Math.max(0, subtotal - calculatedDiscount);

    // Format currency
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN').format(value);
    };

    // Checkout
    const handleCheckout = async () => {
        if (cart.length === 0) {
            toast.error('Giỏ hàng trống');
            return;
        }

        setProcessing(true);
        try {
            const response = await salesAPI.create({
                customerId: selectedCustomer || undefined,
                warehouseId: selectedWarehouse || undefined,
                discountAmount: calculatedDiscount,
                items: cart.map((item) => ({
                    productId: item.product.id,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                })),
                payment: {
                    amount: total,
                    method: paymentMethod,
                },
            });

            setLastOrderNumber(response.data?.orderNumber || 'N/A');
            setShowSuccess(true);
            setCart([]);
            setSelectedCustomer('');
            setDiscountPercent(0);
            setDiscountAmount(0);
            fetchData(); // Refresh stock
        } catch (error: any) {
            const message = error.response?.data?.message || 'Có lỗi xảy ra';
            toast.error(message);
        } finally {
            setProcessing(false);
        }
    };

    // Handle barcode/SKU search on Enter
    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && search.trim()) {
            const term = search.toLowerCase().trim();
            // Find exact match by SKU or barcode
            const exactMatch = products.find(
                p => p.sku?.toLowerCase() === term || p.name.toLowerCase() === term
            );
            if (exactMatch) {
                addToCart(exactMatch);
                setSearch('');
                toast.success(`Đã thêm: ${exactMatch.name}`);
            } else if (filteredProducts.length === 1) {
                addToCart(filteredProducts[0]);
                setSearch('');
                toast.success(`Đã thêm: ${filteredProducts[0].name}`);
            } else if (filteredProducts.length === 0) {
                toast.error('Không tìm thấy sản phẩm');
            }
        }
    };

    // Print receipt
    const handlePrint = () => {
        window.print();
    };

    // Search order for return
    const handleSearchReturnOrder = async () => {
        if (!returnOrderSearch.trim()) {
            toast.error('Vui lòng nhập mã đơn hàng');
            return;
        }

        setSearchingOrder(true);
        setReturnOrderData(null);

        try {
            // Try to find by order number first
            const response = await salesAPI.getAll({ search: returnOrderSearch.trim() });
            const orders = response.data?.data || [];

            if (orders.length === 0) {
                toast.error('Không tìm thấy đơn hàng');
                return;
            }

            // Get the first matching order
            const order = orders[0];
            if (order.status === 'RETURNED') {
                toast.error('Đơn hàng này đã được trả hàng rồi');
                return;
            }

            setReturnOrderData(order);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Không tìm thấy đơn hàng');
        } finally {
            setSearchingOrder(false);
        }
    };

    // Execute return order
    const handleReturnOrder = async () => {
        if (!returnOrderData) return;

        if (!confirm(`Xác nhận trả hàng cho đơn ${returnOrderData.orderNumber}?`)) {
            return;
        }

        setReturningOrder(true);
        try {
            await salesAPI.returnOrder(returnOrderData.id.toString(), 'Trả hàng từ POS');
            toast.success(`Trả hàng thành công: ${returnOrderData.orderNumber}`);
            setShowReturnModal(false);
            setReturnOrderData(null);
            setReturnOrderSearch('');
            fetchData(); // Refresh stock
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Không thể trả hàng');
        } finally {
            setReturningOrder(false);
        }
    };

    const closeSuccess = () => {
        setShowSuccess(false);
    };

    if (loading) {
        return (
            <div className="pos-loading">
                <span>Đang tải...</span>
            </div>
        );
    }

    return (
        <div className="pos-page">
            <Toast toasts={toast.toasts} onRemove={toast.removeToast} />

            {/* Left: Products */}
            <div className="pos-products">
                <div className="pos-toolbar">
                    <div className="search-with-icon">
                        <MdQrCodeScanner className="search-icon" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Quét mã vạch hoặc nhập SKU + Enter..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                            className="search-input"
                            autoFocus
                        />
                    </div>
                    <div className="view-toggle">
                        <button
                            className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                            onClick={() => setViewMode('list')}
                            title="Dạng danh sách"
                        >
                            <MdViewList />
                        </button>
                        <button
                            className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => setViewMode('grid')}
                            title="Dạng lưới"
                        >
                            <MdGridView />
                        </button>
                    </div>
                </div>

                {/* List View */}
                {viewMode === 'list' && (
                    <div className="product-list">
                        {filteredProducts.map((product) => (
                            <div
                                key={product.id}
                                className="product-list-item"
                                onClick={() => addToCart(product)}
                            >
                                <div className="product-thumb">
                                    {product.imageUrl ? (
                                        <img src={product.imageUrl} alt={product.name} />
                                    ) : (
                                        <div className="product-thumb-placeholder"><MdInventory2 /></div>
                                    )}
                                </div>
                                <div className="product-info">
                                    <div className="product-name">{product.name}</div>
                                    {product.sku && <div className="product-sku">{product.sku}</div>}
                                </div>
                                <div className="product-right">
                                    <div className="product-price">{formatCurrency(Number(product.defaultPrice))}đ</div>
                                    <div className={`product-stock ${(product.stock || 0) === 0 ? 'out' : (product.stock || 0) < 10 ? 'low' : ''}`}>
                                        Tồn: {product.stock || 0}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Grid View */}
                {viewMode === 'grid' && (
                    <div className="product-grid">
                        {filteredProducts.map((product) => (
                            <div
                                key={product.id}
                                className="product-card"
                                onClick={() => addToCart(product)}
                            >
                                <div className="product-card-thumb">
                                    {product.imageUrl ? (
                                        <img src={product.imageUrl} alt={product.name} />
                                    ) : (
                                        <div className="product-card-thumb-placeholder"><MdInventory2 /></div>
                                    )}
                                </div>
                                <div className="product-card-name">{product.name}</div>
                                {product.sku && <div className="product-card-sku">{product.sku}</div>}
                                <div className="product-card-price">{formatCurrency(Number(product.defaultPrice))}đ</div>
                                <div className={`product-card-stock ${(product.stock || 0) === 0 ? 'out' : (product.stock || 0) < 10 ? 'low' : ''}`}>
                                    Tồn: {product.stock || 0}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Right: Cart */}
            <div className="pos-cart">
                <div className="cart-header">
                    <h3><MdShoppingCart /> Giỏ hàng</h3>
                    <div className="cart-header-actions">
                        <button
                            className="btn-return"
                            onClick={() => setShowReturnModal(true)}
                            title="Trả hàng"
                        >
                            <MdAssignmentReturn /> Trả hàng
                        </button>
                        {cart.length > 0 && <span className="cart-count">{cart.length}</span>}
                    </div>
                </div>

                {cart.length === 0 ? (
                    <div className="cart-empty">
                        <div className="cart-empty-icon"><MdShoppingCart size={48} /></div>
                        <p>Chưa có sản phẩm</p>
                    </div>
                ) : (
                    <div className="cart-items">
                        {cart.map((item) => (
                            <div key={item.product.id} className="cart-item">
                                <div className="cart-item-info">
                                    <div className="cart-item-name">{item.product.name}</div>
                                    <div className="cart-item-price">{formatCurrency(item.unitPrice)}đ</div>
                                </div>
                                <div className="cart-item-qty">
                                    <button
                                        className="qty-btn"
                                        onClick={() => updateQuantity(item.product.id, -1)}
                                    >
                                        -
                                    </button>
                                    <span>{item.quantity}</span>
                                    <button
                                        className="qty-btn"
                                        onClick={() => updateQuantity(item.product.id, 1)}
                                    >
                                        +
                                    </button>
                                </div>
                                <div className="cart-item-total">
                                    {formatCurrency(item.unitPrice * item.quantity)}đ
                                </div>
                                <button
                                    className="cart-item-remove"
                                    onClick={() => removeFromCart(item.product.id)}
                                >
                                    <MdClose />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="cart-footer">
                    <div className="cart-summary">
                        <div className="summary-row">
                            <span>Tạm tính</span>
                            <span>{formatCurrency(subtotal)}đ</span>
                        </div>

                        {/* Discount Section */}
                        <div className="discount-section">
                            <div className="discount-row">
                                <label><MdPercent /> Chiết khấu %</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={discountPercent || ''}
                                    onChange={(e) => {
                                        setDiscountPercent(Number(e.target.value) || 0);
                                        setDiscountAmount(0);
                                    }}
                                    placeholder="0"
                                    className="discount-input"
                                />
                            </div>
                            <div className="discount-row">
                                <label>Hoặc tiền</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={discountAmount || ''}
                                    onChange={(e) => {
                                        setDiscountAmount(Number(e.target.value) || 0);
                                        setDiscountPercent(0);
                                    }}
                                    placeholder="0"
                                    className="discount-input"
                                />
                            </div>
                        </div>

                        {calculatedDiscount > 0 && (
                            <div className="summary-row discount">
                                <span>Chiết khấu</span>
                                <span>-{formatCurrency(calculatedDiscount)}đ</span>
                            </div>
                        )}

                        <div className="summary-row total">
                            <span>Tổng cộng</span>
                            <span>{formatCurrency(total)}đ</span>
                        </div>
                    </div>

                    <div className="customer-select">
                        <select
                            value={selectedCustomer}
                            onChange={(e) => setSelectedCustomer(e.target.value)}
                        >
                            <option value="">-- Khách lẻ --</option>
                            {customers.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name} {c.phone ? `(${c.phone})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="payment-methods">
                        <button
                            className={`payment-btn ${paymentMethod === 'CASH' ? 'active' : ''}`}
                            onClick={() => setPaymentMethod('CASH')}
                        >
                            <MdAttachMoney /> Tiền mặt
                        </button>
                        <button
                            className={`payment-btn ${paymentMethod === 'TRANSFER' ? 'active' : ''}`}
                            onClick={() => setPaymentMethod('TRANSFER')}
                        >
                            <MdAccountBalance /> Chuyển khoản
                        </button>
                        <button
                            className={`payment-btn ${paymentMethod === 'CARD' ? 'active' : ''}`}
                            onClick={() => setPaymentMethod('CARD')}
                        >
                            <MdCreditCard /> Thẻ
                        </button>
                    </div>

                    <button
                        className="checkout-btn"
                        onClick={handleCheckout}
                        disabled={cart.length === 0 || processing}
                    >
                        {processing ? 'Đang xử lý...' : `Thanh toán ${formatCurrency(total)}đ`}
                    </button>
                </div>
            </div>

            {/* Success Modal */}
            {showSuccess && (
                <div className="success-overlay" onClick={closeSuccess}>
                    <div className="success-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="success-icon"><MdCheckCircle size={64} /></div>
                        <h2>Thanh toán thành công!</h2>
                        <p>Mã đơn hàng: <strong>{lastOrderNumber}</strong></p>
                        <div className="success-actions">
                            <button onClick={handlePrint} className="btn-print">
                                <MdPrint /> In hóa đơn
                            </button>
                            <button onClick={closeSuccess}>Đóng</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Return Modal */}
            {showReturnModal && (
                <div className="return-overlay" onClick={() => setShowReturnModal(false)}>
                    <div className="return-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="return-header">
                            <h2><MdAssignmentReturn /> Trả hàng</h2>
                            <button className="close-btn" onClick={() => setShowReturnModal(false)}>
                                <MdClose />
                            </button>
                        </div>

                        <div className="return-search">
                            <input
                                type="text"
                                placeholder="Nhập mã đơn hàng (VD: HD20241227...)"
                                value={returnOrderSearch}
                                onChange={(e) => setReturnOrderSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearchReturnOrder()}
                            />
                            <button onClick={handleSearchReturnOrder} disabled={searchingOrder}>
                                <MdSearch /> {searchingOrder ? 'Đang tìm...' : 'Tìm'}
                            </button>
                        </div>

                        {returnOrderData && (
                            <div className="return-order-info">
                                <div className="order-summary">
                                    <h4>{returnOrderData.orderNumber}</h4>
                                    <p>Trạng thái: <span className={`status-${returnOrderData.status?.toLowerCase()}`}>{returnOrderData.status}</span></p>
                                    <p>Tổng tiền: <strong>{formatCurrency(returnOrderData.totalAmount)}đ</strong></p>
                                    <p>Ngày tạo: {new Date(returnOrderData.createdAt).toLocaleDateString('vi-VN')}</p>
                                </div>

                                <div className="order-items">
                                    <h5>Sản phẩm ({returnOrderData.orderItems?.length || 0})</h5>
                                    <ul>
                                        {returnOrderData.orderItems?.map((item: any) => (
                                            <li key={item.id}>
                                                <span>{item.variant?.product?.name || 'SP'}</span>
                                                <span>x{Number(item.quantity)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <button
                                    className="btn-confirm-return"
                                    onClick={handleReturnOrder}
                                    disabled={returningOrder}
                                >
                                    {returningOrder ? 'Đang xử lý...' : 'Xác nhận trả hàng'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
