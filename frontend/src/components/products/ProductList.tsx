import { useState, useEffect, useCallback, useRef } from 'react';
import { productsAPI, categoriesAPI, suppliersAPI } from '../../services/api';
import Modal from '../shared/Modal';
import { Toast, useToast } from '../shared/Toast';
import Pagination from '../shared/Pagination';
import ProductForm from './ProductForm';
import { MdSearch, MdEdit, MdDelete, MdStarBorder, MdFileUpload, MdFileDownload, MdAdd, MdSettings, MdViewColumn, MdRefresh, MdExpandMore, MdInventory, MdMoreHoriz, MdHelpOutline } from 'react-icons/md';
import * as XLSX from 'xlsx';
import './ProductList.css';

interface Product {
    id: string;
    name: string;
    sku?: string;
    barcode?: string;
    categoryId?: string;
    category?: { id: string; name: string };
    defaultPrice: number;
    defaultCost?: number;
    brand?: string;
    unit?: string;
    baseUnitCode?: string;
    conversionRate?: number;
    totalStock?: number;
    active?: boolean;
    directSale?: boolean;
    location?: string;
    productType?: string;
    createdAt?: string;
    images?: string;
}

interface Category {
    id: string;
    name: string;
    parentId?: string;
}

interface Supplier {
    id: string;
    name: string;
}

interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
}

export default function ProductList() {
    // Data state
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState<PaginationMeta>({
        page: 1,
        limit: 100,
        total: 0,
    });

    // Filter state
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [productTypeFilter, setProductTypeFilter] = useState('');
    const [brandFilter, setBrandFilter] = useState('');
    const [locationFilter, setLocationFilter] = useState('');
    const [supplierFilter, setSupplierFilter] = useState('');
    const [activeFilter, setActiveFilter] = useState<boolean | undefined>(true);
    const [directSaleFilter, setDirectSaleFilter] = useState<boolean | undefined>(undefined);
    const [stockFilter, setStockFilter] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // UI state
    const [showFilters, setShowFilters] = useState(true);
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

    // Modal state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Import/Export
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showExportMenu, setShowExportMenu] = useState(false);

    // Toast
    const toast = useToast();

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPagination((prev) => ({ ...prev, page: 1 }));
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Fetch data on mount
    useEffect(() => {
        fetchCategories();
        fetchSuppliers();
    }, []);

    // Fetch products when filters change
    useEffect(() => {
        fetchProducts();
    }, [debouncedSearch, categoryFilter, productTypeFilter, brandFilter, locationFilter, supplierFilter, activeFilter, directSaleFilter, stockFilter, pagination.page]);

    const fetchCategories = async () => {
        try {
            const response = await categoriesAPI.getAll();
            setCategories(response.data?.data || response.data || []);
        } catch (error) {
            console.error('Failed to fetch categories:', error);
        }
    };

    const fetchSuppliers = async () => {
        try {
            const response = await suppliersAPI.getAll({});
            setSuppliers(response.data?.data || response.data || []);
        } catch (error) {
            console.error('Failed to fetch suppliers:', error);
        }
    };

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const response = await productsAPI.getAll({
                page: pagination.page,
                limit: pagination.limit,
                search: debouncedSearch || undefined,
                categoryId: categoryFilter || undefined,
                productType: productTypeFilter || undefined,
                brand: brandFilter || undefined,
                location: locationFilter || undefined,
                supplierId: supplierFilter || undefined,
                active: activeFilter,
                directSale: directSaleFilter,
                stockFilter: stockFilter || undefined,
            });

            const data = response.data;
            setProducts(data.data || []);
            if (data.meta) {
                setPagination((prev) => ({
                    ...prev,
                    total: data.meta.total,
                }));
            }
        } catch (error) {
            console.error('Failed to fetch products:', error);
            toast.error('Không thể tải danh sách sản phẩm');
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, debouncedSearch, categoryFilter, productTypeFilter, brandFilter, locationFilter, supplierFilter, activeFilter, directSaleFilter, stockFilter]);

    const handleAdd = () => {
        setEditingProduct(null);
        setIsFormOpen(true);
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setIsFormOpen(true);
    };

    const handleDeleteClick = (product: Product) => {
        setDeletingProduct(product);
        setIsDeleteOpen(true);
    };

    const handleFormSubmit = async (formData: any) => {
        setIsSubmitting(true);
        try {
            if (editingProduct) {
                await productsAPI.update(editingProduct.id, formData);
                toast.success('Cập nhật sản phẩm thành công');
            } else {
                await productsAPI.create(formData);
                toast.success('Thêm sản phẩm thành công');
            }
            setIsFormOpen(false);
            fetchProducts();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deletingProduct) return;

        setIsSubmitting(true);
        try {
            await productsAPI.delete(deletingProduct.id);
            toast.success('Xóa sản phẩm thành công');
            setIsDeleteOpen(false);
            setDeletingProduct(null);
            fetchProducts();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Không thể xóa sản phẩm');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePageChange = (page: number) => {
        setPagination((prev) => ({ ...prev, page }));
    };

    // Import Excel
    const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            console.log('Raw Excel data:', rawData.slice(0, 5));

            // Find header row
            let headerRowIndex = -1;
            for (let i = 0; i < Math.min(10, rawData.length); i++) {
                const row = rawData[i];
                if (!row || row.length < 2) continue;
                const rowText = row.map(c => String(c || '').toLowerCase()).join(' ');
                if (rowText.includes('mã') && rowText.includes('tên')) {
                    headerRowIndex = i;
                    break;
                }
            }

            if (headerRowIndex === -1) {
                toast.error('Không tìm thấy dòng header. Cần có cột Mã hàng và Tên hàng');
                return;
            }

            const headers = rawData[headerRowIndex].map((h: any) => String(h || '').toLowerCase().trim());
            console.log('Headers:', headers);

            // Find column indices
            const findIdx = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h?.includes(k)));

            const skuIdx = findIdx(['mã hàng', 'mã sp', 'sku']);
            const nameIdx = findIdx(['tên hàng', 'tên sp', 'tên']);
            const barcodeIdx = findIdx(['mã vạch', 'barcode']);
            const brandIdx = findIdx(['thương hiệu', 'brand']);
            const priceIdx = findIdx(['giá bán', 'price']);
            const costIdx = findIdx(['giá vốn', 'cost']);
            const unitIdx = findIdx(['đvt', 'đơn vị']);
            const categoryIdx = findIdx(['nhóm hàng', 'danh mục', 'category']);
            const typeIdx = findIdx(['loại hàng', 'type']);
            const descIdx = findIdx(['mô tả', 'description']);
            const locationIdx = findIdx(['vị trí', 'location']);
            const stockIdx = findIdx(['tồn kho', 'số lượng tồn', 'tồn', 'stock']);

            // Skip sub-header if exists
            let dataStartIndex = headerRowIndex + 1;
            const nextRow = rawData[headerRowIndex + 1];
            if (nextRow) {
                const nextRowText = nextRow.map((c: any) => String(c || '').toLowerCase()).join(' ');
                if (nextRowText.includes('số lượng') || nextRowText.includes('giá trị')) {
                    dataStartIndex = headerRowIndex + 2;
                }
            }

            const dataRows = rawData.slice(dataStartIndex);

            const items = dataRows
                .filter((row: any[]) => row && row.length > 0)
                .map((row: any[]) => ({
                    sku: skuIdx >= 0 ? String(row[skuIdx] || '').trim() : '',
                    name: nameIdx >= 0 ? String(row[nameIdx] || '').trim() : '',
                    barcode: barcodeIdx >= 0 ? String(row[barcodeIdx] || '').trim() : undefined,
                    brand: brandIdx >= 0 ? String(row[brandIdx] || '').trim() : undefined,
                    price: priceIdx >= 0 ? parseFloat(row[priceIdx]) || 0 : 0,
                    cost: costIdx >= 0 ? parseFloat(row[costIdx]) || 0 : 0,
                    unit: unitIdx >= 0 ? String(row[unitIdx] || '').trim() : undefined,
                    categoryPath: categoryIdx >= 0 ? String(row[categoryIdx] || '').trim() : undefined,
                    productType: typeIdx >= 0 ? String(row[typeIdx] || '').trim() : 'GOODS',
                    description: descIdx >= 0 ? String(row[descIdx] || '').trim() : undefined,
                    location: locationIdx >= 0 ? String(row[locationIdx] || '').trim() : undefined,
                    stock: stockIdx >= 0 ? parseFloat(row[stockIdx]) || 0 : 0,
                }))
                .filter(item => item.sku || item.name);

            console.log('Parsed items:', items.slice(0, 5));
            console.log('Total items:', items.length);

            if (items.length === 0) {
                toast.error('File không có dữ liệu hợp lệ');
                return;
            }

            // Batch processing - 100 items per batch to avoid 500 error
            const BATCH_SIZE = 100;
            let totalCreated = 0;
            let totalUpdated = 0;
            let totalFailed = 0;

            toast.info(`Đang import ${items.length} sản phẩm...`);

            for (let i = 0; i < items.length; i += BATCH_SIZE) {
                const batch = items.slice(i, i + BATCH_SIZE);
                const batchNum = Math.floor(i / BATCH_SIZE) + 1;
                const totalBatches = Math.ceil(items.length / BATCH_SIZE);

                try {
                    console.log(`Processing batch ${batchNum}/${totalBatches}`);
                    const response = await productsAPI.bulkImport({ items: batch });
                    const result = response.data?.data || response.data;

                    totalCreated += result.created || 0;
                    totalUpdated += result.updated || 0;
                    totalFailed += result.failed || 0;
                } catch (batchError: any) {
                    console.error(`Batch ${batchNum} error:`, batchError);
                    totalFailed += batch.length;
                }
            }

            toast.success(`Import hoàn tất: ${totalCreated} mới, ${totalUpdated} cập nhật, ${totalFailed} lỗi`);
            fetchProducts();
        } catch (error: any) {
            console.error('Import error:', error);
            toast.error(error.response?.data?.message || 'Có lỗi khi import file');
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    // Export Excel
    const handleExport = async (format: 'xlsx' | 'csv') => {
        setShowExportMenu(false);
        try {
            const response = await productsAPI.export({});
            const products = response.data?.data || [];

            const exportData = products.map((p: any) => ({
                'Loại hàng': p.productType,
                'Nhóm hàng': p.categoryName,
                'Mã hàng': p.sku,
                'Mã vạch': p.barcode,
                'Tên hàng': p.name,
                'Thương hiệu': p.brand,
                'Giá bán': p.price,
                'Giá vốn': p.cost,
                'Tồn kho': p.stock,
                'Tồn nhỏ nhất': p.minStock,
                'Tồn lớn nhất': p.maxStock,
                'ĐVT': p.unit,
                'ĐVT cơ bản': p.baseUnitCode,
                'Quy đổi': p.conversionRate,
                'Trọng lượng': p.weight,
                'Đang kinh doanh': p.active ? 'Có' : 'Không',
                'Bán trực tiếp': p.directSale ? 'Có' : 'Không',
                'Mô tả': p.description,
                'Vị trí': p.location,
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Danh sách hàng hóa');
            XLSX.writeFile(wb, `danh-sach-hang-hoa.${format}`);
            toast.success('Xuất file thành công');
        } catch (error) {
            toast.error('Có lỗi khi xuất file');
        }
    };

    // Select all
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedProducts(products.map(p => p.id));
        } else {
            setSelectedProducts([]);
        }
    };

    const handleSelectProduct = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedProducts([...selectedProducts, id]);
        } else {
            setSelectedProducts(selectedProducts.filter(pid => pid !== id));
        }
    };

    const formatCurrency = (value: unknown) => {
        const num = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
        if (!Number.isFinite(num)) return '—';
        return new Intl.NumberFormat('vi-VN').format(num);
    };

    const formatDate = (dateStr?: string | number | Date) => {
        if (!dateStr) return '—';
        try {
            // Handle various formats
            let date: Date;
            if (typeof dateStr === 'number') {
                date = new Date(dateStr);
            } else if (typeof dateStr === 'string') {
                // Try parsing ISO string or timestamp
                date = new Date(dateStr);
            } else {
                date = dateStr;
            }

            if (isNaN(date.getTime())) return '—';

            // Format: DD/MM/YYYY HH:mm
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');

            return `${day}/${month}/${year} ${hours}:${minutes}`;
        } catch {
            return '—';
        }
    };

    // Calculate estimated stock out days
    const calculateStockOutDays = (stock?: number) => {
        if (!stock || stock <= 0) return '0 ngày';
        // Assume average daily sales = 1 (can be improved later)
        const avgDailySales = 1;
        const days = Math.floor(stock / avgDailySales);
        return `${days} ngày`;
    };

    const totalPages = Math.ceil(pagination.total / pagination.limit);

    const clearFilters = () => {
        setCategoryFilter('');
        setProductTypeFilter('');
        setBrandFilter('');
        setLocationFilter('');
        setSupplierFilter('');
        setActiveFilter(undefined);
        setDirectSaleFilter(undefined);
        setStockFilter('');
    };

    return (
        <div className="product-list-container">
            <Toast toasts={toast.toasts} onRemove={toast.removeToast} />

            {/* Filter Sidebar */}
            {showFilters && (
                <aside className="filter-sidebar">
                    <div className="filter-header">
                        <h3>Hàng hóa</h3>
                        <button className="btn-clear-filters" onClick={clearFilters}>
                            Xóa bộ lọc
                        </button>
                    </div>

                    <div className="filter-section">
                        <label>Nhóm hàng</label>
                        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                            <option value="">Chọn nhóm hàng</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                        <a href="#" className="create-new-link">Tạo mới</a>
                    </div>

                    <div className="filter-section">
                        <label>Loại hàng</label>
                        <select value={productTypeFilter} onChange={(e) => setProductTypeFilter(e.target.value)}>
                            <option value="">Tất cả</option>
                            <option value="GOODS">Hàng hóa</option>
                            <option value="SERVICE">Dịch vụ</option>
                            <option value="COMBO">Combo</option>
                        </select>
                    </div>

                    <div className="filter-section">
                        <label>Nhà cung cấp</label>
                        <select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)}>
                            <option value="">Chọn nhà cung cấp</option>
                            {suppliers.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-section">
                        <label>Vị trí</label>
                        <input
                            type="text"
                            placeholder="Chọn vị trí"
                            value={locationFilter}
                            onChange={(e) => setLocationFilter(e.target.value)}
                        />
                    </div>

                    <div className="filter-section">
                        <label>Bán trực tiếp</label>
                        <div className="filter-buttons">
                            <button
                                className={`filter-btn ${directSaleFilter === undefined ? 'active' : ''}`}
                                onClick={() => setDirectSaleFilter(undefined)}
                            >
                                Tất cả
                            </button>
                            <button
                                className={`filter-btn ${directSaleFilter === true ? 'active' : ''}`}
                                onClick={() => setDirectSaleFilter(true)}
                            >
                                Có
                            </button>
                            <button
                                className={`filter-btn ${directSaleFilter === false ? 'active' : ''}`}
                                onClick={() => setDirectSaleFilter(false)}
                            >
                                Không
                            </button>
                        </div>
                    </div>

                    <div className="filter-section">
                        <label>Trạng thái hàng hóa</label>
                        <select
                            value={activeFilter === undefined ? '' : activeFilter ? 'true' : 'false'}
                            onChange={(e) => setActiveFilter(e.target.value === '' ? undefined : e.target.value === 'true')}
                        >
                            <option value="">Tất cả</option>
                            <option value="true">Hàng đang kinh doanh</option>
                            <option value="false">Hàng ngừng kinh doanh</option>
                        </select>
                    </div>
                </aside>
            )}

            {/* Main Content */}
            <main className="product-main">
                {/* Toolbar */}
                <div className="page-header">
                    <h2>Hàng hóa</h2>
                    <div className="search-box">
                        <MdSearch className="search-icon" />
                        <input
                            type="text"
                            placeholder="Theo mã, tên hàng"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="header-actions">
                        <button className="btn-outline-primary" onClick={handleAdd} style={{ fontWeight: 'bold', color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}>
                            <MdAdd /> Tạo mới
                        </button>
                        <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
                            <MdFileUpload /> Import file
                        </button>
                        <div className="export-dropdown" style={{ position: 'relative' }}>
                            <button className="btn-secondary" onClick={() => setShowExportMenu(!showExportMenu)}>
                                <MdFileDownload /> Xuất file {showExportMenu ? <MdExpandMore style={{ transform: 'rotate(180deg)' }} /> : <MdExpandMore />}
                            </button>
                            {showExportMenu && (
                                <div className="dropdown-menu" style={{ right: 0, left: 'auto', top: '100%', marginTop: '4px', position: 'absolute' }}>
                                    <div className="dropdown-item" onClick={() => handleExport('xlsx')}>Excel (.xlsx)</div>
                                    <div className="dropdown-item" onClick={() => handleExport('csv')}>CSV (.csv)</div>
                                </div>
                            )}
                        </div>

                        <button className="btn-icon">
                            <MdMoreHoriz />
                        </button>
                        <button className="btn-icon" onClick={fetchProducts} title="Làm mới">
                            <MdRefresh />
                        </button>
                        <button className="btn-icon" title="Cài đặt cột">
                            <MdViewColumn />
                        </button>
                        <button className="btn-icon" title="Cài đặt">
                            <MdSettings />
                        </button>
                        <button className="btn-icon">
                            <MdHelpOutline />
                        </button>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        style={{ display: 'none' }}
                        onChange={handleFileImport}
                    />
                </div>


                {/* Table */}
                <div className="product-table-wrapper">
                    {loading ? (
                        <div className="loading-state">
                            <div className="spinner-large"></div>
                            <p>Đang tải dữ liệu...</p>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="empty-state">
                            <MdInventory size={64} />
                            <h3>Chưa có sản phẩm</h3>
                            <p>Bắt đầu thêm sản phẩm hoặc import từ file Excel</p>
                            <div className="empty-actions">
                                <button onClick={handleAdd} className="btn-primary"><MdAdd /> Thêm sản phẩm</button>
                                <button onClick={() => fileInputRef.current?.click()} className="btn-secondary">
                                    <MdFileUpload /> Import file
                                </button>
                            </div>
                        </div>
                    ) : (
                        <table className="product-table">
                            <thead>
                                <tr>
                                    <th className="col-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={selectedProducts.length === products.length}
                                            onChange={(e) => handleSelectAll(e.target.checked)}
                                        />
                                    </th>
                                    <th className="col-star"></th>
                                    <th className="col-image">Ảnh</th>
                                    <th>Mã hàng</th>
                                    <th>Tên hàng</th>
                                    <th className="text-center">ĐVT</th>
                                    <th className="text-right">Giá bán</th>
                                    <th className="text-right">Giá vốn</th>
                                    <th className="text-right">Tồn kho</th>
                                    <th className="text-center">Khách đặt</th>
                                    <th className="text-center">Dự kiến hết hàng</th>
                                    <th>Thời gian tạo</th>
                                    <th className="col-actions">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((product) => (
                                    <tr key={product.id} className={!product.active ? 'inactive' : ''}>
                                        <td className="col-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={selectedProducts.includes(product.id)}
                                                onChange={(e) => handleSelectProduct(product.id, e.target.checked)}
                                            />
                                        </td>
                                        <td className="col-star">
                                            <button className="btn-star">
                                                <MdStarBorder />
                                            </button>
                                        </td>
                                        <td className="col-image">
                                            {product.images ? (
                                                <img
                                                    src={product.images}
                                                    alt={product.name}
                                                    style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                                                />
                                            ) : (
                                                <div style={{ width: '40px', height: '40px', background: '#f5f5f5', borderRadius: '4px', border: '1px solid #eee' }}></div>
                                            )}
                                        </td>
                                        <td className="col-sku">{product.sku || '—'}</td>
                                        <td className="col-name">
                                            <span className="product-name">{product.name}</span>
                                            {product.brand && <span className="product-brand">{product.brand}</span>}
                                        </td>
                                        <td className="text-center">
                                            <div className="product-unit-display">
                                                <strong>{product.unit || product.baseUnitCode || 'Cái'}</strong>
                                                {product.baseUnitCode && product.unit && product.baseUnitCode !== product.unit && Number(product.conversionRate || 1) > 1 && (
                                                    <small>1 {product.unit} = {product.conversionRate} {product.baseUnitCode}</small>
                                                )}
                                            </div>
                                        </td>
                                        <td className="text-right col-price">{formatCurrency(product.defaultPrice)}</td>
                                        <td className="text-right col-cost">{formatCurrency(product.defaultCost)}</td>
                                        <td className="text-right col-stock">
                                            <span className={`stock-badge ${(product.totalStock || 0) <= 0 ? 'out-of-stock' : ''}`}>
                                                {product.totalStock ?? 0}
                                            </span>
                                        </td>
                                        <td className="text-center">0</td>
                                        <td className="text-center col-stock-out">{calculateStockOutDays(product.totalStock)}</td>
                                        <td className="col-date">{formatDate(product.createdAt)}</td>
                                        <td className="col-actions">
                                            <span className="actions-cell">
                                                <button className="btn-icon btn-edit" onClick={() => handleEdit(product)} title="Sửa">
                                                    <MdEdit />
                                                </button>
                                                <button className="btn-icon btn-delete" onClick={() => handleDeleteClick(product)} title="Xóa">
                                                    <MdDelete />
                                                </button>
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                {
                    products.length > 0 && (
                        <Pagination
                            currentPage={pagination.page}
                            totalPages={totalPages}
                            totalItems={pagination.total}
                            itemsPerPage={pagination.limit}
                            onPageChange={handlePageChange}
                        />
                    )
                }
            </main >

            {/* Add/Edit Modal */}
            < Modal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)
                }
                title={editingProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}
                size="lg"
            >
                {isFormOpen && (
                    <ProductForm
                        product={editingProduct}
                        categories={categories}
                        onSubmit={handleFormSubmit}
                        onCancel={() => setIsFormOpen(false)}
                        isLoading={isSubmitting}
                    />
                )}
            </Modal >

            {/* Delete Confirmation Modal */}
            < Modal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                title="Xác nhận xóa"
                size="sm"
            >
                <div className="confirm-dialog">
                    <p>
                        Bạn có chắc chắn muốn xóa sản phẩm{' '}
                        <strong>"{deletingProduct?.name}"</strong>?
                    </p>
                    <p className="warning-text">Hành động này không thể hoàn tác.</p>
                    <div className="form-actions">
                        <button
                            className="btn btn-secondary"
                            onClick={() => setIsDeleteOpen(false)}
                            disabled={isSubmitting}
                        >
                            Hủy
                        </button>
                        <button
                            className="btn btn-danger"
                            onClick={handleDeleteConfirm}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Đang xóa...' : 'Xóa'}
                        </button>
                    </div>
                </div>
            </Modal >
        </div >
    );
}
