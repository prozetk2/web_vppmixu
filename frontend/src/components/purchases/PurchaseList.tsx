import { useState, useEffect } from 'react';
import { purchasesAPI, suppliersAPI, productsAPI, warehousesAPI, priceListsAPI, categoriesAPI } from '../../services/api';
import Modal from '../shared/Modal';
import { Toast, useToast } from '../shared/Toast';
import CurrencyInput from '../shared/CurrencyInput';
import { MdDownload, MdInventory, MdCheck, MdClose, MdEdit, MdVisibility, MdSearch, MdDelete, MdFileDownload, MdAdd, MdInventory2, MdStar, MdStarBorder, MdSettings, MdHelp, MdChevronLeft, MdChevronRight, MdPayments, MdCheckCircle, MdSchedule, MdUploadFile, MdQrCodeScanner } from 'react-icons/md';
import './PurchaseList.css';

interface PurchaseItem {
    id: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    unit?: string;
    variant: {
        product: { name: string; sku?: string; unit?: string };
    };
}

interface Purchase {
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    amountPaid?: number;
    amountDue?: number;
    note?: string;
    createdAt: string;
    confirmedAt?: string;
    supplier: { id: string; name: string; code?: string };
    warehouse?: { name: string };
    purchaseItems: PurchaseItem[];
    starred?: boolean;
}

interface Supplier {
    id: string;
    name: string;
    code?: string;
}

interface Product {
    id: string;
    name: string;
    sku?: string;
    unit?: string;
    defaultCost?: number;
}

interface Warehouse {
    id: string;
    name: string;
}

interface FormItem {
    productId: string;
    productSearch: string;
    quantity: number;
    unitCost: number;
    unit: string;
}

const STATUS_LABELS: Record<string, string> = {
    CONFIRMED: 'Đã nhập hàng',
    CANCELLED: 'Đã hủy',
    PAID: 'Đã thanh toán',
    PARTIAL: 'Thanh toán 1 phần',
    PENDING: 'Chờ xác nhận',
};

const removeAccents = (str: string) => {
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase();
};

export default function PurchaseList() {
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
    const [itemsPerPage, setItemsPerPage] = useState(15);
    const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

    // Sidebar Filters - Status checkboxes
    const [statusConfirmed, setStatusConfirmed] = useState(true);
    const [statusPaid, setStatusPaid] = useState(true);
    const [statusPartial, setStatusPartial] = useState(true);
    const [statusCancelled, setStatusCancelled] = useState(false);

    // Sidebar Filters - Date range
    const [dateRangeType, setDateRangeType] = useState<'last_year' | 'custom'>('custom');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    // Sidebar Filters - Creator/Importer (placeholders)
    const [creatorFilter, setCreatorFilter] = useState('');
    const [importerFilter, setImporterFilter] = useState('');

    // Search
    const [searchQuery, setSearchQuery] = useState('');

    // Selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [starredIds, setStarredIds] = useState<Set<string>>(new Set());

    // Sidebar collapsed state
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);

    // Product search in form
    const [productSearchQuery, setProductSearchQuery] = useState('');

    // Create/Edit Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        supplierId: '',
        warehouseId: '',
        note: '',
        prepaymentAmount: 0,
        paymentMethod: 'CASH',
        purchaseDate: '',
    });
    const [items, setItems] = useState<FormItem[]>([{ productId: '', productSearch: '', quantity: 1, unitCost: 0, unit: 'Cái' }]);
    const [submitting, setSubmitting] = useState(false);

    // Detail Modal state
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

    // Export Modal state
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [exportFromDate, setExportFromDate] = useState('');
    const [exportToDate, setExportToDate] = useState('');
    const [exportStatus, setExportStatus] = useState('');
    const [exporting, setExporting] = useState(false);

    // Quick Add Supplier Modal state
    const [isQuickSupplierOpen, setIsQuickSupplierOpen] = useState(false);
    const [supplierSearch, setSupplierSearch] = useState('');
    const [quickSupplierData, setQuickSupplierData] = useState({
        name: '',
        code: '',
        phone: '',
        email: '',
        address: '',
        area: '',
        ward: '',
        supplierGroup: '',
        notes: '',
        company: '',
        taxNumber: '',
    });
    const [savingSupplier, setSavingSupplier] = useState(false);

    // Filtered suppliers based on search
    const filteredSuppliers = suppliers.filter(s => {
        if (!supplierSearch.trim()) return true; // Show all when search is empty
        const query = removeAccents(supplierSearch);
        return removeAccents(s.name).includes(query) ||
            (s.code && removeAccents(s.code).includes(query));
    });

    // Quick Add Importer (Staff) Modal state
    const [isQuickImporterOpen, setIsQuickImporterOpen] = useState(false);
    const [importers, setImporters] = useState<{ id: string; fullName: string; username: string }[]>([]);
    const [importerSearch, setImporterSearch] = useState('');
    const [selectedImporterId, setSelectedImporterId] = useState('');
    const [quickImporterData, setQuickImporterData] = useState({
        fullName: '',
        username: '',
        phone: '',
        email: '',
    });
    const [savingImporter, setSavingImporter] = useState(false);

    // Filtered importers based on search
    const filteredImporters = importers.filter(i =>
        i.fullName.toLowerCase().includes(importerSearch.toLowerCase()) ||
        i.username.toLowerCase().includes(importerSearch.toLowerCase())
    );

    // Quick Add Store/Company Modal state
    const [isQuickStoreOpen, setIsQuickStoreOpen] = useState(false);
    const [stores, setStores] = useState<{ id: string; name: string; code: string }[]>([
        { id: '1', name: 'Mixu', code: 'MIXU' }
    ]);
    const [selectedStoreId, setSelectedStoreId] = useState('1');
    const [quickStoreData, setQuickStoreData] = useState({
        name: '',
        code: '',
        address: '',
        phone: '',
        email: '',
    });
    const [savingStore, setSavingStore] = useState(false);

    // Filtered products based on search query
    const filteredProducts = products.filter(p =>
        productSearchQuery.trim() === '' ||
        (p.sku && p.sku.toLowerCase().includes(productSearchQuery.toLowerCase())) ||
        (p.name && p.name.toLowerCase().includes(productSearchQuery.toLowerCase()))
    );

    // Quick Add Product Modal state
    const [isQuickProductOpen, setIsQuickProductOpen] = useState(false);
    const [productTab, setProductTab] = useState<'info' | 'description'>('info');
    const [quickProductData, setQuickProductData] = useState({
        sku: '',
        barcode: '',
        name: '',
        categoryId: '',
        brandId: '',
        price: 0,
        costPrice: 0,
        minStock: 0,
        maxStock: 999999999,
        weight: 0,
        location: '',
        description: '',
        notes: '',
        sellDirectly: true,
    });
    const [savingProduct, setSavingProduct] = useState(false);

    // Price List Popup state
    const [isPriceListPopupOpen, setIsPriceListPopupOpen] = useState(false);
    const [priceLists, setPriceLists] = useState<Array<{ id: string; name: string }>>([
        { id: 'pl-1', name: 'Bảng giá chưa CK' },
        { id: 'pl-2', name: 'Bảng giá lẻ' },
    ]);
    const [priceListPrices, setPriceListPrices] = useState<Record<string, number>>({});

    // Auto-generate SKU from product name
    const generateSKU = (name: string): string => {
        if (!name.trim()) return '';
        // Remove diacritics and convert to uppercase
        const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        // Get first 2 letters of each word (max 3 words)
        const words = normalized.trim().split(/\s+/).slice(0, 3);
        const prefix = words.map(w => w.slice(0, 2).toUpperCase()).join('');
        // Add random 3 digits
        const suffix = Math.floor(100 + Math.random() * 900);
        return `${prefix}${suffix}`;
    };

    const toast = useToast();

    // Legacy statusFilter for API compatibility
    // Legacy statusFilter for API compatibility
    const statusFilter = [
        statusConfirmed && 'CONFIRMED',
        statusPaid && 'PAID',
        statusPartial && 'PARTIAL',
        statusCancelled && 'CANCELLED'
    ].filter(Boolean).join(',');

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        fetchPurchases();
    }, [page, statusConfirmed, statusPaid, statusPartial, statusCancelled, searchQuery, fromDate, toDate]);

    const fetchInitialData = async () => {
        try {
            const [suppliersRes, productsRes, warehousesRes, categoriesRes, priceListsRes] = await Promise.all([
                suppliersAPI.getAll({ limit: 10000 }),
                productsAPI.getAll({ limit: 10000 }),
                warehousesAPI.getAll(),
                categoriesAPI.getAll(),
                priceListsAPI.getAll(),
            ]);
            const rawSuppliers = (suppliersRes.data?.data || suppliersRes.data || []).map((s: any) => ({
                ...s,
                id: s.id.toString(),
            }));
            console.log('Loaded suppliers:', rawSuppliers.length, rawSuppliers.map((s: any) => s.name));
            setSuppliers(rawSuppliers);
            setProducts((productsRes.data?.data || []).map((p: any) => ({
                ...p,
                id: p.id.toString(),
            })));
            setWarehouses((warehousesRes.data?.data || warehousesRes.data || []).map((w: any) => ({
                ...w,
                id: w.id.toString(),
            })));
            // Set price lists from API
            const fetchedPriceLists = (priceListsRes.data?.data || priceListsRes.data || []).map((pl: any) => ({
                id: pl.id.toString(),
                name: pl.name,
            }));
            if (fetchedPriceLists.length > 0) {
                setPriceLists(fetchedPriceLists);
            }
            setCategories((categoriesRes.data?.data || categoriesRes.data || []).map((c: any) => ({
                id: c.id.toString(),
                name: c.name,
            })));
        } catch (error) {
            console.error('Failed to fetch data:', error);
        }
    };

    const fetchPurchases = async () => {
        setLoading(true);
        try {
            const params: Record<string, unknown> = { page, limit: 15 };
            if (statusFilter) params.status = statusFilter;
            if (searchQuery) params.search = searchQuery;
            if (fromDate) params.fromDate = fromDate;
            if (toDate) params.toDate = toDate;

            const response = await purchasesAPI.getAll(params);
            setPurchases((response.data?.data || []).map((p: any) => ({
                ...p,
                id: p.id.toString(),
            })));
            setMeta(response.data?.meta || { total: 0, totalPages: 1 });
        } catch (error) {
            console.error('Failed to fetch purchases:', error);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingId(null);
        const now = new Date();
        const formattedDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setFormData({ supplierId: '', warehouseId: '', note: '', prepaymentAmount: 0, paymentMethod: 'CASH', purchaseDate: formattedDate });
        setItems([{ productId: '', productSearch: '', quantity: 1, unitCost: 0, unit: 'Cái' }]);
        setIsModalOpen(true);
    };

    const openEditModal = (purchase: Purchase) => {
        setEditingId(purchase.id);
        setFormData({
            supplierId: purchase.supplier?.id || '',
            warehouseId: '',
            note: purchase.note || '',
            prepaymentAmount: 0,
            paymentMethod: 'CASH',
            purchaseDate: purchase.createdAt ? new Date(purchase.createdAt).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
        });
        setItems(purchase.purchaseItems.map(item => {
            const product = products.find(p =>
                item.variant?.product?.name === p.name || item.variant?.product?.sku === p.sku
            );
            return {
                productId: product?.id || '',
                productSearch: '',
                quantity: item.quantity,
                unitCost: Number(item.unitCost),
                unit: item.unit || product?.unit || 'Cái',
            };
        }));
        setIsModalOpen(true);
    };

    const openDetailModal = (purchase: Purchase) => {
        setSelectedPurchase(purchase);
        setIsDetailOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
    };

    const closeDetailModal = () => {
        setIsDetailOpen(false);
        setSelectedPurchase(null);
    };

    const addItem = () => {
        setItems([...items, { productId: '', productSearch: '', quantity: 1, unitCost: 0, unit: 'Cái' }]);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: keyof FormItem, value: string | number) => {
        const newItems = [...items];
        if (field === 'productId') {
            newItems[index].productId = value as string;
            const product = products.find((p) => p.id === value);
            if (product?.defaultCost) {
                newItems[index].unitCost = Number(product.defaultCost);
            }
        } else if (field === 'productSearch') {
            newItems[index].productSearch = value as string;
        } else if (field === 'quantity') {
            newItems[index].quantity = Number(value) || 1;
        } else if (field === 'unitCost') {
            newItems[index].unitCost = Number(value) || 0;
        } else if (field === 'unit') {
            newItems[index].unit = value as string;
        }
        setItems(newItems);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.supplierId) {
            toast.error('Vui lòng chọn nhà cung cấp');
            return;
        }
        const validItems = items.filter((i) => i.productId && i.quantity > 0);
        if (validItems.length === 0) {
            toast.error('Vui lòng thêm ít nhất 1 sản phẩm');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                supplierId: formData.supplierId,
                warehouseId: formData.warehouseId || undefined,
                items: validItems,
                note: formData.note || undefined,
                prepaymentAmount: formData.prepaymentAmount || undefined,
                paymentMethod: formData.prepaymentAmount > 0 ? formData.paymentMethod : undefined,
                createdAt: formData.purchaseDate ? new Date(formData.purchaseDate).toISOString() : undefined,
            };

            if (editingId) {
                await purchasesAPI.update(editingId, payload);
                toast.success('Cập nhật đơn nhập thành công');
            } else {
                await purchasesAPI.create(payload);
                toast.success('Tạo đơn nhập hàng thành công');
            }
            closeModal();
            fetchPurchases();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
        } finally {
            setSubmitting(false);
        }
    };

    const handleConfirm = async (id: string) => {
        if (!confirm('Xác nhận nhập kho đơn hàng này?')) return;
        try {
            await purchasesAPI.confirm(id);
            toast.success('Đã nhập kho thành công');
            fetchPurchases();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
        }
    };

    // Confirm purchase - update inventory
    const handleConfirmPurchase = async (id: string) => {
        if (!window.confirm('Xác nhận đã nhập hàng? Hành động này sẽ cập nhật số lượng tồn kho.')) return;
        try {
            await purchasesAPI.confirm(id);
            toast.success('Đã xác nhận nhập hàng và cập nhật tồn kho');
            fetchPurchases();
        } catch (error: any) {
            console.error('Confirm purchase error:', error);
            toast.error(error.response?.data?.message || 'Có lỗi khi xác nhận phiếu nhập');
        }
    };

    const handleCancel = async (id: string) => {
        if (!confirm('Xác nhận hủy đơn hàng này?')) return;
        try {
            await purchasesAPI.cancel(id);
            toast.success('Đã hủy đơn hàng');
            fetchPurchases();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
        }
    };

    const handleDelete = async (id: string, orderNumber: string) => {
        if (!confirm(`Xác nhận XÓA VĨNH VIỄN đơn ${orderNumber}?`)) return;
        try {
            await purchasesAPI.delete(id);
            toast.success('Đã xóa đơn nhập hàng');
            fetchPurchases();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
        }
    };

    const openExportModal = () => {
        // Pre-fill with 30 days range
        const today = new Date();
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        setExportFromDate(thirtyDaysAgo.toISOString().slice(0, 10));
        setExportToDate(today.toISOString().slice(0, 10));
        setExportStatus('');
        setIsExportOpen(true);
    };

    const closeExportModal = () => {
        setIsExportOpen(false);
    };

    const doExport = async () => {
        try {
            setExporting(true);
            const params: Record<string, unknown> = {};
            if (exportStatus) params.status = exportStatus;
            if (exportFromDate) params.fromDate = exportFromDate;
            if (exportToDate) params.toDate = exportToDate;

            toast.success('Đang tải dữ liệu...');
            const response = await purchasesAPI.export(params);

            // Handle nested data structure
            let data = response.data;
            if (data && typeof data === 'object' && !Array.isArray(data) && Array.isArray(data.data)) {
                data = data.data;
            }

            if (!Array.isArray(data)) {
                console.error('Export data is not array:', data);
                toast.error('Dữ liệu không hợp lệ');
                return;
            }

            if (data.length === 0) {
                toast.error('Không có dữ liệu trong khoảng thời gian này');
                return;
            }

            // Dynamic import XLSX
            const xlsxModule = await import('xlsx');
            const XLSX = xlsxModule.default || xlsxModule;

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'DonNhapHang');

            const fileName = `don_nhap_hang_${exportFromDate}_${exportToDate}.xlsx`;
            XLSX.writeFile(wb, fileName);
            toast.success(`Đã xuất ${data.length} dòng ra file Excel`);
            closeExportModal();
        } catch (error: any) {
            console.error('Export error:', error);
            const errorMsg = error?.response?.data?.message || error?.message || 'Lỗi xuất Excel';
            toast.error(errorMsg);
        } finally {
            setExporting(false);
        }
    };

    const clearFilters = () => {
        setSearchQuery('');
        setStatusConfirmed(true);
        setStatusPaid(true);
        setStatusPartial(true);
        setStatusCancelled(false);
        setFromDate('');
        setToDate('');
        setPage(1);
    };

    // Quick Add Supplier handlers
    const openQuickSupplierModal = () => {
        setQuickSupplierData({
            name: '',
            code: '',
            phone: '',
            email: '',
            address: '',
            area: '',
            ward: '',
            supplierGroup: '',
            notes: '',
            company: '',
            taxNumber: '',
        });
        setIsQuickSupplierOpen(true);
    };

    const closeQuickSupplierModal = () => {
        setIsQuickSupplierOpen(false);
    };

    const handleQuickSaveSupplier = async () => {
        if (!quickSupplierData.name.trim()) {
            toast.error('Vui lòng nhập tên nhà cung cấp');
            return;
        }

        setSavingSupplier(true);
        try {
            const response = await suppliersAPI.create({
                name: quickSupplierData.name,
                code: quickSupplierData.code || undefined,
                phone: quickSupplierData.phone || undefined,
                email: quickSupplierData.email || undefined,
                address: quickSupplierData.address || undefined,
                area: quickSupplierData.area || undefined,
                ward: quickSupplierData.ward || undefined,
                supplierGroup: quickSupplierData.supplierGroup || undefined,
                notes: quickSupplierData.notes || undefined,
                company: quickSupplierData.company || undefined,
                taxNumber: quickSupplierData.taxNumber || undefined,
            });

            const newSupplier = response.data?.data || response.data;
            const newSupplierId = newSupplier.id?.toString() || '';

            // Add to local suppliers list
            setSuppliers(prev => [...prev, { id: newSupplierId, name: quickSupplierData.name, code: quickSupplierData.code }]);

            // Auto-select the new supplier
            setFormData(prev => ({ ...prev, supplierId: newSupplierId }));
            setSupplierSearch(quickSupplierData.name);

            toast.success('Tạo nhà cung cấp thành công');
            closeQuickSupplierModal();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Có lỗi khi tạo nhà cung cấp');
        } finally {
            setSavingSupplier(false);
        }
    };

    const handleSelectSupplier = (supplierId: string) => {
        setFormData(prev => ({ ...prev, supplierId }));
        const supplier = suppliers.find(s => s.id === supplierId);
        if (supplier) {
            setSupplierSearch(supplier.name);
        }
    };

    // Quick Add Importer handlers
    const openQuickImporterModal = () => {
        setQuickImporterData({
            fullName: '',
            username: '',
            phone: '',
            email: '',
        });
        setIsQuickImporterOpen(true);
    };

    const closeQuickImporterModal = () => {
        setIsQuickImporterOpen(false);
    };

    const handleQuickSaveImporter = async () => {
        if (!quickImporterData.fullName.trim()) {
            toast.error('Vui lòng nhập họ tên người nhập');
            return;
        }

        setSavingImporter(true);
        try {
            // For now, just add to local list (in real app, would call API)
            const newImporter = {
                id: `temp-${Date.now()}`,
                fullName: quickImporterData.fullName,
                username: quickImporterData.username || quickImporterData.fullName.toLowerCase().replace(/\s+/g, ''),
            };

            setImporters(prev => [...prev, newImporter]);
            setSelectedImporterId(newImporter.id);
            setImporterSearch(newImporter.fullName);

            toast.success('Thêm người nhập thành công');
            closeQuickImporterModal();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Có lỗi khi thêm người nhập');
        } finally {
            setSavingImporter(false);
        }
    };

    const handleSelectImporter = (importerId: string) => {
        setSelectedImporterId(importerId);
        const importer = importers.find(i => i.id === importerId);
        if (importer) {
            setImporterSearch(importer.fullName);
        }
    };

    // Quick Add Store handlers
    const openQuickStoreModal = () => {
        setQuickStoreData({
            name: '',
            code: '',
            address: '',
            phone: '',
            email: '',
        });
        setIsQuickStoreOpen(true);
    };

    const closeQuickStoreModal = () => {
        setIsQuickStoreOpen(false);
    };

    const handleQuickSaveStore = async () => {
        if (!quickStoreData.name.trim()) {
            toast.error('Vui lòng nhập tên công ty/cửa hàng');
            return;
        }

        setSavingStore(true);
        try {
            const newStore = {
                id: `store-${Date.now()}`,
                name: quickStoreData.name,
                code: quickStoreData.code || quickStoreData.name.toUpperCase().replace(/\s+/g, '').slice(0, 10),
            };

            setStores(prev => [...prev, newStore]);
            setSelectedStoreId(newStore.id);

            toast.success('Thêm công ty/cửa hàng thành công');
            closeQuickStoreModal();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Có lỗi khi thêm');
        } finally {
            setSavingStore(false);
        }
    };

    // Quick Add Product handlers
    const openQuickProductModal = () => {
        setQuickProductData({
            sku: '',
            barcode: '',
            name: '',
            categoryId: '',
            brandId: '',
            price: 0,
            costPrice: 0,
            minStock: 0,
            maxStock: 999999999,
            weight: 0,
            location: '',
            description: '',
            notes: '',
            sellDirectly: true,
        });
        setProductTab('info');
        setIsQuickProductOpen(true);
    };

    const closeQuickProductModal = () => {
        setIsQuickProductOpen(false);
    };

    const handleQuickSaveProduct = async () => {
        if (!quickProductData.name.trim()) {
            toast.error('Vui lòng nhập tên hàng');
            return;
        }

        setSavingProduct(true);
        try {
            // Call API to create product
            const payload = {
                name: quickProductData.name,
                sku: quickProductData.sku || undefined,
                barcode: quickProductData.barcode || undefined,
                categoryId: quickProductData.categoryId || undefined,
                brand: quickProductData.brandId || undefined,
                price: quickProductData.price || 0,
                cost: quickProductData.costPrice || 0,
                minStock: quickProductData.minStock || 0,
                maxStock: quickProductData.maxStock || 999999999,
                weight: quickProductData.weight || undefined,
                location: quickProductData.location || undefined,
                description: quickProductData.description || undefined,
                noteTemplate: quickProductData.notes || undefined,
                directSale: quickProductData.sellDirectly,
                active: true,
            };

            const response = await productsAPI.create(payload);
            const createdProduct = response.data;

            // Add to local products list
            setProducts(prev => [...prev, {
                id: createdProduct.id,
                sku: createdProduct.sku,
                name: createdProduct.name,
                defaultCost: createdProduct.cost || 0,
            }]);

            // Save prices for each price list
            const priceListEntries = Object.entries(priceListPrices);
            if (priceListEntries.length > 0) {
                const pricePromises = priceListEntries
                    .filter(([, price]) => price > 0)
                    .map(([priceListId, price]) =>
                        priceListsAPI.setProductPrice({
                            productId: createdProduct.id,
                            priceListId,
                            price,
                        })
                    );

                if (pricePromises.length > 0) {
                    await Promise.all(pricePromises);
                    console.log('Price list prices saved successfully');
                }
            }

            toast.success('Thêm hàng hóa thành công');
            closeQuickProductModal();
            // Reset price list prices
            setPriceListPrices({});
        } catch (error: any) {
            console.error('Create product error:', error);
            toast.error(error.response?.data?.message || 'Có lỗi khi thêm hàng hóa');
        } finally {
            setSavingProduct(false);
        }
    };

    // Toggle star
    const toggleStar = (id: string) => {
        setStarredIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    // Toggle selection
    const toggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    // Select all
    const toggleSelectAll = () => {
        if (selectedIds.size === purchases.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(purchases.map(p => p.id)));
        }
    };

    const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN').format(value);
    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString('vi-VN');

    const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);

    return (
        <div className="purchase-page">
            <Toast toasts={toast.toasts} onRemove={toast.removeToast} />

            {/* Header - KiotViet style */}
            <div className="purchase-header-v2">
                <h2>Nhập hàng</h2>
                <div className="header-center">
                    <div className="search-box-v2">
                        <MdSearch className="search-icon" />
                        <input
                            type="text"
                            placeholder="Theo mã phiếu nhập, tên nhà cung cấp"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setPage(1);
                            }}
                            className="search-input"
                        />
                    </div>
                </div>
                <div className="header-actions-v2">
                    <button onClick={openCreateModal} className="btn-create-v2">
                        <MdAdd /> Nhập hàng
                    </button>
                    <button onClick={openExportModal} className="btn-export-v2">
                        <MdFileDownload /> Xuất file
                    </button>
                    <button className="btn-icon" title="Cài đặt">
                        <MdSettings />
                    </button>
                    <button className="btn-icon" title="Trợ giúp">
                        <MdHelp />
                    </button>
                </div>
            </div>

            {/* Main Container with Sidebar */}
            <div className="purchase-container">
                {/* Sidebar Filters */}
                <div className={`purchase-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
                    <button
                        className="sidebar-toggle"
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        title={sidebarCollapsed ? 'Mở rộng' : 'Thu gọn'}
                    >
                        {sidebarCollapsed ? <MdChevronRight /> : <MdChevronLeft />}
                    </button>

                    {/* Trạng thái Filter */}
                    <div className="filter-group">
                        <label className="filter-label">Trạng thái</label>
                        <div className="checkbox-group">
                            <label className="checkbox-item">
                                <input
                                    type="checkbox"
                                    checked={statusConfirmed}
                                    onChange={(e) => { setStatusConfirmed(e.target.checked); setPage(1); }}
                                />
                                <span className="checkbox-custom"></span>
                                <span>Đã nhập hàng</span>
                            </label>
                            <label className="checkbox-item">
                                <input
                                    type="checkbox"
                                    checked={statusPaid}
                                    onChange={(e) => { setStatusPaid(e.target.checked); setPage(1); }}
                                />
                                <span className="checkbox-custom"></span>
                                <span>Đã thanh toán</span>
                            </label>
                            <label className="checkbox-item">
                                <input
                                    type="checkbox"
                                    checked={statusPartial}
                                    onChange={(e) => { setStatusPartial(e.target.checked); setPage(1); }}
                                />
                                <span className="checkbox-custom"></span>
                                <span>Thanh toán 1 phần</span>
                            </label>
                            <label className="checkbox-item">
                                <input
                                    type="checkbox"
                                    checked={statusCancelled}
                                    onChange={(e) => { setStatusCancelled(e.target.checked); setPage(1); }}
                                />
                                <span className="checkbox-custom"></span>
                                <span>Đã hủy</span>
                            </label>
                        </div>
                    </div>

                    {/* Thời gian Filter */}
                    <div className="filter-group">
                        <label className="filter-label">Thời gian ▼</label>
                        <div className="radio-group">
                            <label className="radio-item">
                                <input
                                    type="radio"
                                    name="dateRange"
                                    value="last_year"
                                    checked={dateRangeType === 'last_year'}
                                    onChange={() => setDateRangeType('last_year')}
                                />
                                <span className="radio-custom"></span>
                                <span>Năm trước</span>
                            </label>
                            <label className="radio-item">
                                <input
                                    type="radio"
                                    name="dateRange"
                                    value="custom"
                                    checked={dateRangeType === 'custom'}
                                    onChange={() => setDateRangeType('custom')}
                                />
                                <span className="radio-custom"></span>
                                <span>Tùy chọn</span>
                            </label>
                        </div>
                        {dateRangeType === 'custom' && (
                            <div className="date-range-inputs">
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
                                    className="date-input-v2"
                                />
                                <span className="date-separator">-</span>
                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => { setToDate(e.target.value); setPage(1); }}
                                    className="date-input-v2"
                                />
                            </div>
                        )}
                    </div>

                    {/* Người tạo Filter */}
                    <div className="filter-group">
                        <label className="filter-label">Người tạo</label>
                        <input
                            type="text"
                            placeholder="Chọn người tạo"
                            value={creatorFilter}
                            onChange={(e) => setCreatorFilter(e.target.value)}
                            className="filter-input-v2"
                        />
                    </div>

                    {/* Người nhập Filter */}
                    <div className="filter-group">
                        <label className="filter-label">Người nhập</label>
                        <div className="importer-search-compact">
                            <div className="importer-search-wrapper">
                                <input
                                    type="text"
                                    value={importerSearch}
                                    onChange={(e) => {
                                        setImporterSearch(e.target.value);
                                        setImporterFilter(e.target.value);
                                        if (selectedImporterId) {
                                            const selected = importers.find(i => i.id === selectedImporterId);
                                            if (selected && e.target.value !== selected.fullName) {
                                                setSelectedImporterId('');
                                            }
                                        }
                                    }}
                                    placeholder="Chọn người nhập"
                                    className="filter-input-v2"
                                />
                                {importerSearch && filteredImporters.length > 0 && !selectedImporterId && (
                                    <div className="importer-dropdown-list">
                                        {filteredImporters.slice(0, 6).map((i) => (
                                            <div
                                                key={i.id}
                                                className="importer-dropdown-item"
                                                onClick={() => handleSelectImporter(i.id)}
                                            >
                                                <span className="importer-name">{i.fullName}</span>
                                                <span className="importer-username">@{i.username}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button
                                type="button"
                                className="btn-add-importer"
                                onClick={openQuickImporterModal}
                                title="Thêm người nhập mới"
                            >
                                +
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="purchase-main">
                    <div className="purchase-table-wrapper-v2">
                        {loading ? (
                            <div className="purchase-loading">Đang tải...</div>
                        ) : purchases.length === 0 ? (
                            <div className="purchase-empty">
                                <div className="purchase-empty-icon"><MdInventory size={64} /></div>
                                <p>Chưa có đơn nhập hàng</p>
                            </div>
                        ) : (
                            <table className="purchase-table-v2">
                                <thead>
                                    <tr>
                                        <th className="col-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.size === purchases.length && purchases.length > 0}
                                                onChange={toggleSelectAll}
                                            />
                                        </th>
                                        <th className="col-star"></th>
                                        <th>Mã nhập hàng</th>
                                        <th>Thời gian</th>
                                        <th>Mã NCC</th>
                                        <th>Nhà cung cấp</th>
                                        <th className="col-amount">Cần trả NCC</th>
                                        <th>Trạng thái</th>
                                            <th className="text-center col-actions">Thao tác</th>
                                         </tr>
                                     </thead>
                                     <tbody>
                                         {purchases.map((p) => (
                                             <tr key={p.id} className={selectedIds.has(p.id) ? 'selected' : ''}>
                                                 <td className="col-checkbox">
                                                     <input
                                                         type="checkbox"
                                                         checked={selectedIds.has(p.id)}
                                                         onChange={() => toggleSelection(p.id)}
                                                     />
                                                 </td>
                                                 <td className="col-star">
                                                     <button className="btn-star" onClick={() => toggleStar(p.id)}>
                                                         {starredIds.has(p.id) ? <MdStar className="starred" /> : <MdStarBorder />}
                                                     </button>
                                                 </td>
                                                 <td>
                                                     <span
                                                         className="order-number-v2"
                                                         onClick={() => openDetailModal(p)}
                                                     >
                                                         {p.orderNumber}
                                                     </span>
                                                 </td>
                                                 <td className="col-date">{formatDate(p.createdAt)}</td>
                                                 <td className="col-supplier-code">{p.supplier?.code || 'NCC' + p.supplier?.id?.slice(-6)}</td>
                                                 <td className="col-supplier">{p.supplier?.name}</td>
                                                 <td className="col-amount">{formatCurrency(Number(p.amountDue))}</td>
                                                 <td>
                                                     <span className={`status-badge-v2 ${p.status}`}>
                                                         {STATUS_LABELS[p.status] || p.status}
                                                     </span>
                                                 </td>
                                                 <td className="col-actions">
                                                     <div className="actions-cell">
                                                         {p.status !== 'CANCELLED' && (
                                                             <button
                                                                 className="btn-icon btn-edit"
                                                                 onClick={(e) => {
                                                                     e.stopPropagation();
                                                                     openEditModal(p);
                                                                 }}
                                                                 title="Sửa đơn nhập"
                                                             >
                                                                 <MdEdit />
                                                             </button>
                                                         )}
                                                         <button
                                                             className="btn-icon btn-delete"
                                                             onClick={(e) => {
                                                                 e.stopPropagation();
                                                                 handleDelete(p.id, p.orderNumber);
                                                             }}
                                                             title="Xóa đơn nhập"
                                                         >
                                                             <MdDelete />
                                                         </button>
                                                     </div>
                                                 </td>
                                             </tr>
                                         ))}
                                     </tbody>
                            </table>
                        )}
                    </div>

                    {/* Pagination - KiotViet style */}
                    <div className="purchase-pagination-v2">
                        <div className="pagination-left">
                            <span>Hiển thị</span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setPage(1); }}
                                className="items-per-page"
                            >
                                <option value={15}>15 dòng</option>
                                <option value={30}>30 dòng</option>
                                <option value={50}>50 dòng</option>
                            </select>
                        </div>
                        <div className="pagination-center">
                            <button
                                className="pagination-btn-v2"
                                onClick={() => setPage(1)}
                                disabled={page <= 1}
                            >
                                ⟨⟨
                            </button>
                            <button
                                className="pagination-btn-v2"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1}
                            >
                                ⟨
                            </button>
                            <span className="pagination-current">{page}</span>
                            <button
                                className="pagination-btn-v2"
                                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                                disabled={page >= meta.totalPages}
                            >
                                ⟩
                            </button>
                            <button
                                className="pagination-btn-v2"
                                onClick={() => setPage(meta.totalPages)}
                                disabled={page >= meta.totalPages}
                            >
                                ⟩⟩
                            </button>
                        </div>
                        <div className="pagination-right">
                            {((page - 1) * itemsPerPage) + 1} - {Math.min(page * itemsPerPage, meta.total)} trong {meta.total} giao dịch
                        </div>
                    </div>
                </div>
            </div>

            {/* Full-page Create/Edit Purchase Form */}
            {isModalOpen && (
                <div className="purchase-create-page">
                    {/* Header */}
                    <div className="create-header">
                        <div className="create-header-left">
                            <button className="btn-back" onClick={closeModal}>
                                ←
                            </button>
                            <h2>Nhập hàng</h2>
                        </div>
                        <div className="create-header-center">
                            <div className="product-search-box">
                                <MdSearch className="search-icon" />
                                <input
                                    type="text"
                                    value={productSearchQuery}
                                    onChange={(e) => setProductSearchQuery(e.target.value)}
                                    placeholder="Tìm hàng hóa theo mã hoặc tên (F3)"
                                    className="product-search-input"
                                />
                            </div>
                            <button className="btn-barcode" title="Quét mã vạch">
                                <MdQrCodeScanner />
                            </button>
                            <button
                                type="button"
                                className="btn-add-product-header"
                                onClick={openQuickProductModal}
                                title="Thêm hàng hóa mới"
                            >
                                +
                            </button>
                        </div>
                        <div className="create-header-right">
                            <input
                                type="datetime-local"
                                className="purchase-date-picker"
                                value={formData.purchaseDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, purchaseDate: e.target.value }))}
                            />
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="create-content">
                        {/* Left: Product Table */}
                        <div className="create-left">
                            <table className="create-product-table">
                                <thead>
                                    <tr>
                                        <th className="col-stt">STT</th>
                                        <th className="col-code">Mã hàng</th>
                                        <th className="col-name">Tên hàng</th>
                                        <th className="col-unit">ĐVT</th>
                                        <th className="col-qty">Số lượng</th>
                                        <th className="col-price">Đơn giá</th>
                                        <th className="col-discount">Giảm giá</th>
                                        <th className="col-total">Thành tiền</th>
                                        <th className="col-action"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, idx) => {
                                        const product = products.find(p => p.id === item.productId);
                                        const lineTotal = item.quantity * item.unitCost;
                                        return (
                                            <tr key={idx}>
                                                <td className="col-stt">{idx + 1}</td>
                                                <td className="col-code">{product?.sku || '-'}</td>
                                                <td className="col-name">
                                                    <div className="product-autocomplete">
                                                        <input
                                                            id={`product-search-${idx}`}
                                                            type="text"
                                                            value={item.productSearch || (product ? product.name : '')}
                                                            onChange={(e) => {
                                                                updateItem(idx, 'productSearch', e.target.value);
                                                                if (item.productId) {
                                                                    updateItem(idx, 'productId', '');
                                                                }
                                                            }}
                                                            placeholder="Gõ tên SP..."
                                                            className="inline-input product-code-input"
                                                        />
                                                        {item.productSearch && !item.productId && (
                                                            <div className="product-dropdown-list">
                                                                {products
                                                                    .filter(p => {
                                                                        const search = removeAccents(item.productSearch);
                                                                        const name = removeAccents(p.name || '');
                                                                        const sku = removeAccents(p.sku || '');
                                                                        const barcode = removeAccents((p as any).barcode || '');
                                                                        return (
                                                                            !search ||
                                                                            name.includes(search) ||
                                                                            sku.includes(search) ||
                                                                            barcode.includes(search)
                                                                        );
                                                                    })
                                                                    .map((p) => (
                                                                        <div
                                                                            key={p.id}
                                                                            className="product-dropdown-item"
                                                                            onClick={() => {
                                                                                updateItem(idx, 'productId', p.id);
                                                                                updateItem(idx, 'productSearch', '');
                                                                                if (p.unit) {
                                                                                    updateItem(idx, 'unit', p.unit);
                                                                                }

                                                                                // Auto-add new row if this is the last row
                                                                                if (idx === items.length - 1) {
                                                                                    setItems(prev => [
                                                                                        ...prev,
                                                                                        { productId: '', productSearch: '', quantity: 1, unitCost: Number(p.defaultCost) || 0, unit: p.unit || 'Cái' }
                                                                                    ]);
                                                                                }

                                                                                // Focus next input
                                                                                setTimeout(() => {
                                                                                    const nextInput = document.getElementById(`product-search-${idx + 1}`);
                                                                                    if (nextInput) {
                                                                                        nextInput.focus();
                                                                                    }
                                                                                }, 50);
                                                                            }}
                                                                        >
                                                                            <span className="product-sku">{p.name}</span>
                                                                            <span className="product-name-hint">{p.sku || ''}</span>
                                                                        </div>
                                                                    ))
                                                                }
                                                                {products.filter(p =>
                                                                    (p.name && p.name.toLowerCase().includes(item.productSearch.toLowerCase())) ||
                                                                    (p.sku && p.sku.toLowerCase().includes(item.productSearch.toLowerCase()))
                                                                ).length === 0 && (
                                                                        <div className="product-dropdown-empty">Không tìm thấy sản phẩm</div>
                                                                    )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="col-unit">
                                                    <input
                                                        type="text"
                                                        value={item.unit}
                                                        onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                                                        className="inline-input unit-input text-center"
                                                        placeholder="ĐVT"
                                                    />
                                                </td>
                                                <td className="col-qty">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity}
                                                        onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                                                        className="inline-input qty-input"
                                                    />
                                                </td>
                                                <td className="col-price">
                                                    <CurrencyInput
                                                        value={item.unitCost}
                                                        onChange={(val) => updateItem(idx, 'unitCost', val)}
                                                        className="inline-input price-input"
                                                    />
                                                </td>
                                                <td className="col-discount">0</td>
                                                <td className="col-total">{formatCurrency(lineTotal)}</td>
                                                <td className="col-action">
                                                    {items.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeItem(idx)}
                                                            className="btn-remove-row"
                                                        >
                                                            ×
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            <button
                                type="button"
                                className="btn-add-row-below"
                                onClick={addItem}
                                title="Thêm dòng mới"
                            >
                                <MdAdd /> Thêm dòng
                            </button>

                            {items.length === 1 && !items[0].productId && (
                                <div className="empty-products">
                                    <h3>Thêm sản phẩm từ file excel</h3>
                                    <p>(Tải về file mẫu: <a href="#">Excel file</a>)</p>
                                    <button className="btn-import-excel">
                                        <MdUploadFile /> Chọn file dữ liệu
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Right: Info Sidebar */}
                        <div className="create-right">
                            <div className="info-section">
                                <div className="store-search">
                                    <select
                                        className="store-select"
                                        value={selectedStoreId}
                                        onChange={(e) => setSelectedStoreId(e.target.value)}
                                    >
                                        {stores.map((s) => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        className="btn-add-store-form"
                                        onClick={openQuickStoreModal}
                                        title="Thêm công ty/cửa hàng mới"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            <div className="info-section compact">
                                <div className="supplier-search-compact">
                                    <div className="supplier-search-wrapper">
                                        <input
                                            type="text"
                                            value={supplierSearch}
                                            onChange={(e) => {
                                                setSupplierSearch(e.target.value);
                                                setShowSupplierDropdown(true);
                                                // Clear selected if typing
                                                if (formData.supplierId) {
                                                    const selected = suppliers.find(s => s.id === formData.supplierId);
                                                    if (selected && e.target.value !== selected.name) {
                                                        setFormData(prev => ({ ...prev, supplierId: '' }));
                                                    }
                                                }
                                            }}
                                            onFocus={() => setShowSupplierDropdown(true)}
                                            onBlur={() => setTimeout(() => setShowSupplierDropdown(false), 200)}
                                            placeholder="Tìm NCC (gõ tên hoặc mã)"
                                            className="supplier-search-input"
                                        />
                                        {showSupplierDropdown && filteredSuppliers.length > 0 && !formData.supplierId && (
                                            <div className="supplier-dropdown-list">
                                                {filteredSuppliers.slice(0, 10).map((s) => (
                                                    <div
                                                        key={s.id}
                                                        className="supplier-dropdown-item"
                                                        onClick={() => {
                                                            handleSelectSupplier(s.id);
                                                            setShowSupplierDropdown(false);
                                                        }}
                                                    >
                                                        <span className="supplier-name">{s.name}</span>
                                                        {s.code && <span className="supplier-code">{s.code}</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        className="btn-add-supplier-sm"
                                        onClick={openQuickSupplierModal}
                                        title="Thêm nhà cung cấp mới"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            {/* Người nhập section */}
                            <div className="info-section compact">
                                <div className="importer-search-compact-form">
                                    <div className="importer-search-wrapper-form">
                                        <input
                                            type="text"
                                            value={importerSearch}
                                            onChange={(e) => {
                                                setImporterSearch(e.target.value);
                                                if (selectedImporterId) {
                                                    const selected = importers.find(i => i.id === selectedImporterId);
                                                    if (selected && e.target.value !== selected.fullName) {
                                                        setSelectedImporterId('');
                                                    }
                                                }
                                            }}
                                            placeholder="Người nhập"
                                            className="importer-input-form"
                                        />
                                        {importerSearch && filteredImporters.length > 0 && !selectedImporterId && (
                                            <div className="importer-dropdown-list-form">
                                                {filteredImporters.slice(0, 6).map((i) => (
                                                    <div
                                                        key={i.id}
                                                        className="importer-dropdown-item-form"
                                                        onClick={() => handleSelectImporter(i.id)}
                                                    >
                                                        <span className="importer-name">{i.fullName}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        className="btn-add-importer-form"
                                        onClick={openQuickImporterModal}
                                        title="Thêm người nhập mới"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            <div className="info-row">
                                <span className="info-label">Mã phiếu nhập</span>
                                <span className={`info-value ${items.some(i => i.productId) ? 'code-active' : 'muted'}`}>
                                    {items.some(i => i.productId)
                                        ? `PN${new Date().toISOString().slice(0, 10).replace(/-/g, '')}0001`
                                        : 'Mã phiếu tự động'}
                                </span>
                            </div>

                            <div className="info-row">
                                <span className="info-label">Mã đặt hàng nhập</span>
                                <span className="info-value"></span>
                            </div>

                            <div className="info-row">
                                <span className="info-label">Trạng thái</span>
                                <span className="info-value">Đã nhập hàng</span>
                            </div>

                            <div className="info-row">
                                <span className="info-label">Tổng tiền hàng</span>
                                <input type="text" value="0" readOnly className="info-input" />
                                <span className="info-amount">{formatCurrency(totalAmount)}</span>
                            </div>

                            <div className="info-row">
                                <span className="info-label">Giảm giá</span>
                                <input type="text" value="0" className="info-input discount-input" />
                            </div>

                            <div className="info-row highlight">
                                <span className="info-label">Cần trả nhà cung cấp</span>
                                <span className="info-amount total-pay">{formatCurrency(totalAmount)}</span>
                            </div>

                            {/* Prepayment Section */}
                            <div className="prepayment-section" style={{ marginTop: '16px', padding: '12px', background: '#f8f9fa', borderRadius: '8px' }}>
                                <div className="info-row" style={{ marginBottom: '10px' }}>
                                    <span className="info-label" style={{ fontWeight: 600 }}><MdPayments style={{ verticalAlign: 'middle', marginRight: 4 }} /> Thanh toán trước</span>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Số tiền thanh toán</label>
                                        <CurrencyInput
                                            value={formData.prepaymentAmount}
                                            onChange={(val) => setFormData({ ...formData, prepaymentAmount: val })}
                                            placeholder="0"
                                            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Phương thức</label>
                                        <select
                                            value={formData.paymentMethod}
                                            onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                                            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                                        >
                                            <option value="CASH">Tiền mặt</option>
                                            <option value="TRANSFER">Chuyển khoản</option>
                                            <option value="CARD">Thẻ</option>
                                        </select>
                                    </div>
                                </div>
                                {formData.prepaymentAmount > 0 && (
                                    <div style={{ marginTop: '8px', fontSize: '13px', color: formData.prepaymentAmount >= totalAmount ? '#28a745' : '#856404', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        {formData.prepaymentAmount >= totalAmount
                                            ? <><MdCheckCircle /> Thanh toán đủ - Trạng thái: Đã thanh toán</>
                                            : <><MdSchedule /> Còn nợ: {formatCurrency(totalAmount - formData.prepaymentAmount)}</>
                                        }
                                    </div>
                                )}
                            </div>

                            <div className="note-section">
                                <textarea
                                    value={formData.note}
                                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                                    placeholder="Ghi chú"
                                    className="note-textarea"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="create-footer">
                        <button
                            type="button"
                            onClick={() => { handleSubmit(new Event('submit') as any); }}
                            className="btn-complete"
                            disabled={submitting}
                        >
                            <MdCheck /> Hoàn thành
                        </button>
                    </div>
                </div>
            )}

            {/* Detail Modal - Improved Layout */}
            <Modal
                isOpen={isDetailOpen}
                onClose={closeDetailModal}
                title={`Chi tiết đơn nhập hàng`}
            >
                {selectedPurchase && (
                    <div className="purchase-detail-v2">
                        {/* Header Info */}
                        <div className="detail-info-grid">
                            <div className="detail-info-card">
                                <div className="info-label">Mã đơn</div>
                                <div className="info-value order-code">{selectedPurchase.orderNumber}</div>
                            </div>
                            <div className="detail-info-card">
                                <div className="info-label">Trạng thái</div>
                                <div className="info-value">
                                    <span className={`purchase-status ${selectedPurchase.status}`}>
                                        {STATUS_LABELS[selectedPurchase.status]}
                                    </span>
                                </div>
                            </div>
                            <div className="detail-info-card">
                                <div className="info-label">Nhà cung cấp</div>
                                <div className="info-value supplier-name">{selectedPurchase.supplier?.name}</div>
                            </div>
                            <div className="detail-info-card">
                                <div className="info-label">Kho nhập</div>
                                <div className="info-value">{selectedPurchase.warehouse?.name || 'Tự động'}</div>
                            </div>
                            <div className="detail-info-card">
                                <div className="info-label">Ngày tạo</div>
                                <div className="info-value">{formatDate(selectedPurchase.createdAt)}</div>
                            </div>
                            {selectedPurchase.confirmedAt && (
                                <div className="detail-info-card">
                                    <div className="info-label">Ngày nhập kho</div>
                                    <div className="info-value confirmed">{formatDate(selectedPurchase.confirmedAt)}</div>
                                </div>
                            )}
                        </div>

                        {selectedPurchase.note && (
                            <div className="detail-note">
                                <strong>Ghi chú:</strong> {selectedPurchase.note}
                            </div>
                        )}

                        {/* Items Table */}
                        <div className="detail-items-section">
                            <h4><MdInventory2 /> Danh sách sản phẩm ({selectedPurchase.purchaseItems.length})</h4>
                            <div className="detail-table-wrapper">
                                <table className="detail-items-table-v2">
                                    <thead>
                                        <tr>
                                            <th className="col-index">#</th>
                                            <th className="col-product">Sản phẩm</th>
                                            <th className="col-unit">ĐVT</th>
                                            <th className="col-qty">SL</th>
                                            <th className="col-price">Đơn giá</th>
                                            <th className="col-total">Thành tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedPurchase.purchaseItems.map((item, idx) => (
                                            <tr key={item.id}>
                                                <td className="col-index">{idx + 1}</td>
                                                <td className="col-product">
                                                    <div className="product-name">{item.variant?.product?.name}</div>
                                                    {item.variant?.product?.sku && (
                                                        <div className="product-sku">SKU: {item.variant.product.sku}</div>
                                                    )}
                                                </td>
                                                <td className="col-unit">{item.unit || item.variant?.product?.unit || 'Cái'}</td>
                                                <td className="col-qty">{item.quantity}</td>
                                                <td className="col-price">{formatCurrency(Number(item.unitCost))}đ</td>
                                                <td className="col-total">{formatCurrency(Number(item.totalCost))}đ</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="detail-grand-total">
                                <span className="total-label">Tổng cộng:</span>
                                <span className="total-amount">{formatCurrency(Number(selectedPurchase.totalAmount))}đ</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="detail-actions-v2">
                            <button onClick={closeDetailModal} className="btn btn-secondary">
                                Đóng
                            </button>
                            {selectedPurchase.status !== 'CANCELLED' && (
                                <button
                                    onClick={() => {
                                        closeDetailModal();
                                        openEditModal(selectedPurchase);
                                    }}
                                    className="btn btn-warning"
                                >
                                    <MdEdit /> Sửa đơn
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    handleDelete(selectedPurchase.id, selectedPurchase.orderNumber);
                                    closeDetailModal();
                                }}
                                className="btn btn-danger"
                            >
                                <MdDelete /> Xóa đơn
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Export Modal */}
            <Modal
                isOpen={isExportOpen}
                onClose={closeExportModal}
                title="Xuất Excel đơn nhập hàng"
            >
                <div className="export-modal">
                    <p className="export-description">
                        Chọn khoảng thời gian và trạng thái để xuất dữ liệu
                    </p>

                    <div className="export-filters">
                        <div className="export-row">
                            <label>Từ ngày:</label>
                            <input
                                type="date"
                                value={exportFromDate}
                                onChange={(e) => setExportFromDate(e.target.value)}
                                className="export-date-input"
                            />
                        </div>
                        <div className="export-row">
                            <label>Đến ngày:</label>
                            <input
                                type="date"
                                value={exportToDate}
                                onChange={(e) => setExportToDate(e.target.value)}
                                className="export-date-input"
                            />
                        </div>
                        <div className="export-row">
                            <label>Trạng thái:</label>
                            <select
                                value={exportStatus}
                                onChange={(e) => setExportStatus(e.target.value)}
                                className="export-select"
                            >
                                <option value="">Tất cả</option>
                                <option value="PENDING">Chờ xác nhận</option>
                                <option value="CONFIRMED">Đã nhập kho</option>
                                <option value="CANCELLED">Đã hủy</option>
                            </select>
                        </div>
                    </div>

                    <div className="export-actions">
                        <button onClick={closeExportModal} className="btn btn-secondary">
                            Hủy
                        </button>
                        <button
                            onClick={doExport}
                            className="btn btn-primary"
                            disabled={exporting}
                        >
                            {exporting ? 'Đang xuất...' : <><MdFileDownload /> Xuất Excel</>}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Quick Add Supplier Modal */}
            <Modal
                isOpen={isQuickSupplierOpen}
                onClose={closeQuickSupplierModal}
                title="Tạo nhà cung cấp"
            >
                <div className="quick-supplier-form">
                    {/* Basic Info Row */}
                    <div className="form-row two-col">
                        <div className="form-group">
                            <label>Tên nhà cung cấp <span className="required">*</span></label>
                            <input
                                type="text"
                                value={quickSupplierData.name}
                                onChange={(e) => setQuickSupplierData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Bắt buộc"
                                className="form-input required-input"
                            />
                        </div>
                        <div className="form-group">
                            <label>Mã nhà cung cấp</label>
                            <input
                                type="text"
                                value={quickSupplierData.code}
                                onChange={(e) => setQuickSupplierData(prev => ({ ...prev, code: e.target.value }))}
                                placeholder="Tự động"
                                className="form-input"
                            />
                        </div>
                    </div>

                    <div className="form-row two-col">
                        <div className="form-group">
                            <label>Điện thoại</label>
                            <input
                                type="text"
                                value={quickSupplierData.phone}
                                onChange={(e) => setQuickSupplierData(prev => ({ ...prev, phone: e.target.value }))}
                                className="form-input"
                            />
                        </div>
                        <div className="form-group">
                            <label>Email</label>
                            <input
                                type="email"
                                value={quickSupplierData.email}
                                onChange={(e) => setQuickSupplierData(prev => ({ ...prev, email: e.target.value }))}
                                placeholder="email@gmail.com"
                                className="form-input"
                            />
                        </div>
                    </div>

                    {/* Địa chỉ Section */}
                    <div className="form-section">
                        <div className="section-header">
                            <span>Địa chỉ</span>
                            <span className="section-toggle">▲</span>
                        </div>
                        <div className="section-content">
                            <div className="form-group">
                                <label>Địa chỉ</label>
                                <input
                                    type="text"
                                    value={quickSupplierData.address}
                                    onChange={(e) => setQuickSupplierData(prev => ({ ...prev, address: e.target.value }))}
                                    placeholder="Nhập địa chỉ"
                                    className="form-input"
                                />
                            </div>
                            <div className="form-row two-col">
                                <div className="form-group">
                                    <label>Khu vực</label>
                                    <input
                                        type="text"
                                        value={quickSupplierData.area}
                                        onChange={(e) => setQuickSupplierData(prev => ({ ...prev, area: e.target.value }))}
                                        placeholder="Chọn Tỉnh/Thành phố"
                                        className="form-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Phường/Xã</label>
                                    <input
                                        type="text"
                                        value={quickSupplierData.ward}
                                        onChange={(e) => setQuickSupplierData(prev => ({ ...prev, ward: e.target.value }))}
                                        placeholder="Chọn Phường/Xã"
                                        className="form-input"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Nhóm NCC Section */}
                    <div className="form-section">
                        <div className="section-header">
                            <span>Nhóm nhà cung cấp, ghi chú</span>
                            <span className="section-toggle">▲</span>
                        </div>
                        <div className="section-content">
                            <div className="form-group">
                                <label>Nhóm nhà cung cấp</label>
                                <input
                                    type="text"
                                    value={quickSupplierData.supplierGroup}
                                    onChange={(e) => setQuickSupplierData(prev => ({ ...prev, supplierGroup: e.target.value }))}
                                    placeholder="Chọn nhóm nhà cung cấp"
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label>Ghi chú</label>
                                <textarea
                                    value={quickSupplierData.notes}
                                    onChange={(e) => setQuickSupplierData(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Nhập ghi chú"
                                    className="form-textarea"
                                    rows={3}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Thông tin xuất hóa đơn Section */}
                    <div className="form-section">
                        <div className="section-header">
                            <span>Thông tin xuất hóa đơn</span>
                            <span className="section-toggle">▲</span>
                        </div>
                        <div className="section-content">
                            <div className="form-row two-col">
                                <div className="form-group">
                                    <label>Tên công ty</label>
                                    <input
                                        type="text"
                                        value={quickSupplierData.company}
                                        onChange={(e) => setQuickSupplierData(prev => ({ ...prev, company: e.target.value }))}
                                        placeholder="Nhập tên công ty"
                                        className="form-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Mã số thuế</label>
                                    <input
                                        type="text"
                                        value={quickSupplierData.taxNumber}
                                        onChange={(e) => setQuickSupplierData(prev => ({ ...prev, taxNumber: e.target.value }))}
                                        placeholder="Nhập mã số thuế"
                                        className="form-input"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="form-actions">
                        <button
                            type="button"
                            onClick={closeQuickSupplierModal}
                            className="btn btn-secondary"
                        >
                            Bỏ qua
                        </button>
                        <button
                            type="button"
                            onClick={handleQuickSaveSupplier}
                            className="btn btn-primary"
                            disabled={savingSupplier}
                        >
                            {savingSupplier ? 'Đang lưu...' : 'Lưu'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Quick Add Importer Modal */}
            <Modal
                isOpen={isQuickImporterOpen}
                onClose={closeQuickImporterModal}
                title="Thêm người nhập"
            >
                <div className="quick-importer-form">
                    {/* Basic Info */}
                    <div className="form-row two-col">
                        <div className="form-group">
                            <label>Họ và tên <span className="required">*</span></label>
                            <input
                                type="text"
                                value={quickImporterData.fullName}
                                onChange={(e) => setQuickImporterData(prev => ({ ...prev, fullName: e.target.value }))}
                                placeholder="Nhập họ tên"
                                className="form-input required-input"
                            />
                        </div>
                        <div className="form-group">
                            <label>Tên đăng nhập</label>
                            <input
                                type="text"
                                value={quickImporterData.username}
                                onChange={(e) => setQuickImporterData(prev => ({ ...prev, username: e.target.value }))}
                                placeholder="Tự động tạo"
                                className="form-input"
                            />
                        </div>
                    </div>

                    <div className="form-row two-col">
                        <div className="form-group">
                            <label>Điện thoại</label>
                            <input
                                type="text"
                                value={quickImporterData.phone}
                                onChange={(e) => setQuickImporterData(prev => ({ ...prev, phone: e.target.value }))}
                                placeholder="Nhập số điện thoại"
                                className="form-input"
                            />
                        </div>
                        <div className="form-group">
                            <label>Email</label>
                            <input
                                type="email"
                                value={quickImporterData.email}
                                onChange={(e) => setQuickImporterData(prev => ({ ...prev, email: e.target.value }))}
                                placeholder="Nhập email"
                                className="form-input"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="form-actions">
                        <button
                            type="button"
                            onClick={closeQuickImporterModal}
                            className="btn btn-secondary"
                        >
                            Bỏ qua
                        </button>
                        <button
                            type="button"
                            onClick={handleQuickSaveImporter}
                            className="btn btn-primary"
                            disabled={savingImporter}
                        >
                            {savingImporter ? 'Đang lưu...' : 'Lưu'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Quick Add Store/Company Modal */}
            <Modal
                isOpen={isQuickStoreOpen}
                onClose={closeQuickStoreModal}
                title="Thêm công ty/cửa hàng"
            >
                <div className="quick-store-form">
                    {/* Basic Info */}
                    <div className="form-row two-col">
                        <div className="form-group">
                            <label>Tên công ty/cửa hàng <span className="required">*</span></label>
                            <input
                                type="text"
                                value={quickStoreData.name}
                                onChange={(e) => setQuickStoreData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Nhập tên"
                                className="form-input required-input"
                            />
                        </div>
                        <div className="form-group">
                            <label>Mã viết tắt</label>
                            <input
                                type="text"
                                value={quickStoreData.code}
                                onChange={(e) => setQuickStoreData(prev => ({ ...prev, code: e.target.value }))}
                                placeholder="Tự động tạo"
                                className="form-input"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Địa chỉ</label>
                        <input
                            type="text"
                            value={quickStoreData.address}
                            onChange={(e) => setQuickStoreData(prev => ({ ...prev, address: e.target.value }))}
                            placeholder="Nhập địa chỉ"
                            className="form-input"
                        />
                    </div>

                    <div className="form-row two-col">
                        <div className="form-group">
                            <label>Điện thoại</label>
                            <input
                                type="text"
                                value={quickStoreData.phone}
                                onChange={(e) => setQuickStoreData(prev => ({ ...prev, phone: e.target.value }))}
                                placeholder="Nhập số điện thoại"
                                className="form-input"
                            />
                        </div>
                        <div className="form-group">
                            <label>Email</label>
                            <input
                                type="email"
                                value={quickStoreData.email}
                                onChange={(e) => setQuickStoreData(prev => ({ ...prev, email: e.target.value }))}
                                placeholder="Nhập email"
                                className="form-input"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="form-actions">
                        <button
                            type="button"
                            onClick={closeQuickStoreModal}
                            className="btn btn-secondary"
                        >
                            Bỏ qua
                        </button>
                        <button
                            type="button"
                            onClick={handleQuickSaveStore}
                            className="btn btn-primary"
                            disabled={savingStore}
                        >
                            {savingStore ? 'Đang lưu...' : 'Lưu'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Quick Add Product Modal */}
            <Modal
                isOpen={isQuickProductOpen}
                onClose={closeQuickProductModal}
                title="Tạo hàng hóa"
                size="lg"
            >
                <div className="quick-product-modal">
                    {/* Tabs */}
                    <div className="product-tabs">
                        <button
                            type="button"
                            className={`product-tab ${productTab === 'info' ? 'active' : ''}`}
                            onClick={() => setProductTab('info')}
                        >
                            Thông tin
                        </button>
                        <button
                            type="button"
                            className={`product-tab ${productTab === 'description' ? 'active' : ''}`}
                            onClick={() => setProductTab('description')}
                        >
                            Mô tả
                        </button>
                    </div>

                    {/* Tab Content */}
                    {productTab === 'info' && (
                        <div className="product-tab-content">
                            {/* Row 1: SKU and Barcode */}
                            <div className="form-row two-col">
                                <div className="form-group">
                                    <input
                                        type="text"
                                        value={quickProductData.sku}
                                        onChange={(e) => setQuickProductData(prev => ({ ...prev, sku: e.target.value }))}
                                        placeholder="Tự động"
                                        className="form-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <input
                                        type="text"
                                        value={quickProductData.barcode}
                                        onChange={(e) => setQuickProductData(prev => ({ ...prev, barcode: e.target.value }))}
                                        placeholder="Nhập mã vạch"
                                        className="form-input"
                                    />
                                </div>
                            </div>

                            {/* Row 2: Name */}
                            <div className="form-group">
                                <label>Tên hàng</label>
                                <input
                                    type="text"
                                    value={quickProductData.name}
                                    onChange={(e) => {
                                        const newName = e.target.value;
                                        setQuickProductData(prev => ({
                                            ...prev,
                                            name: newName,
                                            // Auto-gen SKU if sku is empty or was auto-generated
                                            sku: !prev.sku || prev.sku.match(/^[A-Z]{2,6}\d{3}$/) ? generateSKU(newName) : prev.sku
                                        }));
                                    }}
                                    placeholder="Bắt buộc"
                                    className="form-input required-input"
                                />
                            </div>

                            {/* Row 3: Category and Brand */}
                            <div className="form-row two-col">
                                <div className="form-group">
                                    <div className="label-row">
                                        <label>Nhóm hàng</label>
                                        <span className="link-text">Tạo mới</span>
                                    </div>
                                    <select
                                        value={quickProductData.categoryId}
                                        onChange={(e) => setQuickProductData(prev => ({ ...prev, categoryId: e.target.value }))}
                                        className="form-input"
                                    >
                                        <option value="">Chọn nhóm hàng (Bắt buộc)</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <div className="label-row">
                                        <label>Thương hiệu</label>
                                        <span className="link-text">Tạo mới</span>
                                    </div>
                                    <select
                                        value={quickProductData.brandId}
                                        onChange={(e) => setQuickProductData(prev => ({ ...prev, brandId: e.target.value }))}
                                        className="form-input"
                                    >
                                        <option value="">Chọn thương hiệu</option>
                                        <option value="thienlong">Thiên Long</option>
                                        <option value="hct">HCT</option>
                                    </select>
                                </div>
                            </div>

                            {/* Section: Giá bán */}
                            <div className="product-section">
                                <div className="section-header">
                                    <h4>Giá bán</h4>
                                </div>
                                <div className="form-row two-col">
                                    <div className="form-group">
                                        <div className="label-row">
                                            <label>Giá bán</label>
                                            <span
                                                className="link-text"
                                                onClick={() => setIsPriceListPopupOpen(true)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                👁 Thiết lập giá
                                            </span>
                                        </div>
                                        <input
                                            type="number"
                                            value={quickProductData.price}
                                            onChange={(e) => setQuickProductData(prev => ({ ...prev, price: Number(e.target.value) }))}
                                            className="form-input"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Giá vốn</label>
                                        <input
                                            type="number"
                                            value={quickProductData.costPrice}
                                            onChange={(e) => setQuickProductData(prev => ({ ...prev, costPrice: Number(e.target.value) }))}
                                            className="form-input"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section: Tồn kho */}
                            <div className="product-section">
                                <div className="section-header">
                                    <h4>Tồn kho</h4>
                                </div>
                                <p className="section-desc">Quản lý số lượng tồn kho và định mức tồn. Khi tồn kho chạm đến định mức, bạn sẽ nhận được cảnh báo từ KiotViet.</p>
                                <div className="form-row two-col">
                                    <div className="form-group">
                                        <label>Định mức tồn thấp nhất</label>
                                        <input
                                            type="number"
                                            value={quickProductData.minStock}
                                            onChange={(e) => setQuickProductData(prev => ({ ...prev, minStock: Number(e.target.value) }))}
                                            className="form-input"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Định mức tồn cao nhất</label>
                                        <input
                                            type="number"
                                            value={quickProductData.maxStock}
                                            onChange={(e) => setQuickProductData(prev => ({ ...prev, maxStock: Number(e.target.value) }))}
                                            className="form-input"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section: Vị trí, trọng lượng */}
                            <div className="product-section">
                                <div className="section-header">
                                    <h4>Vị trí, trọng lượng</h4>
                                </div>
                                <p className="section-desc">Quản lý việc sắp xếp kho, vị trí bán hàng hoặc trọng lượng hàng hóa</p>
                                <div className="form-row two-col">
                                    <div className="form-group">
                                        <div className="label-row">
                                            <label>Vị trí</label>
                                            <span className="link-text">Tạo mới</span>
                                        </div>
                                        <input
                                            type="text"
                                            value={quickProductData.location}
                                            onChange={(e) => setQuickProductData(prev => ({ ...prev, location: e.target.value }))}
                                            placeholder="Chọn vị trí"
                                            className="form-input"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Trọng lượng</label>
                                        <div className="input-with-suffix">
                                            <input
                                                type="number"
                                                value={quickProductData.weight}
                                                onChange={(e) => setQuickProductData(prev => ({ ...prev, weight: Number(e.target.value) }))}
                                                className="form-input"
                                            />
                                            <span className="input-suffix">g</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {productTab === 'description' && (
                        <div className="product-tab-content">
                            <div className="form-group">
                                <label>Mô tả</label>
                                <textarea
                                    value={quickProductData.description}
                                    onChange={(e) => setQuickProductData(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Nhập mô tả sản phẩm..."
                                    className="form-textarea"
                                    rows={4}
                                />
                            </div>
                            <div className="form-group">
                                <label>Mẫu ghi chú (hóa đơn, đặt hàng)</label>
                                <textarea
                                    value={quickProductData.notes}
                                    onChange={(e) => setQuickProductData(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Nhập mẫu ghi chú..."
                                    className="form-textarea"
                                    rows={4}
                                />
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="product-modal-footer">
                        <div className="footer-left">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={quickProductData.sellDirectly}
                                    onChange={(e) => setQuickProductData(prev => ({ ...prev, sellDirectly: e.target.checked }))}
                                />
                                <span>Bán trực tiếp</span>
                            </label>
                        </div>
                        <div className="footer-right">
                            <button
                                type="button"
                                onClick={closeQuickProductModal}
                                className="btn btn-secondary"
                            >
                                Bỏ qua
                            </button>
                            <button
                                type="button"
                                onClick={handleQuickSaveProduct}
                                className="btn btn-primary"
                                disabled={savingProduct}
                            >
                                {savingProduct ? 'Đang lưu...' : 'Lưu'}
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Price List Popup */}
            {isPriceListPopupOpen && (
                <div className="price-list-popup-overlay" onClick={() => setIsPriceListPopupOpen(false)}>
                    <div className="price-list-popup" onClick={(e) => e.stopPropagation()}>
                        <div className="price-list-popup-header">
                            <div>
                                <h3>Chọn bảng giá</h3>
                                <p className="popup-subtitle">Có {priceLists.length} bảng giá đang hoạt động</p>
                            </div>
                            <button
                                className="popup-close-btn"
                                onClick={() => setIsPriceListPopupOpen(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="price-list-popup-body">
                            <table className="price-list-table">
                                <thead>
                                    <tr>
                                        <th>Tên bảng giá</th>
                                        <th style={{ width: '150px' }}>Giá bán</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {priceLists.map((pl) => (
                                        <tr key={pl.id}>
                                            <td>{pl.name}</td>
                                            <td>
                                                <input
                                                    type="number"
                                                    value={priceListPrices[pl.id] || ''}
                                                    onChange={(e) => setPriceListPrices(prev => ({
                                                        ...prev,
                                                        [pl.id]: Number(e.target.value)
                                                    }))}
                                                    className="price-input-field"
                                                    placeholder="0"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="price-list-popup-footer">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setIsPriceListPopupOpen(false)}
                            >
                                Bỏ qua
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={() => {
                                    // Apply first price list price - as main price
                                    const firstPriceListPrice = Object.values(priceListPrices)[0];
                                    if (firstPriceListPrice) {
                                        setQuickProductData(prev => ({ ...prev, price: firstPriceListPrice }));
                                    }
                                    setIsPriceListPopupOpen(false);
                                }}
                            >
                                Xong
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
