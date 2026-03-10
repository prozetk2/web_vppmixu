import { useRef, useState, useEffect, useMemo } from 'react';
import { priceListsAPI, productsAPI, categoriesAPI } from '../../services/api';
import { Toast, useToast } from '../shared/Toast';
import { MdAdd, MdDelete, MdClose, MdSearch, MdFileDownload, MdFileUpload, MdGridView, MdSettings, MdExpandMore, MdHelpOutline } from 'react-icons/md';
import * as XLSX from 'xlsx-js-style';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import './PriceListsPage.css';

interface PriceList {
    id: string;
    name: string;
    code: string;
    description?: string;
    isDefault: boolean;
    active: boolean;
}

interface Product {
    id: string;
    sku: string;
    name: string;
    defaultPrice: number;
    defaultCost: number;
    categoryId?: string;
    totalStock?: number;
    unit?: string;
}

interface Category {
    id: string;
    name: string;
}

export default function PriceListsPage() {
    const [priceLists, setPriceLists] = useState<PriceList[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedPriceList, setSelectedPriceList] = useState<string | null>(null);
    const [productPrices, setProductPrices] = useState<Map<string, number>>(new Map());
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingPriceList, setEditingPriceList] = useState<Partial<PriceList> | null>(null);
    const [showPriceListDropdown, setShowPriceListDropdown] = useState(false);
    const [priceListSearchTerm, setPriceListSearchTerm] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [skuFilter, setSkuFilter] = useState('');
    const [nameFilter, setNameFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [stockFilter, setStockFilter] = useState<'all' | 'inStock' | 'outOfStock'>('all');
    const [priceCondition, setPriceCondition] = useState<'all' | 'gt' | 'lt' | 'eq'>('all');
    const [priceCompareValue, setPriceCompareValue] = useState<number>(0);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);

    const toast = useToast();

    // Filter products
    const filteredProducts = useMemo(() => {
        let result = products;

        // Global search
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            result = result.filter(
                p => p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term)
            );
        }

        // Column filters
        if (skuFilter.trim()) {
            result = result.filter(p => p.sku.toLowerCase().includes(skuFilter.toLowerCase()));
        }
        if (nameFilter.trim()) {
            result = result.filter(p => p.name.toLowerCase().includes(nameFilter.toLowerCase()));
        }

        // Category filter
        if (categoryFilter) {
            result = result.filter(p => p.categoryId === categoryFilter);
        }

        // Stock filter
        if (stockFilter === 'inStock') {
            result = result.filter(p => (p.totalStock || 0) > 0);
        } else if (stockFilter === 'outOfStock') {
            result = result.filter(p => (p.totalStock || 0) <= 0);
        }

        // Price condition filter
        if (priceCondition !== 'all' && priceCompareValue > 0) {
            result = result.filter(p => {
                const price = productPrices.get(p.id) || p.defaultPrice;
                if (priceCondition === 'gt') return price > priceCompareValue;
                if (priceCondition === 'lt') return price < priceCompareValue;
                if (priceCondition === 'eq') return price === priceCompareValue;
                return true;
            });
        }

        return result;
    }, [products, searchTerm, skuFilter, nameFilter, categoryFilter, stockFilter, priceCondition, priceCompareValue, productPrices]);

    // Pagination
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const paginatedProducts = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredProducts.slice(start, start + itemsPerPage);
    }, [filteredProducts, currentPage, itemsPerPage]);

    useEffect(() => {
        fetchPriceLists();
        fetchProducts();
        fetchCategories();
    }, []);

    // Auto-select first price list
    useEffect(() => {
        if (priceLists.length > 0 && !selectedPriceList) {
            const defaultList = priceLists.find(pl => pl.isDefault) || priceLists[0];
            loadPriceListProducts(defaultList.id);
        }
    }, [priceLists]);

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
        } catch (error) {
            toast.error('Không thể tải danh sách bảng giá');
        }
    };

    const fetchProducts = async () => {
        try {
            const response = await productsAPI.getAll({ page: 1, limit: 5000 });
            const data = response.data?.data || [];
            setProducts(data.map((p: any) => ({
                id: p.id.toString(),
                sku: p.sku || p.code || '',
                name: p.name,
                defaultPrice: Number(p.defaultPrice || 0),
                defaultCost: Number(p.defaultCost || 0),
                categoryId: p.categoryId?.toString(),
                totalStock: Number(p.totalStock || 0),
                unit: p.unit,
            })));
        } catch (error) {
            toast.error('Không thể tải danh sách sản phẩm');
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await categoriesAPI.getAll();
            const data = response.data?.data || response.data || [];
            setCategories(data.map((c: any) => ({
                id: c.id.toString(),
                name: c.name,
            })));
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const loadPriceListProducts = async (priceListId: string) => {
        try {
            const response = await priceListsAPI.getProducts(priceListId);
            const prices = new Map<string, number>();

            const priceData = response.data.data || response.data || [];
            priceData.forEach((pp: any) => {
                prices.set(pp.productId.toString(), Number(pp.price));
            });

            setProductPrices(prices);
            setSelectedPriceList(priceListId);
            setShowPriceListDropdown(false);
            setPriceListSearchTerm('');
        } catch (error) {
            toast.error('Không thể tải giá sản phẩm');
        }
    };

    const handleSavePrices = async () => {
        if (!selectedPriceList) return;

        try {
            const prices = Array.from(productPrices.entries()).map(([productId, price]) => ({
                productId,
                price,
            }));

            await priceListsAPI.bulkSetPrices(selectedPriceList, prices);
            toast.success('Đã lưu giá thành công');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Lỗi lưu giá');
        }
    };

    const handleCreatePriceList = async () => {
        if (!editingPriceList?.name || !editingPriceList?.code) {
            toast.error('Vui lòng điền đầy đủ thông tin');
            return;
        }

        try {
            await priceListsAPI.create(editingPriceList);
            toast.success('Tạo bảng giá thành công');
            setShowAddModal(false);
            setEditingPriceList(null);
            fetchPriceLists();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Lỗi tạo bảng giá');
        }
    };

    const handleDeletePriceList = async (id: string) => {
        if (!confirm('Xóa bảng giá này?')) return;

        try {
            await priceListsAPI.delete(id);
            toast.success('Đã xóa bảng giá');
            fetchPriceLists();
            if (selectedPriceList === id) {
                setSelectedPriceList(null);
                setProductPrices(new Map());
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Lỗi xóa bảng giá');
        }
    };

    const updateProductPrice = (productId: string, price: number) => {
        const newPrices = new Map(productPrices);
        if (price > 0) {
            newPrices.set(productId, price);
        } else {
            newPrices.delete(productId);
        }
        setProductPrices(newPrices);
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN').format(value);
    };

    const selectedPriceListName = priceLists.find(pl => pl.id === selectedPriceList)?.name || 'Bảng giá chung';

    const filteredPriceLists = useMemo(() => {
        if (!priceListSearchTerm.trim()) return priceLists;
        const term = priceListSearchTerm.toLowerCase();
        return priceLists.filter(pl =>
            pl.name.toLowerCase().includes(term) ||
            pl.code.toLowerCase().includes(term)
        );
    }, [priceLists, priceListSearchTerm]);

    const handleExport = async () => {
        if (!selectedPriceList) {
            toast.error('Vui lòng chọn bảng giá cần xuất');
            return;
        }

        const productsToExport = products.filter(p => productPrices.has(p.id));

        if (productsToExport.length === 0) {
            toast.error('Không có sản phẩm nào có giá trong bảng giá này');
            return;
        }

        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Bảng báo giá');

            // Set column widths - 6 columns: STT, Nội dung, ĐVT, Số Lượng, Đơn giá, Thành Tiền
            worksheet.columns = [
                { width: 6 },   // A - STT
                { width: 50 },  // B - Nội dung
                { width: 10 },  // C - ĐVT
                { width: 12 },  // D - Số Lượng
                { width: 12 },  // E - Đơn giá
                { width: 14 }   // F - Thành Tiền
            ];


            const greenColor = '7CB342';

            // Row 1: Company name (A1:F1 merged)
            worksheet.mergeCells('A1:F1');
            const companyCell = worksheet.getCell('A1');
            companyCell.value = 'CÔNG TY TNHH MTV TM VÀ DV MIXU';
            companyCell.font = { bold: true, size: 14 };
            companyCell.alignment = { horizontal: 'center', vertical: 'middle' };
            companyCell.border = { bottom: { style: 'medium', color: { argb: `FF${greenColor}` } } };

            // Row 2-4: Logo (A2:B4) + Company info (C2:F4)
            // Merge logo area
            worksheet.mergeCells('A2:B4');

            // Fetch logo image and add to worksheet
            try {
                const logoResponse = await fetch('/mixu_logo.png');
                const logoBlob = await logoResponse.blob();
                const logoArrayBuffer = await logoBlob.arrayBuffer();
                const logoBase64 = btoa(
                    new Uint8Array(logoArrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
                );

                const logoImageId = workbook.addImage({
                    base64: `data:image/png;base64,${logoBase64}`,
                    extension: 'png',
                });

                // Add logo to merged area A2:B4
                worksheet.addImage(logoImageId, {
                    tl: { col: 0, row: 1 },
                    ext: { width: 120, height: 60 }
                });
            } catch (logoError) {
                console.error('Logo load error:', logoError);
                // Fallback to text if logo fails
                const logoCell = worksheet.getCell('A2');
                logoCell.value = 'MIXU\nOFFICE SUPPLIES';
                logoCell.font = { bold: true, size: 14, color: { argb: `FF${greenColor}` } };
                logoCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            }

            // Address (C2:F2)
            worksheet.mergeCells('C2:F2');
            const addressCell = worksheet.getCell('C2');
            addressCell.value = 'A -119 Nguyễn Hữu Thọ, Q, Hải Châu Tp. Đà Nẵng.';
            addressCell.font = { size: 10 };
            addressCell.alignment = { horizontal: 'left', vertical: 'middle' };

            // Phone (C3:F3)
            worksheet.mergeCells('C3:F3');
            const phoneCell = worksheet.getCell('C3');
            phoneCell.value = 'T - 0236. 6563583 - 0932452168';
            phoneCell.font = { size: 10 };
            phoneCell.alignment = { horizontal: 'left', vertical: 'middle' };

            // Email (C4:F4)
            worksheet.mergeCells('C4:F4');
            const emailCell = worksheet.getCell('C4');
            emailCell.value = 'E - mixuoffice@gmail.com.';
            emailCell.font = { size: 10 };
            emailCell.alignment = { horizontal: 'left', vertical: 'middle' };

            // Row 6: Title BẢNG BÁO GIÁ
            worksheet.mergeCells('A6:F6');
            const titleCell = worksheet.getCell('A6');
            titleCell.value = 'BẢNG BÁO GIÁ';
            titleCell.font = { bold: true, size: 16 };
            titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

            // Row 7: Subtitle
            worksheet.mergeCells('A7:F7');
            const subtitleCell = worksheet.getCell('A7');
            subtitleCell.value = 'Công ty chúng tôi rất hân hạnh xin báo giá các mặt hàng văn phòng phẩm như sau:';
            subtitleCell.font = { italic: true, size: 11 };
            subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

            // Row 8: Table headers
            const headerRow = worksheet.getRow(8);
            headerRow.values = ['STT', 'Nội dung', 'ĐVT', 'Số Lượng', 'Đơn giá', 'Thành Tiền'];
            headerRow.eachCell((cell) => {
                cell.font = { bold: true, size: 11 };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });

            // Data rows
            let rowNum = 9;
            productsToExport.forEach((p, index) => {
                const price = productPrices.get(p.id) || 0;
                const row = worksheet.getRow(rowNum);
                row.values = [index + 1, p.name, p.unit || 'Cái', '', price, ''];
                row.eachCell((cell, colNumber) => {
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                    if (colNumber === 1 || colNumber === 3 || colNumber === 4) {
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    } else if (colNumber >= 5) {
                        cell.alignment = { horizontal: 'right', vertical: 'middle' };
                        // Thêm định dạng số với dấu phân cách hàng nghìn
                        cell.numFmt = '#,##0';
                    } else {
                        cell.alignment = { vertical: 'middle' };
                    }
                });
                rowNum++;
            });

            rowNum++;

            // Notes section - GHI CHÚ:
            worksheet.getCell(`A${rowNum}`).value = 'GHI CHÚ:';
            worksheet.getCell(`A${rowNum}`).font = { bold: true, size: 11 };
            rowNum++;

            // Gộp dấu * với nội dung trong cùng 1 cell
            const notes = [
                '* Đơn giá đã bao gồm VAT',
                '* Giá từng mặt hàng có thể thay đổi theo thời giá mà có thể không báo trước.',
                '* Giao hàng tận nơi trong TP. Đà Nẵng',
                '* Còn nhiều mặt hàng khác, Quý khách có nhu cầu xin vui lòng liên hệ.',
                'Tel: 0932542168    Zalo: 0932.542.168    Mail: mixuoffice@gmail.com',
                'Cảm ơn quý khách hàng đã sử dụng sản phẩm và dịch vụ của chúng tôi'
            ];

            notes.forEach(note => {
                worksheet.getCell(`A${rowNum}`).value = note;
                worksheet.getCell(`A${rowNum}`).font = { size: 10 };
                rowNum++;
            });

            rowNum++;

            // Date and signature
            const now = new Date();
            const dateStr = `Đà Nẵng, Ngày ${String(now.getDate()).padStart(2, '0')} tháng ${String(now.getMonth() + 1).padStart(2, '0')} năm ${now.getFullYear()}`;
            worksheet.getCell(`E${rowNum}`).value = dateStr;
            worksheet.getCell(`E${rowNum}`).font = { italic: true, size: 11 };
            worksheet.getCell(`E${rowNum}`).alignment = { horizontal: 'right' };
            rowNum++;

            worksheet.getCell(`E${rowNum}`).value = 'Người báo giá';
            worksheet.getCell(`E${rowNum}`).font = { bold: true, size: 11 };
            worksheet.getCell(`E${rowNum}`).alignment = { horizontal: 'right' };

            // Generate file
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const filename = `BangBaoGia_${selectedPriceListName}_${date}.xlsx`;
            saveAs(blob, filename);
            toast.success('Xuất file thành công');
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Lỗi khi xuất file');
        }
    };

    const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

            if (jsonData.length < 2) {
                toast.error('File không có dữ liệu');
                return;
            }

            // Find headers
            const headers = jsonData[0].map((h: any) => String(h || '').trim());

            // Map columns
            const skuIdx = headers.findIndex(h => h.includes('Mã hàng') || h.toLowerCase().includes('sku'));
            const priceIdx = headers.findIndex(h => h === selectedPriceListName || h.toLowerCase().includes('giá') || h.toLowerCase().includes('price'));

            if (skuIdx === -1) {
                toast.error('Không tìm thấy cột "Mã hàng"');
                return;
            }
            if (priceIdx === -1) {
                toast.error(`Không tìm thấy cột giá "${selectedPriceListName}"`);
                return;
            }

            // Process rows
            const newPrices = new Map(productPrices);
            let updatedCount = 0;

            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                const sku = String(row[skuIdx] || '').trim();
                const price = typeof row[priceIdx] === 'number' ? row[priceIdx] : parseFloat(String(row[priceIdx] || '').replace(/,/g, ''));

                if (sku && !isNaN(price)) {
                    // Find product by SKU
                    const product = products.find(p => p.sku === sku);
                    if (product) {
                        if (price > 0) {
                            newPrices.set(product.id, price);
                        } else {
                            newPrices.delete(product.id);
                        }
                        updatedCount++;
                    }
                }
            }

            setProductPrices(newPrices);
            toast.success(`Đã cập nhật giá cho ${updatedCount} sản phẩm. Vui lòng bấm "Lưu thay đổi" để hoàn tất.`);

        } catch (error) {
            console.error('Import error:', error);
            toast.error('Lỗi khi đọc file');
        } finally {
            // Reset input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="price-lists-page kiotviet-style">
            <Toast toasts={toast.toasts} onRemove={toast.removeToast} />

            {/* Header */}
            <div className="page-header">
                <h2>{selectedPriceListName}</h2>
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
                    <button className="btn-outline-primary" onClick={() => {
                        setEditingPriceList({ active: true, isDefault: false });
                        setShowAddModal(true);
                    }}>
                        <MdAdd /> Bảng giá
                    </button>
                    <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
                        <MdFileUpload /> Import
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept=".xlsx, .xls, .csv"
                        onChange={handleFileImport}
                    />
                    <button className="btn-secondary" onClick={handleExport}>
                        <MdFileDownload /> Xuất file
                    </button>
                    <button className="btn-icon"><MdGridView /></button>
                    <button className="btn-icon"><MdSettings /></button>
                    <button className="btn-icon"><MdHelpOutline /></button>
                </div>
            </div>

            <div className="page-content">
                {/* Sidebar */}
                <div className="sidebar">
                    {/* Price List Selector */}
                    <div className="filter-section">
                        <div className="filter-header">
                            <span>Bảng giá</span>
                            <a href="#" className="link-add" onClick={(e) => {
                                e.preventDefault();
                                setEditingPriceList({ active: true, isDefault: false });
                                setShowAddModal(true);
                            }}>Tạo mới</a>
                        </div>
                        <div
                            className="price-list-selector"
                            onClick={() => {
                                setShowPriceListDropdown(!showPriceListDropdown);
                                if (!showPriceListDropdown) setPriceListSearchTerm('');
                            }}
                        >
                            <span className="selected-tag">
                                {selectedPriceListName}
                            </span>
                            <MdExpandMore />
                        </div>
                        {showPriceListDropdown && (
                            <div className="dropdown-menu price-list-dropdown">
                                <div className="dropdown-search">
                                    <MdSearch />
                                    <input
                                        type="text"
                                        placeholder="Tìm bảng giá..."
                                        autoFocus
                                        value={priceListSearchTerm}
                                        onChange={(e) => setPriceListSearchTerm(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                                <div className="dropdown-items">
                                    {filteredPriceLists.map(pl => (
                                        <div
                                            key={pl.id}
                                            className={`dropdown-item ${selectedPriceList === pl.id ? 'active' : ''}`}
                                            onClick={() => loadPriceListProducts(pl.id)}
                                        >
                                            <span className="dropdown-item-name">{pl.name}</span>
                                            <span className="dropdown-item-actions">
                                                {pl.isDefault && <span className="badge-default">Mặc định</span>}
                                                {!pl.isDefault && (
                                                    <button
                                                        className="btn-delete-price-list"
                                                        title="Xóa bảng giá"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeletePriceList(pl.id);
                                                        }}
                                                    >
                                                        <MdDelete />
                                                    </button>
                                                )}
                                            </span>
                                        </div>
                                    ))}
                                    {filteredPriceLists.length === 0 && (
                                        <div className="dropdown-empty">Không tìm thấy bảng giá</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Category Filter */}
                    <div className="filter-section">
                        <div className="filter-header">Nhóm hàng</div>
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="">Chọn nhóm hàng</option>
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Stock Filter */}
                    <div className="filter-section">
                        <div className="filter-header">Tồn kho</div>
                        <select
                            value={stockFilter}
                            onChange={(e) => setStockFilter(e.target.value as any)}
                            className="filter-select"
                        >
                            <option value="all">Tất cả</option>
                            <option value="inStock">Còn hàng</option>
                            <option value="outOfStock">Hết hàng</option>
                        </select>
                    </div>

                    {/* Price Condition Filter */}
                    <div className="filter-section">
                        <div className="filter-header">Giá bán</div>
                        <select
                            value={priceCondition}
                            onChange={(e) => setPriceCondition(e.target.value as any)}
                            className="filter-select"
                        >
                            <option value="all">Chọn điều kiện</option>
                            <option value="gt">Lớn hơn</option>
                            <option value="lt">Nhỏ hơn</option>
                            <option value="eq">Bằng</option>
                        </select>
                        {priceCondition !== 'all' && (
                            <input
                                type="number"
                                placeholder="Nhập giá"
                                value={priceCompareValue || ''}
                                onChange={(e) => setPriceCompareValue(parseFloat(e.target.value) || 0)}
                                className="filter-input"
                            />
                        )}
                    </div>

                    {/* Save Button - in sidebar */}
                    {selectedPriceList && productPrices.size > 0 && (
                        <button className="btn-save-sidebar" onClick={handleSavePrices}>
                            Lưu thay đổi
                        </button>
                    )}
                </div>

                {/* Main Table */}
                <div className="main-content">
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th className="col-sku">Mã hàng</th>
                                    <th className="col-name">Tên hàng</th>
                                    <th className="col-cost">Giá vốn</th>
                                    <th className="col-last-cost">Giá nhập cuối</th>
                                    <th className="col-price">{selectedPriceListName}</th>
                                </tr>
                                <tr className="filter-row">
                                    <th>
                                        <input
                                            type="text"
                                            placeholder="Tìm mã hàng"
                                            value={skuFilter}
                                            onChange={(e) => setSkuFilter(e.target.value)}
                                        />
                                    </th>
                                    <th>
                                        <input
                                            type="text"
                                            placeholder="Tìm tên hàng"
                                            value={nameFilter}
                                            onChange={(e) => setNameFilter(e.target.value)}
                                        />
                                    </th>
                                    <th></th>
                                    <th></th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedProducts.map(product => (
                                    <tr key={product.id}>
                                        <td className="col-sku">{product.sku}</td>
                                        <td className="col-name">{product.name}</td>
                                        <td className="col-cost">{formatCurrency(product.defaultCost)}</td>
                                        <td className="col-last-cost">{formatCurrency(product.defaultCost)}</td>
                                        <td className="col-price">
                                            <input
                                                type="text"
                                                value={productPrices.get(product.id) ? formatCurrency(productPrices.get(product.id)!) : ''}
                                                onChange={(e) => {
                                                    // Loại bỏ tất cả ký tự không phải số
                                                    const rawValue = e.target.value.replace(/[^0-9]/g, '');
                                                    const numValue = parseInt(rawValue, 10) || 0;
                                                    updateProductPrice(product.id, numValue);
                                                }}
                                                placeholder="0"
                                                className="price-input"
                                            />
                                        </td>
                                    </tr>
                                ))}
                                {paginatedProducts.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="empty-row">
                                            Không có sản phẩm nào
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="pagination-bar">
                        <div className="pagination-info">
                            <span>Hiện thị</span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => {
                                    setItemsPerPage(parseInt(e.target.value));
                                    setCurrentPage(1);
                                }}
                            >
                                <option value={15}>15 dòng</option>
                                <option value={30}>30 dòng</option>
                                <option value={50}>50 dòng</option>
                                <option value={100}>100 dòng</option>
                            </select>
                        </div>
                        <div className="pagination-pages">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(1)}
                            >«</button>
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => p - 1)}
                            >‹</button>

                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }
                                return (
                                    <button
                                        key={pageNum}
                                        className={currentPage === pageNum ? 'active' : ''}
                                        onClick={() => setCurrentPage(pageNum)}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}

                            {totalPages > 5 && currentPage < totalPages - 2 && (
                                <>
                                    <span>...</span>
                                    <button onClick={() => setCurrentPage(totalPages)}>{totalPages}</button>
                                </>
                            )}

                            <button
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => p + 1)}
                            >›</button>
                            <button
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(totalPages)}
                            >»</button>
                        </div>
                        <div className="pagination-total">
                            {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredProducts.length)} trong {filteredProducts.length} hàng hóa
                        </div>
                    </div>
                </div>
            </div>



            {/* Add Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Tạo bảng giá mới</h3>
                            <button onClick={() => setShowAddModal(false)}><MdClose /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Tên bảng giá *</label>
                                <input
                                    type="text"
                                    value={editingPriceList?.name || ''}
                                    onChange={(e) => setEditingPriceList({ ...editingPriceList, name: e.target.value })}
                                    placeholder="VD: Giá bán lẻ"
                                />
                            </div>
                            <div className="form-group">
                                <label>Mã bảng giá *</label>
                                <input
                                    type="text"
                                    value={editingPriceList?.code || ''}
                                    onChange={(e) => setEditingPriceList({ ...editingPriceList, code: e.target.value.toUpperCase() })}
                                    placeholder="VD: RETAIL"
                                />
                            </div>
                            <div className="form-group">
                                <label>Mô tả</label>
                                <textarea
                                    value={editingPriceList?.description || ''}
                                    onChange={(e) => setEditingPriceList({ ...editingPriceList, description: e.target.value })}
                                    placeholder="Mô tả bảng giá"
                                />
                            </div>
                            <div className="form-group checkbox">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={editingPriceList?.isDefault || false}
                                        onChange={(e) => setEditingPriceList({ ...editingPriceList, isDefault: e.target.checked })}
                                    />
                                    Đặt làm bảng giá mặc định
                                </label>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowAddModal(false)}>Hủy</button>
                            <button className="btn-primary" onClick={handleCreatePriceList}>Tạo</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
