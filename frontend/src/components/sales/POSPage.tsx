import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { productsAPI, customersAPI, warehousesAPI, salesAPI, inventoryAPI, priceListsAPI } from '../../services/api';
import { Toast, useToast } from '../shared/Toast';
import { MdShoppingCart, MdClose, MdCheckCircle, MdAttachMoney, MdAccountBalance, MdCreditCard, MdQrCodeScanner, MdPrint, MdAssignmentReturn, MdSearch, MdAdd, MdReceipt, MdFlashOn, MdFlashOff, MdPerson, MdStorefront, MdMoreHoriz, MdExpandMore, MdSettings } from 'react-icons/md';
import { FaFacebook, FaInstagram } from 'react-icons/fa';
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

interface PriceList {
    id: string;
    name: string;
    code: string;
    isDefault: boolean;
}

// Invoice interface for multi-tab support
interface Invoice {
    id: string;
    name: string;
    cart: CartItem[];
    customerId: string;
    discountPercent: number;
    discountAmount: number;
    paymentMethod: PaymentMethod;
    customerPayment: number;
    createdAt: Date;
}

type PaymentMethod = 'CASH' | 'TRANSFER' | 'CARD';
type ViewMode = 'grid' | 'list';
type SaleMode = 'quick' | 'normal';
type SalesChannel = 'direct' | 'facebook' | 'instagram' | 'other';

// Helper to generate unique ID
const generateId = () => `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Create a new empty invoice
const createNewInvoice = (index: number): Invoice => ({
    id: generateId(),
    name: `Hóa đơn ${index}`,
    cart: [],
    customerId: '',
    discountPercent: 0,
    discountAmount: 0,
    paymentMethod: 'CASH',
    customerPayment: 0,
    createdAt: new Date(),
});

// Print Invoice Component
const PrintInvoice = ({
    invoice,
    settings,
    sellerName
}: {
    invoice: Invoice | undefined,
    settings: any,
    sellerName: string
}) => {
    if (!invoice) return null;

    const total = invoice.cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) - invoice.discountAmount; // Simplified

    // Template A & B: Standard A4 Invoice
    if (settings.template === 'A' || settings.template === 'B') {
        return (
            <div className="print-template template-a4">
                <div className="print-header">
                    <div className="company-info">
                        <div className="logo-text">MIXU <small>OFFICE SUPPLIES</small></div>
                        <div className="company-details">
                            <h1>CÔNG TY TNHH MTV TM VÀ DV MIXU</h1>
                            <p><strong>A</strong> - 119 Nguyễn Hữu Thọ, Q. Hải Châu, Tp. Đà Nẵng</p>
                            <p><strong>T/Zalo</strong> - 0932.542.168 - 0934.792.168</p>
                            <p><strong>W</strong> - mixuoffice.com - <strong>E</strong> - mixuoffice@gmail.com</p>
                        </div>
                    </div>
                    <div className="invoice-title">
                        <h2>HÓA ĐƠN BÁN HÀNG</h2>
                        <div className="invoice-meta">
                            <span>Mã đơn hàng: <strong>{invoice.id}</strong></span>
                            <span>{new Date().toLocaleString('vi-VN')}</span>
                            <span className="invoice-number">Hóa đơn <strong>1</strong></span>
                        </div>
                    </div>
                </div>

                <div className="customer-info-print">
                    <div className="row">
                        <span className="label">Khách hàng:</span>
                        <span className="value">{invoice.customerId || 'Khách lẻ'}</span>
                    </div>
                    <div className="row">
                        <span className="label">Số điện thoại:</span>
                        <span className="value"></span>
                    </div>
                    <div className="row">
                        <span className="label">Địa chỉ:</span>
                        <span className="value"></span>
                    </div>
                </div>

                <table className="print-table">
                    <thead>
                        <tr>
                            <th style={{ width: '40px' }}>STT</th>
                            <th>Tên hàng</th>
                            <th style={{ width: '60px' }}>DVT</th>
                            <th style={{ width: '50px' }}>SL</th>
                            <th style={{ width: '90px' }}>Đơn giá</th>
                            <th style={{ width: '100px' }}>Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoice.cart.map((item, index) => (
                            <tr key={index}>
                                <td className="text-center">{index + 1}</td>
                                <td>{item.product.name}</td>
                                <td className="text-center">Cái</td>
                                <td className="text-center">{item.quantity}</td>
                                <td className="text-right">{new Intl.NumberFormat('vi-VN').format(item.unitPrice)}</td>
                                <td className="text-right">{new Intl.NumberFormat('vi-VN').format(item.unitPrice * item.quantity)}</td>
                            </tr>
                        ))}
                        {/* Filler rows for Template A */}
                        {settings.template === 'A' && Array.from({ length: Math.max(0, 10 - invoice.cart.length) }).map((_, i) => (
                            <tr key={`empty-${i}`} className="empty-row">
                                <td></td><td></td><td></td><td></td><td></td><td></td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={5} className="text-right font-bold">Số tiền cần phải thanh toán:</td>
                            <td className="text-right font-bold">{new Intl.NumberFormat('vi-VN').format(total)}</td>
                        </tr>
                    </tfoot>
                </table>

                <div className="print-footer">
                    <div className="signature-block">
                        <p className="role">Người mua hàng</p>
                    </div>
                    <div className="signature-block">
                        <p className="role">Đã thanh toán</p>
                    </div>
                    <div className="signature-block">
                        <p className="role">Người bán hàng</p>
                        <br /><br /><br />
                        <p className="name">{sellerName}</p>
                    </div>
                </div>

                <div className="print-footer-url">
                    https://vppmixu.kiotviet.vn/sale/#/
                    <span className="page-number">1/1</span>
                </div>
            </div>
        );
    }

    // Template C: Viet Hong
    return (
        <div className="print-template template-c">
            <div className="print-header">
                <div className="company-info">
                    {/* Reuse layout but with Viet Hong details */}
                    <div className="company-details" style={{ marginTop: '10px' }}>
                        <h1 style={{ fontSize: '18px', color: '#000' }}>CỬA HÀNG ĐẶNG THỊ VIỆT HỒNG</h1>
                        <p><strong>A</strong> - 119 Nguyễn Hữu Thọ, Q. Hải Châu, Tp. Đà Nẵng</p>
                        <p><strong>T</strong> - 0236. 6563583 - 0932.542.168</p>
                        <p><strong>W</strong> - mixuoffice.com - <strong>E</strong> - Mixuhoadon@gmail.com</p>
                    </div>
                </div>
                <div className="invoice-title">
                    <h2>HÓA ĐƠN BÁN HÀNG</h2>
                    <div className="invoice-meta">
                        <span>Mã đơn hàng: <strong>{invoice.id}</strong></span>
                        <span>{new Date().toLocaleString('vi-VN')}</span>
                        <span className="invoice-number">Hóa đơn <strong>1</strong></span>
                    </div>
                </div>
            </div>

            <div className="customer-info-print">
                <div className="row">
                    <span className="label">Khách hàng:</span>
                    <span className="value">{invoice.customerId || 'Khách lẻ'}</span>
                </div>
                <div className="row">
                    <span className="label">Số điện thoại:</span>
                    <span className="value"></span>
                </div>
                <div className="row">
                    <span className="label">Địa chỉ:</span>
                    <span className="value"></span>
                </div>
            </div>

            <table className="print-table">
                <thead>
                    <tr>
                        <th style={{ width: '40px' }}>STT</th>
                        <th>Tên hàng</th>
                        <th style={{ width: '60px' }}>DVT</th>
                        <th style={{ width: '50px' }}>SL</th>
                        <th style={{ width: '90px' }}>Đơn giá</th>
                        <th style={{ width: '100px' }}>Thành tiền</th>
                    </tr>
                </thead>
                <tbody>
                    {invoice.cart.map((item, index) => (
                        <tr key={index}>
                            <td className="text-center">{index + 1}</td>
                            <td>{item.product.name}</td>
                            <td className="text-center">Cái</td>
                            <td className="text-center">{item.quantity}</td>
                            <td className="text-right">{new Intl.NumberFormat('vi-VN').format(item.unitPrice)}</td>
                            <td className="text-right">{new Intl.NumberFormat('vi-VN').format(item.unitPrice * item.quantity)}</td>
                        </tr>
                    ))}
                    {/* Filler rows also for Template C to keep layout consistent */}
                    {Array.from({ length: Math.max(0, 10 - invoice.cart.length) }).map((_, i) => (
                        <tr key={`empty-${i}`} className="empty-row">
                            <td></td><td></td><td></td><td></td><td></td><td></td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr>
                        <td colSpan={5} className="text-right font-bold">Số tiền cần phải thanh toán:</td>
                        <td className="text-right font-bold">{new Intl.NumberFormat('vi-VN').format(total)}</td>
                    </tr>
                </tfoot>
            </table>

            <div className="print-footer">
                <div className="signature-block">
                    <p className="role">Người mua hàng</p>
                </div>
                <div className="signature-block">
                    <p className="role">Đã thanh toán</p>
                </div>
                <div className="signature-block">
                    <p className="role">Người bán hàng</p>
                    <br /><br /><br />
                    <p className="name">{sellerName}</p>
                </div>
            </div>

            <div className="print-footer-url">
                https://vppmixu.kiotviet.vn/sale/#/
                <span className="page-number">1/1</span>
            </div>
        </div>
    );
};

export default function POSPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [_warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [search, setSearch] = useState('');
    const [selectedWarehouse, setSelectedWarehouse] = useState('');
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [lastOrderNumber, setLastOrderNumber] = useState('');
    const [_viewMode, _setViewMode] = useState<ViewMode>('list');

    // Price list state
    const [priceLists, setPriceLists] = useState<PriceList[]>([]);
    const [selectedPriceList, setSelectedPriceList] = useState('');

    // Sale mode: quick (auto-print) or normal
    const [saleMode, setSaleMode] = useState<SaleMode>('normal');

    // Seller state
    const [sellers, setSellers] = useState([
        { id: '1', name: 'Mixu' },
        { id: '2', name: 'Admin' },
    ]);
    const [selectedSeller, setSelectedSeller] = useState('1');
    const [showSellerDropdown, setShowSellerDropdown] = useState(false);
    const [sellerSearch, setSellerSearch] = useState('');
    const [showAddSellerModal, setShowAddSellerModal] = useState(false);
    const [newSellerName, setNewSellerName] = useState('');

    // Sales channel state
    const [salesChannel, setSalesChannel] = useState<SalesChannel>('direct');
    const [showChannelDropdown, setShowChannelDropdown] = useState(false);

    const salesChannels = [
        { id: 'direct', name: 'Bán trực tiếp', icon: 'storefront' },
        { id: 'facebook', name: 'Facebook', icon: 'facebook' },
        { id: 'instagram', name: 'Instagram', icon: 'instagram' },
        { id: 'other', name: 'Khác', icon: 'other' },
    ];

    // Bank accounts for transfer/card payment
    // Bank codes from VietQR: https://api.vietqr.io/v2/banks
    const vietnameseBanks = [
        { code: 'VCB', name: 'Vietcombank' },
        { code: 'TCB', name: 'Techcombank' },
        { code: 'MB', name: 'MB Bank' },
        { code: 'ACB', name: 'ACB' },
        { code: 'BIDV', name: 'BIDV' },
        { code: 'VPB', name: 'VPBank' },
        { code: 'TPB', name: 'TPBank' },
        { code: 'STB', name: 'Sacombank' },
        { code: 'VIB', name: 'VIB' },
        { code: 'SHB', name: 'SHB' },
        { code: 'MSB', name: 'MSB' },
        { code: 'OCB', name: 'OCB' },
        { code: 'ABB', name: 'ABBank' },
        { code: 'NAB', name: 'Nam A Bank' },
        { code: 'VAB', name: 'VietABank' },
    ];

    const [bankAccounts, setBankAccounts] = useState([
        { id: '1', bankCode: 'VCB', bankName: 'Vietcombank', accountNumber: '1234567890123', accountName: 'MIXU TRADING', hasQR: true },
        { id: '2', bankCode: 'TCB', bankName: 'Techcombank', accountNumber: '9876543210987', accountName: 'MIXU TRADING', hasQR: true },
        { id: '3', bankCode: 'MB', bankName: 'MB Bank', accountNumber: '5555666677778888', accountName: 'MIXU TRADING', hasQR: true },
    ]);
    const [selectedBankAccount, setSelectedBankAccount] = useState('1');
    const [showQRCode, setShowQRCode] = useState(false);
    const [showBankModal, setShowBankModal] = useState(false);
    const [editingBank, setEditingBank] = useState<{
        id?: string;
        bankCode: string;
        bankName: string;
        accountNumber: string;
        accountName: string;
        hasQR: boolean;
    } | null>(null);

    // Print settings state
    interface PrintSettings {
        autoPrint: boolean;
        mergeItems: boolean;
        copies: number;
        template: 'A' | 'B' | 'C';
    }
    const [printSettings, setPrintSettings] = useState<PrintSettings>({
        autoPrint: true,
        mergeItems: false,
        copies: 1,
        template: 'A'
    });
    const [showPrintSettings, setShowPrintSettings] = useState(false);

    // Generate VietQR URL
    const generateVietQRUrl = (bankCode: string, accountNumber: string, accountName: string, amount: number, description: string = '') => {
        // VietQR API format: https://img.vietqr.io/image/{BANK_ID}-{ACCOUNT_NO}-{TEMPLATE}.png
        const template = 'compact2'; // compact, compact2, qr_only
        const encodedDesc = encodeURIComponent(description || `Thanh toan don hang`);
        const encodedName = encodeURIComponent(accountName);
        return `https://img.vietqr.io/image/${bankCode}-${accountNumber}-${template}.png?amount=${amount}&addInfo=${encodedDesc}&accountName=${encodedName}`;
    };

    // Customer search and modal state
    const [customerSearch, setCustomerSearch] = useState('');
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
    const [customerTab, setCustomerTab] = useState<'general' | 'invoice'>('general');
    const [newCustomer, setNewCustomer] = useState({
        code: '',
        name: '',
        phone: '',
        address: '',
        ward: '',
        district: '',
        group: '',
        birthday: '',
        gender: 'male' as 'male' | 'female',
        email: '',
        facebook: '',
        note: '',
        // Invoice info
        customerType: 'personal' as 'personal' | 'business',
        taxCode: '',
        idNumber: '',
        passport: '',
        bankName: '',
        bankAccount: '',
    });
    const [savingCustomer, setSavingCustomer] = useState(false);

    // Filter customers based on search
    const filteredCustomers = useMemo(() => {
        if (!customerSearch.trim()) return customers;
        const search = customerSearch.toLowerCase();
        return customers.filter(c =>
            c.name.toLowerCase().includes(search) ||
            (c.phone && c.phone.includes(search))
        );
    }, [customers, customerSearch]);

    // Multi-invoice tabs state
    const [invoices, setInvoices] = useState<Invoice[]>([createNewInvoice(1)]);
    const [activeInvoiceId, setActiveInvoiceId] = useState<string>(invoices[0]?.id || '');
    const [invoiceCounter, setInvoiceCounter] = useState(2);

    // Get active invoice
    const activeInvoice = useMemo(() =>
        invoices.find(inv => inv.id === activeInvoiceId) || invoices[0],
        [invoices, activeInvoiceId]
    );

    // Cart helpers for active invoice
    const cart = activeInvoice?.cart || [];
    const selectedCustomer = activeInvoice?.customerId || '';
    const discountPercent = activeInvoice?.discountPercent || 0;
    const discountAmount = activeInvoice?.discountAmount || 0;
    const paymentMethod = activeInvoice?.paymentMethod || 'CASH';
    const customerPayment = activeInvoice?.customerPayment || 0;

    // Update active invoice
    const updateActiveInvoice = useCallback((updates: Partial<Invoice>) => {
        setInvoices(prev => prev.map(inv =>
            inv.id === activeInvoiceId ? { ...inv, ...updates } : inv
        ));
    }, [activeInvoiceId]);

    // Add new invoice tab
    const addNewInvoice = useCallback(() => {
        if (invoices.length >= 10) {
            toast.error('Tối đa 10 hóa đơn cùng lúc');
            return;
        }
        const newInvoice = createNewInvoice(invoiceCounter);
        setInvoices(prev => [...prev, newInvoice]);
        setActiveInvoiceId(newInvoice.id);
        setInvoiceCounter(prev => prev + 1);
    }, [invoices.length, invoiceCounter]);

    // Close invoice tab
    const closeInvoice = useCallback((invoiceId: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        const invoice = invoices.find(inv => inv.id === invoiceId);

        if (invoice && invoice.cart.length > 0) {
            if (!confirm(`Hóa đơn "${invoice.name}" có ${invoice.cart.length} sản phẩm. Bạn có chắc muốn đóng?`)) {
                return;
            }
        }

        setInvoices(prev => {
            const filtered = prev.filter(inv => inv.id !== invoiceId);
            if (filtered.length === 0) {
                const newInvoice = createNewInvoice(invoiceCounter);
                setInvoiceCounter(c => c + 1);
                setActiveInvoiceId(newInvoice.id);
                return [newInvoice];
            }
            if (activeInvoiceId === invoiceId) {
                setActiveInvoiceId(filtered[filtered.length - 1].id);
            }
            return filtered;
        });
    }, [invoices, activeInvoiceId, invoiceCounter]);

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
        fetchPriceLists();
    }, []);

    // Refetch products when price list changes
    useEffect(() => {
        if (selectedPriceList) {
            fetchData();
        }
    }, [selectedPriceList]);

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
            if (defaultList && !selectedPriceList) {
                setSelectedPriceList(defaultList.id);
            }
        } catch (error) {
            console.error('Error fetching price lists:', error);
        }
    };

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
            setProducts(productsData.map((p: any) => {
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
                    name: p.name,
                    sku: p.sku || '',
                    defaultPrice: price,
                    stock: stockMap.get(p.id.toString()) || 0,
                    imageUrl: p.imageUrl,
                };
            }));

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
        const currentCart = activeInvoice?.cart || [];
        const existing = currentCart.find((item) => item.product.id === product.id);
        if (existing) {
            updateActiveInvoice({
                cart: currentCart.map((item) =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                )
            });
        } else {
            updateActiveInvoice({
                cart: [...currentCart, { product, quantity: 1, unitPrice: Number(product.defaultPrice) || 0 }]
            });
        }
    };

    // Update cart item quantity
    const updateQuantity = (productId: string, delta: number) => {
        const currentCart = activeInvoice?.cart || [];
        updateActiveInvoice({
            cart: currentCart
                .map((item) =>
                    item.product.id === productId
                        ? { ...item, quantity: Math.max(0, item.quantity + delta) }
                        : item
                )
                .filter((item) => item.quantity > 0)
        });
    };

    // Remove from cart
    const removeFromCart = (productId: string) => {
        const currentCart = activeInvoice?.cart || [];
        updateActiveInvoice({
            cart: currentCart.filter((item) => item.product.id !== productId)
        });
    };

    // Update unit price for cart item
    const updateUnitPrice = (productId: string, newPrice: number) => {
        const currentCart = activeInvoice?.cart || [];
        updateActiveInvoice({
            cart: currentCart.map((item) =>
                item.product.id === productId
                    ? { ...item, unitPrice: Math.max(0, newPrice) }
                    : item
            )
        });
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
            const requestBody = {
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
            };

            console.log('Sending checkout request:', requestBody);
            const response = await salesAPI.create(requestBody);

            setLastOrderNumber(response.data?.orderNumber || 'N/A');

            // Quick sale: auto-print and skip success modal
            if (saleMode === 'quick') {
                // Print receipt immediately
                window.print();
                toast.success(`Đã thanh toán: ${response.data?.orderNumber || 'N/A'}`);
            } else {
                setShowSuccess(true);
            }

            // Reset active invoice
            updateActiveInvoice({
                cart: [],
                customerId: '',
                discountPercent: 0,
                discountAmount: 0,
            });
            fetchData(); // Refresh stock
        } catch (error: any) {
            console.error('Checkout error:', error);
            console.error('Error response:', error.response?.data);

            // Extract error message from nested structure
            const errorData = error.response?.data?.error;
            let message = 'Có lỗi xảy ra khi thanh toán';

            if (typeof errorData === 'object' && errorData !== null) {
                message = errorData.message || errorData.details || message;
            } else if (error.response?.data?.message) {
                message = error.response.data.message;
            }

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

    // Save new customer
    const saveNewCustomer = async () => {
        if (!newCustomer.name.trim()) {
            toast.error('Vui lòng nhập tên khách hàng');
            return;
        }

        setSavingCustomer(true);
        try {
            const response = await customersAPI.create({
                name: newCustomer.name,
                phone: newCustomer.phone || undefined,
                email: newCustomer.email || undefined,
                address: newCustomer.address || undefined,
            });

            // Add new customer to list
            const createdCustomer = response.data;
            setCustomers(prev => [...prev, createdCustomer]);

            // Select the new customer
            updateActiveInvoice({ customerId: createdCustomer.id });

            toast.success('Thêm khách hàng thành công!');
            setShowAddCustomerModal(false);
            setNewCustomer({
                code: '', name: '', phone: '', address: '', ward: '', district: '',
                group: '', birthday: '', gender: 'male', email: '', facebook: '', note: '',
                customerType: 'personal', taxCode: '', idNumber: '', passport: '', bankName: '', bankAccount: '',
            });
            setCustomerTab('general');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Không thể thêm khách hàng');
        } finally {
            setSavingCustomer(false);
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
        <>
            <div className="pos-page kiotviet-style">
                <Toast toasts={toast.toasts} onRemove={toast.removeToast} />

                {/* LEFT PANEL - Search, Tabs, Cart Table */}
                <div className="pos-left">
                    {/* ... content ... */}

                    {/* Top Bar: Search + Tabs */}
                    <div className="pos-top-bar">
                        <div className="search-box">
                            <MdSearch className="search-icon" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Tìm hàng hóa (F3)"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                className="search-input"
                                autoFocus
                            />
                            {/* Search Dropdown */}
                            {search.trim() && filteredProducts.length > 0 && (
                                <div className="search-dropdown">
                                    {filteredProducts.slice(0, 8).map((product) => (
                                        <div
                                            key={product.id}
                                            className="search-item"
                                            onClick={() => {
                                                addToCart(product);
                                                setSearch('');
                                            }}
                                        >
                                            <span className="item-sku">{product.sku || '---'}</span>
                                            <span className="item-name">{product.name}</span>
                                            <span className="item-price">{formatCurrency(Number(product.defaultPrice))}đ</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Invoice Tabs */}
                        <div className="invoice-tabs">
                            {invoices.map((inv) => (
                                <div
                                    key={inv.id}
                                    className={`tab ${inv.id === activeInvoiceId ? 'active' : ''}`}
                                    onClick={() => setActiveInvoiceId(inv.id)}
                                >
                                    <span>{inv.name}</span>
                                    {inv.cart.length > 0 && <span className="badge">{inv.cart.length}</span>}
                                    {invoices.length > 1 && (
                                        <button className="close-tab" onClick={(e) => closeInvoice(inv.id, e)}>
                                            <MdClose />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button className="add-tab" onClick={addNewInvoice}>
                                <MdAdd />
                            </button>
                        </div>
                    </div>

                    {/* Cart Table */}
                    <div className="cart-table-wrapper">
                        <table className="cart-table">
                            <thead>
                                <tr>
                                    <th className="col-stt">STT</th>
                                    <th className="col-delete"></th>
                                    <th className="col-sku">Mã hàng</th>
                                    <th className="col-name">Tên hàng</th>
                                    <th className="col-unit">ĐVT</th>
                                    <th className="col-qty">SL</th>
                                    <th className="col-price">Đơn giá</th>
                                    <th className="col-total">Thành tiền</th>
                                    <th className="col-actions"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {cart.length === 0 ? (
                                    <tr className="empty-row">
                                        <td colSpan={9}>
                                            <div className="empty-cart">
                                                <MdShoppingCart size={48} />
                                                <p>Chưa có sản phẩm</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    cart.map((item, index) => (
                                        <tr key={item.product.id}>
                                            <td className="col-stt">{cart.length - index}</td>
                                            <td className="col-delete">
                                                <button onClick={() => removeFromCart(item.product.id)}>
                                                    <MdClose />
                                                </button>
                                            </td>
                                            <td className="col-sku">{item.product.sku || '---'}</td>
                                            <td className="col-name">{item.product.name}</td>
                                            <td className="col-unit">Cái</td>
                                            <td className="col-qty">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => {
                                                        const newQty = parseInt(e.target.value) || 1;
                                                        updateQuantity(item.product.id, newQty - item.quantity);
                                                    }}
                                                    className="qty-input"
                                                />
                                            </td>
                                            <td className="col-price">
                                                <input
                                                    type="text"
                                                    value={formatCurrency(item.unitPrice)}
                                                    onChange={(e) => {
                                                        const value = e.target.value.replace(/\./g, '');
                                                        const num = parseInt(value) || 0;
                                                        updateUnitPrice(item.product.id, num);
                                                    }}
                                                    className="price-input"
                                                />
                                            </td>
                                            <td className="col-total">{formatCurrency(item.unitPrice * item.quantity)}</td>
                                            <td className="col-actions">
                                                <button onClick={() => updateQuantity(item.product.id, 1)}>+</button>
                                                <button onClick={() => updateQuantity(item.product.id, -1)}>−</button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Bottom Bar: Notes + Sale Mode */}
                    <div className="pos-bottom-bar">
                        <div className="order-note">
                            <MdReceipt />
                            <input type="text" placeholder="Ghi chú đơn hàng" />
                        </div>
                        <div className="sale-mode-btns">
                            <button
                                className={saleMode === 'quick' ? 'active' : ''}
                                onClick={() => setSaleMode('quick')}
                            >
                                <MdFlashOn /> Bán nhanh
                            </button>
                            <button
                                className={saleMode === 'normal' ? 'active' : ''}
                                onClick={() => setSaleMode('normal')}
                            >
                                <MdFlashOff /> Bán thường
                            </button>
                        </div>
                    </div>
                </div>

                {/* RIGHT PANEL - Payment Info */}
                <div className="pos-right">
                    {/* Seller & Channel */}
                    <div className="seller-channel-row">
                        {/* Seller Dropdown */}
                        <div className="dropdown-wrapper">
                            <button
                                className="dropdown-btn seller-btn"
                                onClick={() => {
                                    setShowSellerDropdown(!showSellerDropdown);
                                    setShowChannelDropdown(false);
                                }}
                            >
                                {sellers.find(s => s.id === selectedSeller)?.name || 'Chọn NV'} ▼
                            </button>
                            {showSellerDropdown && (
                                <div className="dropdown-menu">
                                    <input
                                        type="text"
                                        placeholder="Tìm người bán"
                                        value={sellerSearch}
                                        onChange={(e) => setSellerSearch(e.target.value)}
                                        className="dropdown-search"
                                        autoFocus
                                    />
                                    {sellers
                                        .filter(s => s.name.toLowerCase().includes(sellerSearch.toLowerCase()))
                                        .map(s => (
                                            <div
                                                key={s.id}
                                                className={`dropdown-item ${s.id === selectedSeller ? 'active' : ''}`}
                                                onClick={() => {
                                                    setSelectedSeller(s.id);
                                                    setShowSellerDropdown(false);
                                                    setSellerSearch('');
                                                }}
                                            >
                                                {s.name}
                                                {s.id === selectedSeller && <MdCheckCircle className="check" />}
                                            </div>
                                        ))}
                                    <div
                                        className="dropdown-item add-new-item"
                                        onClick={() => {
                                            setShowSellerDropdown(false);
                                            setShowAddSellerModal(true);
                                            setNewSellerName('');
                                        }}
                                    >
                                        <MdAdd /> Thêm người bán
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sales Channel Dropdown */}
                        <div className="dropdown-wrapper">
                            <button
                                className="dropdown-btn channel-btn"
                                onClick={() => {
                                    setShowChannelDropdown(!showChannelDropdown);
                                    setShowSellerDropdown(false);
                                }}
                            >
                                {salesChannel === 'direct' && <MdStorefront />}
                                {salesChannel === 'facebook' && <FaFacebook />}
                                {salesChannel === 'instagram' && <FaInstagram />}
                                {salesChannel === 'other' && <MdMoreHoriz />}
                                <MdExpandMore />
                            </button>
                            {showChannelDropdown && (
                                <div className="dropdown-menu channel-menu">
                                    {salesChannels.map(c => (
                                        <div
                                            key={c.id}
                                            className={`dropdown-item ${c.id === salesChannel ? 'active' : ''}`}
                                            onClick={() => {
                                                setSalesChannel(c.id as SalesChannel);
                                                setShowChannelDropdown(false);
                                            }}
                                        >
                                            <span className="channel-icon">
                                                {c.icon === 'storefront' && <MdStorefront />}
                                                {c.icon === 'facebook' && <FaFacebook />}
                                                {c.icon === 'instagram' && <FaInstagram />}
                                                {c.icon === 'other' && <MdMoreHoriz />}
                                            </span>
                                            {c.name}
                                            {c.id === salesChannel && <MdCheckCircle className="check" />}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <span className="time">{new Date().toLocaleDateString('vi-VN')} {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    {/* Customer & Price List Row */}
                    <div className="customer-row">
                        <div className="customer-search-wrapper">
                            <div className="customer-search-box">
                                <MdSearch className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Tìm khách hàng (F4)"
                                    value={customerSearch}
                                    onChange={(e) => setCustomerSearch(e.target.value)}
                                    onFocus={() => setShowCustomerDropdown(true)}
                                    className="customer-search-input"
                                />
                                {selectedCustomer && (
                                    <button
                                        className="clear-customer-btn"
                                        onClick={() => {
                                            updateActiveInvoice({ customerId: '' });
                                            setCustomerSearch('');
                                        }}
                                        title="Xóa khách hàng"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                            {showCustomerDropdown && (
                                <div className="customer-dropdown">
                                    {filteredCustomers.length === 0 ? (
                                        <div className="dropdown-empty">Không tìm thấy khách hàng</div>
                                    ) : (
                                        filteredCustomers.slice(0, 8).map((c) => (
                                            <div
                                                key={c.id}
                                                className={`dropdown-item ${c.id === selectedCustomer ? 'active' : ''}`}
                                                onClick={() => {
                                                    updateActiveInvoice({ customerId: c.id });
                                                    setCustomerSearch(c.name);
                                                    setShowCustomerDropdown(false);
                                                }}
                                            >
                                                <span className="customer-name">{c.name}</span>
                                                {c.phone && <span className="customer-phone">{c.phone}</span>}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                        <button
                            className="add-customer-btn"
                            title="Thêm khách hàng"
                            onClick={() => {
                                setShowAddCustomerModal(true);
                                setShowCustomerDropdown(false);
                            }}
                        >
                            +
                        </button>
                        <select
                            className="pricelist-select"
                            value={selectedPriceList}
                            onChange={(e) => setSelectedPriceList(e.target.value)}
                        >
                            {priceLists.map((pl) => (
                                <option key={pl.id} value={pl.id}>
                                    {pl.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Summary */}
                    <div className="payment-summary">
                        <div className="summary-line">
                            <span>Tổng tiền hàng</span>
                            <span className="count">{cart.reduce((sum, i) => sum + i.quantity, 0)}</span>
                            <span className="amount">{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="summary-line">
                            <span>Giảm giá</span>
                            <input
                                type="number"
                                min="0"
                                value={discountAmount || ''}
                                onChange={(e) => updateActiveInvoice({ discountAmount: Number(e.target.value) || 0, discountPercent: 0 })}
                                placeholder="0"
                                className="discount-input"
                            />
                        </div>
                        <div className="summary-line highlight">
                            <span>Khách cần trả</span>
                            <span className="amount total">{formatCurrency(total)}</span>
                        </div>
                        <div className="summary-line">
                            <span>Khách thanh toán</span>
                            <input
                                type="text"
                                value={customerPayment > 0 ? formatCurrency(customerPayment) : ''}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/\./g, '');
                                    const num = parseInt(value) || 0;
                                    updateActiveInvoice({ customerPayment: num });
                                }}
                                placeholder="0"
                                className="payment-input"
                            />
                        </div>
                    </div>

                    {/* Payment Methods */}
                    <div className="payment-methods">
                        <label className={paymentMethod === 'CASH' ? 'active' : ''}>
                            <input type="radio" name="payment" checked={paymentMethod === 'CASH'} onChange={() => updateActiveInvoice({ paymentMethod: 'CASH' })} />
                            <MdAttachMoney /> Tiền mặt
                        </label>
                        <label className={paymentMethod === 'TRANSFER' ? 'active' : ''}>
                            <input type="radio" name="payment" checked={paymentMethod === 'TRANSFER'} onChange={() => updateActiveInvoice({ paymentMethod: 'TRANSFER' })} />
                            <MdAccountBalance /> Chuyển khoản
                        </label>
                        <label className={paymentMethod === 'CARD' ? 'active' : ''}>
                            <input type="radio" name="payment" checked={paymentMethod === 'CARD'} onChange={() => updateActiveInvoice({ paymentMethod: 'CARD' })} />
                            <MdCreditCard /> Thẻ
                        </label>
                    </div>

                    {/* Bank Info Panel - Show for Transfer or Card payment */}
                    {(paymentMethod === 'TRANSFER' || paymentMethod === 'CARD') && (
                        <div className="bank-info-panel">
                            <div className="bank-select-row">
                                <label>Tài khoản:</label>
                                <select
                                    value={selectedBankAccount}
                                    onChange={(e) => setSelectedBankAccount(e.target.value)}
                                >
                                    {bankAccounts.map(bank => (
                                        <option key={bank.id} value={bank.id}>
                                            {bank.bankName} - {bank.accountNumber.slice(-4)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {bankAccounts.find(b => b.id === selectedBankAccount) && (
                                <div className="bank-details">
                                    <div className="bank-info-row">
                                        <span className="label">Ngân hàng:</span>
                                        <span className="value">{bankAccounts.find(b => b.id === selectedBankAccount)?.bankName}</span>
                                    </div>
                                    <div className="bank-info-row">
                                        <span className="label">Số TK:</span>
                                        <span className="value account-number">{bankAccounts.find(b => b.id === selectedBankAccount)?.accountNumber}</span>
                                    </div>
                                    <div className="bank-info-row">
                                        <span className="label">Chủ TK:</span>
                                        <span className="value">{bankAccounts.find(b => b.id === selectedBankAccount)?.accountName}</span>
                                    </div>
                                    <div className="bank-actions">
                                        <button
                                            className="btn-edit-bank"
                                            onClick={() => {
                                                const bank = bankAccounts.find(b => b.id === selectedBankAccount);
                                                if (bank) {
                                                    setEditingBank({ ...bank });
                                                    setShowBankModal(true);
                                                }
                                            }}
                                        >
                                            ✏️ Sửa
                                        </button>
                                        <button
                                            className="btn-add-bank"
                                            onClick={() => {
                                                setEditingBank({ bankCode: 'VCB', bankName: 'Vietcombank', accountNumber: '', accountName: '', hasQR: true });
                                                setShowBankModal(true);
                                            }}
                                        >
                                            + Thêm TK
                                        </button>
                                    </div>
                                    {bankAccounts.find(b => b.id === selectedBankAccount)?.hasQR && (
                                        <button
                                            className="btn-show-qr"
                                            onClick={() => setShowQRCode(!showQRCode)}
                                        >
                                            <MdQrCodeScanner /> {showQRCode ? 'Ẩn QR' : 'Hiện QR'}
                                        </button>
                                    )}
                                    {showQRCode && bankAccounts.find(b => b.id === selectedBankAccount)?.hasQR && (
                                        <div className="qr-code-display">
                                            {(() => {
                                                const bank = bankAccounts.find(b => b.id === selectedBankAccount);
                                                if (!bank) return null;
                                                const qrUrl = generateVietQRUrl(bank.bankCode, bank.accountNumber, bank.accountName, total);
                                                return (
                                                    <div className="qr-real">
                                                        <img
                                                            src={qrUrl}
                                                            alt="VietQR Payment Code"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).style.display = 'none';
                                                            }}
                                                        />
                                                        <div className="qr-info">
                                                            <span className="qr-amount">{formatCurrency(total)}đ</span>
                                                            <span className="qr-note">Quét mã để thanh toán</span>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Quick Amount Buttons */}
                    <div className="quick-amounts">
                        {[total, Math.ceil(total / 1000) * 1000, Math.ceil(total / 10000) * 10000, Math.ceil(total / 50000) * 50000].filter((v, i, a) => a.indexOf(v) === i && v > 0).slice(0, 4).map((amount) => (
                            <button key={amount} className="amount-btn" onClick={() => updateActiveInvoice({ customerPayment: amount })}>
                                {formatCurrency(amount)}
                            </button>
                        ))}
                    </div>

                    {/* Balance */}
                    <div className="balance-line">
                        <span>Tiền thừa trả khách</span>
                        <span className={`amount ${customerPayment - total >= 0 ? 'positive' : 'negative'}`}>
                            {customerPayment - total >= 0 ? formatCurrency(customerPayment - total) : `-${formatCurrency(total - customerPayment)}`}
                        </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="action-buttons">
                        <button
                            className="btn-print-settings"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowPrintSettings(!showPrintSettings);
                            }}
                        >
                            <MdSettings />
                        </button>
                        {showPrintSettings && (
                            <div className="print-settings-popover" onClick={(e) => e.stopPropagation()}>
                                <div className="setting-row">
                                    <span>Tự động in hóa đơn</span>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={printSettings.autoPrint}
                                            onChange={(e) => setPrintSettings({ ...printSettings, autoPrint: e.target.checked })}
                                        />
                                        <span className="slider round"></span>
                                    </label>
                                </div>
                                <div className="setting-row">
                                    <span>Gộp hàng cùng loại</span>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={printSettings.mergeItems}
                                            onChange={(e) => setPrintSettings({ ...printSettings, mergeItems: e.target.checked })}
                                        />
                                        <span className="slider round"></span>
                                    </label>
                                </div>
                                <div className="setting-row">
                                    <span>Số bản in (Liên)</span>
                                    <input
                                        type="number"
                                        min="1"
                                        value={printSettings.copies}
                                        onChange={(e) => setPrintSettings({ ...printSettings, copies: parseInt(e.target.value) || 1 })}
                                        className="copies-input"
                                    />
                                </div>
                                <div className="template-section">
                                    <span className="section-title">Chọn mẫu in</span>
                                    <div className="template-options">
                                        <button
                                            className={`template-btn ${printSettings.template === 'A' ? 'active' : ''}`}
                                            onClick={() => setPrintSettings({ ...printSettings, template: 'A' })}
                                        >
                                            A. Hóa Đơn Thêm Dòng
                                        </button>
                                        <button
                                            className={`template-btn ${printSettings.template === 'B' ? 'active' : ''}`}
                                            onClick={() => setPrintSettings({ ...printSettings, template: 'B' })}
                                        >
                                            B. Hóa Đơn
                                        </button>
                                        <button
                                            className={`template-btn ${printSettings.template === 'C' ? 'active' : ''}`}
                                            onClick={() => setPrintSettings({ ...printSettings, template: 'C' })}
                                        >
                                            C. Mẫu in việt hồng
                                        </button>
                                    </div>
                                </div>
                                <div className="popover-footer">
                                    <button className="btn-skip" onClick={() => setShowPrintSettings(false)}>Bỏ qua</button>
                                    <button className="btn-done" onClick={() => setShowPrintSettings(false)}>Xong</button>
                                </div>
                            </div>
                        )}
                        <button className="btn-print" onClick={handlePrint}>
                            <MdPrint /> IN
                        </button>
                        <button
                            className="btn-checkout"
                            onClick={handleCheckout}
                            disabled={cart.length === 0 || processing}
                        >
                            {processing ? 'ĐANG XỬ LÝ...' : 'THANH TOÁN'}
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

                {/* Add Seller Modal */}
                {showAddSellerModal && (
                    <div className="modal-overlay" onClick={() => setShowAddSellerModal(false)}>
                        <div className="add-customer-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>Thêm người bán</h2>
                                <button className="close-btn" onClick={() => setShowAddSellerModal(false)}>
                                    <MdClose />
                                </button>
                            </div>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Tên người bán</label>
                                    <input
                                        type="text"
                                        placeholder="Nhập tên người bán"
                                        value={newSellerName}
                                        onChange={(e) => setNewSellerName(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn-cancel" onClick={() => setShowAddSellerModal(false)}>
                                    Hủy
                                </button>
                                <button
                                    className="btn-save"
                                    onClick={() => {
                                        if (!newSellerName.trim()) {
                                            toast.error('Vui lòng nhập tên người bán');
                                            return;
                                        }
                                        const newSeller = {
                                            id: `seller_${Date.now()}`,
                                            name: newSellerName.trim()
                                        };
                                        setSellers(prev => [...prev, newSeller]);
                                        setSelectedSeller(newSeller.id);
                                        setShowAddSellerModal(false);
                                        toast.success('Đã thêm người bán mới');
                                    }}
                                >
                                    Lưu
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Bank Account Edit Modal */}
                {showBankModal && editingBank && (
                    <div className="modal-overlay" onClick={() => setShowBankModal(false)}>
                        <div className="bank-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>{editingBank.id ? 'Sửa tài khoản' : 'Thêm tài khoản'}</h2>
                                <button className="close-btn" onClick={() => setShowBankModal(false)}>
                                    <MdClose />
                                </button>
                            </div>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Ngân hàng</label>
                                    <select
                                        value={editingBank.bankCode}
                                        onChange={(e) => {
                                            const bank = vietnameseBanks.find(b => b.code === e.target.value);
                                            if (bank) {
                                                setEditingBank({ ...editingBank, bankCode: bank.code, bankName: bank.name });
                                            }
                                        }}
                                    >
                                        {vietnameseBanks.map(bank => (
                                            <option key={bank.code} value={bank.code}>
                                                {bank.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Số tài khoản</label>
                                    <input
                                        type="text"
                                        placeholder="Nhập số tài khoản"
                                        value={editingBank.accountNumber}
                                        onChange={(e) => setEditingBank({ ...editingBank, accountNumber: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Tên chủ tài khoản</label>
                                    <input
                                        type="text"
                                        placeholder="VD: NGUYEN VAN A"
                                        value={editingBank.accountName}
                                        onChange={(e) => setEditingBank({ ...editingBank, accountName: e.target.value.toUpperCase() })}
                                    />
                                </div>
                                <div className="form-group checkbox-group">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={editingBank.hasQR}
                                            onChange={(e) => setEditingBank({ ...editingBank, hasQR: e.target.checked })}
                                        />
                                        Có mã QR thanh toán
                                    </label>
                                </div>
                            </div>
                            <div className="modal-footer">
                                {editingBank.id && (
                                    <button
                                        className="btn-delete"
                                        onClick={() => {
                                            if (confirm('Xác nhận xóa tài khoản này?')) {
                                                setBankAccounts(prev => prev.filter(b => b.id !== editingBank.id));
                                                setShowBankModal(false);
                                                if (selectedBankAccount === editingBank.id) {
                                                    setSelectedBankAccount(bankAccounts[0]?.id || '');
                                                }
                                            }
                                        }}
                                    >
                                        Xóa
                                    </button>
                                )}
                                <button className="btn-cancel" onClick={() => setShowBankModal(false)}>
                                    Hủy
                                </button>
                                <button
                                    className="btn-save"
                                    onClick={() => {
                                        if (!editingBank.bankName || !editingBank.accountNumber || !editingBank.accountName) {
                                            toast.error('Vui lòng điền đầy đủ thông tin');
                                            return;
                                        }
                                        if (editingBank.id) {
                                            // Update existing
                                            setBankAccounts(prev => prev.map(b =>
                                                b.id === editingBank.id ? editingBank as typeof b : b
                                            ));
                                        } else {
                                            // Add new
                                            const newBank = {
                                                ...editingBank,
                                                id: `bank_${Date.now()}`
                                            };
                                            setBankAccounts(prev => [...prev, newBank]);
                                            setSelectedBankAccount(newBank.id);
                                        }
                                        setShowBankModal(false);
                                        toast.success(editingBank.id ? 'Đã cập nhật tài khoản' : 'Đã thêm tài khoản');
                                    }}
                                >
                                    Lưu
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Add Customer Modal */}
                {showAddCustomerModal && (
                    <div className="modal-overlay" onClick={() => setShowAddCustomerModal(false)}>
                        <div className="add-customer-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>Thêm khách hàng</h2>
                                <span className="branch-info">Chi nhánh tạo: Chi nhánh trung tâm</span>
                                <button className="close-btn" onClick={() => setShowAddCustomerModal(false)}>
                                    <MdClose />
                                </button>
                            </div>

                            <div className="modal-tabs">
                                <button
                                    className={customerTab === 'general' ? 'active' : ''}
                                    onClick={() => setCustomerTab('general')}
                                >
                                    Thông tin chung
                                </button>
                                <button
                                    className={customerTab === 'invoice' ? 'active' : ''}
                                    onClick={() => setCustomerTab('invoice')}
                                >
                                    Thông tin xuất hóa đơn
                                </button>
                            </div>

                            <div className="modal-body">
                                {customerTab === 'general' && (
                                    <div className="form-grid">
                                        <div className="form-left">
                                            <div className="avatar-section">
                                                <div className="avatar-placeholder"><MdPerson /></div>
                                                <button className="btn-choose-avatar">Chọn ảnh</button>
                                            </div>
                                        </div>
                                        <div className="form-columns">
                                            <div className="form-column">
                                                <div className="form-group">
                                                    <label>Mã khách hàng</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Mã mặc định"
                                                        value={newCustomer.code}
                                                        onChange={(e) => setNewCustomer(p => ({ ...p, code: e.target.value }))}
                                                    />
                                                </div>
                                                <div className="form-group required">
                                                    <label>Tên khách hàng</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Bắt buộc"
                                                        value={newCustomer.name}
                                                        onChange={(e) => setNewCustomer(p => ({ ...p, name: e.target.value }))}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>Điện thoại</label>
                                                    <input
                                                        type="text"
                                                        value={newCustomer.phone}
                                                        onChange={(e) => setNewCustomer(p => ({ ...p, phone: e.target.value }))}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>Địa chỉ</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Số nhà, tòa nhà, ngõ, đường"
                                                        value={newCustomer.address}
                                                        onChange={(e) => setNewCustomer(p => ({ ...p, address: e.target.value }))}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>Khu vực</label>
                                                    <select value={newCustomer.district} onChange={(e) => setNewCustomer(p => ({ ...p, district: e.target.value }))}>
                                                        <option value="">Chọn Tỉnh/TP - Quận/Huyện</option>
                                                    </select>
                                                </div>
                                                <div className="form-group">
                                                    <label>Phường xã</label>
                                                    <select value={newCustomer.ward} onChange={(e) => setNewCustomer(p => ({ ...p, ward: e.target.value }))}>
                                                        <option value="">Chọn Phường/Xã</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="form-column">
                                                <div className="form-group">
                                                    <label>Nhóm</label>
                                                    <select value={newCustomer.group} onChange={(e) => setNewCustomer(p => ({ ...p, group: e.target.value }))}>
                                                        <option value="">Chọn nhóm</option>
                                                    </select>
                                                </div>
                                                <div className="form-group">
                                                    <label>Ngày sinh</label>
                                                    <div className="birthday-row">
                                                        <input
                                                            type="date"
                                                            value={newCustomer.birthday}
                                                            onChange={(e) => setNewCustomer(p => ({ ...p, birthday: e.target.value }))}
                                                        />
                                                        <label className="radio-label">
                                                            <input
                                                                type="radio"
                                                                name="gender"
                                                                checked={newCustomer.gender === 'male'}
                                                                onChange={() => setNewCustomer(p => ({ ...p, gender: 'male' }))}
                                                            />
                                                            Nam
                                                        </label>
                                                        <label className="radio-label">
                                                            <input
                                                                type="radio"
                                                                name="gender"
                                                                checked={newCustomer.gender === 'female'}
                                                                onChange={() => setNewCustomer(p => ({ ...p, gender: 'female' }))}
                                                            />
                                                            Nữ
                                                        </label>
                                                    </div>
                                                </div>
                                                <div className="form-group">
                                                    <label>Email</label>
                                                    <input
                                                        type="email"
                                                        value={newCustomer.email}
                                                        onChange={(e) => setNewCustomer(p => ({ ...p, email: e.target.value }))}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>Facebook</label>
                                                    <input
                                                        type="text"
                                                        value={newCustomer.facebook}
                                                        onChange={(e) => setNewCustomer(p => ({ ...p, facebook: e.target.value }))}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>Ghi chú</label>
                                                    <input
                                                        type="text"
                                                        value={newCustomer.note}
                                                        onChange={(e) => setNewCustomer(p => ({ ...p, note: e.target.value }))}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {customerTab === 'invoice' && (
                                    <div className="form-grid invoice-tab">
                                        <div className="form-columns">
                                            <div className="form-column">
                                                <div className="form-group">
                                                    <label>Loại khách hàng</label>
                                                    <div className="radio-group">
                                                        <label className="radio-label">
                                                            <input
                                                                type="radio"
                                                                name="customerType"
                                                                checked={newCustomer.customerType === 'personal'}
                                                                onChange={() => setNewCustomer(p => ({ ...p, customerType: 'personal' }))}
                                                            />
                                                            Cá nhân
                                                        </label>
                                                        <label className="radio-label">
                                                            <input
                                                                type="radio"
                                                                name="customerType"
                                                                checked={newCustomer.customerType === 'business'}
                                                                onChange={() => setNewCustomer(p => ({ ...p, customerType: 'business' }))}
                                                            />
                                                            Tổ chức/ Hộ kinh doanh
                                                        </label>
                                                    </div>
                                                </div>
                                                <div className="form-group">
                                                    <label>Tên người mua</label>
                                                    <input type="text" placeholder="Nhập tên người mua" />
                                                </div>
                                                <div className="form-group">
                                                    <label>Mã số thuế</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Nhập mã số thuế"
                                                        value={newCustomer.taxCode}
                                                        onChange={(e) => setNewCustomer(p => ({ ...p, taxCode: e.target.value }))}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>Địa chỉ</label>
                                                    <input type="text" />
                                                </div>
                                                <div className="form-group">
                                                    <label>Tỉnh/Thành phố</label>
                                                    <select><option value="">Chọn Tỉnh/Thành phố</option></select>
                                                </div>
                                                <div className="form-group">
                                                    <label>Phường/Xã</label>
                                                    <select><option value="">Chọn Phường/Xã</option></select>
                                                </div>
                                            </div>
                                            <div className="form-column">
                                                <div className="form-group">
                                                    <label>Số CMND/CCCD</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Nhập CCCD/CMND"
                                                        value={newCustomer.idNumber}
                                                        onChange={(e) => setNewCustomer(p => ({ ...p, idNumber: e.target.value }))}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>Số hộ chiếu</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Nhập số hộ chiếu"
                                                        value={newCustomer.passport}
                                                        onChange={(e) => setNewCustomer(p => ({ ...p, passport: e.target.value }))}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>Email</label>
                                                    <input type="email" placeholder="email@example.com" />
                                                </div>
                                                <div className="form-group">
                                                    <label>Số điện thoại</label>
                                                    <input type="text" placeholder="Nhập số điện thoại" />
                                                </div>
                                                <div className="form-group">
                                                    <label>Tên ngân hàng</label>
                                                    <select
                                                        value={newCustomer.bankName}
                                                        onChange={(e) => setNewCustomer(p => ({ ...p, bankName: e.target.value }))}
                                                    >
                                                        <option value="">Chọn ngân hàng</option>
                                                    </select>
                                                </div>
                                                <div className="form-group">
                                                    <label>STK ngân hàng</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Nhập số tài khoản"
                                                        value={newCustomer.bankAccount}
                                                        onChange={(e) => setNewCustomer(p => ({ ...p, bankAccount: e.target.value }))}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="modal-footer">
                                <button className="btn-cancel" onClick={() => setShowAddCustomerModal(false)}>
                                    Bỏ qua
                                </button>
                                <button className="btn-save" onClick={saveNewCustomer} disabled={savingCustomer}>
                                    {savingCustomer ? 'Đang lưu...' : 'Lưu'}
                                </button>
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
                                    placeholder="Nhập mã đơn hàng..."
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
                                    </div>
                                    <button className="btn-confirm-return" onClick={handleReturnOrder} disabled={returningOrder}>
                                        {returningOrder ? 'Đang xử lý...' : 'Xác nhận trả hàng'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Print Template Container - Outside POS Page to persist when printing */}
            <div className="print-container">
                <PrintInvoice
                    invoice={activeInvoice}
                    settings={printSettings}
                    sellerName={sellers.find(s => s.id === selectedSeller)?.name || 'Người bán'}
                />
            </div>
        </>
    );
}
