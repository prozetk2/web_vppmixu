import { useState, useEffect, useMemo } from 'react';
import { productsAPI, customersAPI, warehousesAPI, salesAPI, inventoryAPI } from '../../services/api';
import { Toast, useToast } from '../shared/Toast';
import { MdShoppingCart, MdClose, MdCheckCircle, MdGridView, MdViewList, MdInventory2, MdAttachMoney, MdAccountBalance, MdCreditCard } from 'react-icons/md';
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
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
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

    // Calculate totals
    const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const total = subtotal; // Can add discount/tax later

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
            fetchData(); // Refresh stock
        } catch (error: any) {
            const message = error.response?.data?.message || 'Có lỗi xảy ra';
            toast.error(message);
        } finally {
            setProcessing(false);
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
                    <input
                        type="text"
                        placeholder="Tìm sản phẩm theo tên hoặc mã SKU..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="search-input"
                        autoFocus
                    />
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
                    {cart.length > 0 && <span className="cart-count">{cart.length}</span>}
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
                        <button onClick={closeSuccess}>Đóng</button>
                    </div>
                </div>
            )}
        </div>
    );
}
