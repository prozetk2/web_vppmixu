import React, { useState, useEffect, useRef } from 'react';
import { invoicesAPI } from '../../services/api';
import Modal from '../shared/Modal';
import { Toast, useToast } from '../shared/Toast';
import {
    MdSearch,
    MdFilterList,
    MdAdd,
    MdFileUpload,
    MdFileDownload,
    MdClose,
    MdInbox,
    MdEdit,
    MdDelete,
    MdExpandMore,
    MdContentCopy,
    MdSave,
    MdPrint,
    MdUndo,
    MdCancel,
} from 'react-icons/md';
import * as XLSX from 'xlsx';
import './InvoiceList.css';

interface InvoiceItem {
    id: string;
    productCode?: string;
    barcode?: string;
    productName?: string;
    brand?: string;
    unit?: string;
    notes?: string;
    quantity: number;
    unitPrice: number;
    discountPercent?: number;
    discountAmount?: number;
    salePrice?: number;
    totalPrice: number;
}

interface Invoice {
    id: string;
    invoiceNumber: string;
    branch?: string;
    orderCode?: string;
    returnOrderCode?: string;
    customerCode?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    customerAddress?: string;
    customerArea?: string;
    customerWard?: string;
    customerDob?: string;
    priceList?: string;
    seller?: string;
    salesChannel?: string;
    creator?: string;
    notes?: string;
    totalAmount: number;
    discountAmount: number;
    amountDue?: number;
    amountPaid: number;
    cashAmount?: number;
    cardAmount?: number;
    walletAmount?: number;
    transferAmount?: number;
    status: string;
    eInvoiceStatus?: string;
    paymentMethod?: string;
    issuedAt?: string;
    createdAt: string;
    updatedAt?: string;
    items?: InvoiceItem[];
}

interface FilterOptions {
    creators: string[];
    sellers: string[];
    priceLists: string[];
    salesChannels: string[];
    paymentMethods: string[];
}

const STATUS_LABELS: Record<string, string> = {
    COMPLETED: 'Hoàn thành',
    CANCELLED: 'Đã hủy',
    DRAFT: 'Nháp',
};

const STATUS_CLASSES: Record<string, string> = {
    COMPLETED: 'status-completed',
    CANCELLED: 'status-cancelled',
    DRAFT: 'status-draft',
};

export default function InvoiceList() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [filterOptions, setFilterOptions] = useState<FilterOptions>({
        creators: [],
        sellers: [],
        priceLists: [],
        salesChannels: [],
        paymentMethods: [],
    });

    // Filters
    const [search, setSearch] = useState('');
    const [timeFilter, setTimeFilter] = useState('thisMonth');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [statusFilter, setStatusFilter] = useState<string[]>(['COMPLETED']);
    const [eInvoiceStatus, setEInvoiceStatus] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');
    const [creator, setCreator] = useState('');
    const [seller, setSeller] = useState('');
    const [priceList, setPriceList] = useState('');
    const [salesChannel, setSalesChannel] = useState('');

    // Pagination
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [meta, setMeta] = useState({ total: 0, totalPages: 1 });

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [expandedInvoiceDetail, setExpandedInvoiceDetail] = useState<Invoice | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const toast = useToast();

    // Calculate date range based on time filter
    const getDateRange = () => {
        const now = new Date();
        if (timeFilter === 'thisMonth') {
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            return {
                dateFrom: start.toISOString().split('T')[0],
                dateTo: end.toISOString().split('T')[0],
            };
        } else if (timeFilter === 'custom') {
            return { dateFrom, dateTo };
        }
        return {};
    };

    useEffect(() => {
        fetchInvoices();
    }, [page, limit, statusFilter, timeFilter, dateFrom, dateTo]);

    useEffect(() => {
        fetchFilterOptions();
    }, []);

    const fetchFilterOptions = async () => {
        try {
            const response = await invoicesAPI.getFilterOptions();
            const data = response.data || {};
            setFilterOptions({
                creators: data.creators || [],
                sellers: data.sellers || [],
                priceLists: data.priceLists || [],
                salesChannels: data.salesChannels || [],
                paymentMethods: data.paymentMethods || [],
            });
        } catch (error) {
            console.error('Failed to fetch filter options:', error);
        }
    };

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const params: Record<string, unknown> = { page, limit };

            if (search) params.search = search;

            const dateRange = getDateRange();
            if (dateRange.dateFrom) params.dateFrom = dateRange.dateFrom;
            if (dateRange.dateTo) params.dateTo = dateRange.dateTo;

            if (statusFilter.length === 1) {
                params.status = statusFilter[0];
            }

            if (eInvoiceStatus) params.eInvoiceStatus = eInvoiceStatus;
            if (paymentMethod) params.paymentMethod = paymentMethod;
            if (creator) params.creator = creator;
            if (seller) params.seller = seller;
            if (priceList) params.priceList = priceList;
            if (salesChannel) params.salesChannel = salesChannel;

            const response = await invoicesAPI.getAll(params);
            const data = response.data?.data || [];
            setInvoices(
                data.map((inv: any) => ({
                    ...inv,
                    id: inv.id.toString(),
                }))
            );
            setMeta(response.data?.meta || { total: 0, totalPages: 1 });
        } catch (error) {
            console.error('Failed to fetch invoices:', error);
            toast.error('Không thể tải danh sách hóa đơn');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        setPage(1);
        fetchInvoices();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearch();
    };

    const handleStatusChange = (status: string) => {
        if (statusFilter.includes(status)) {
            setStatusFilter(statusFilter.filter((s) => s !== status));
        } else {
            setStatusFilter([...statusFilter, status]);
        }
        setPage(1);
    };

    const handleTimeFilterChange = (value: string) => {
        setTimeFilter(value);
        if (value !== 'custom') {
            setDateFrom('');
            setDateTo('');
        }
        setPage(1);
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN').format(value);
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Import Excel
    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    // Helper: Convert Excel serial date to ISO string
    const excelDateToISO = (excelDate: any): string | undefined => {
        if (!excelDate) return undefined;

        // If it's already a date string (contains - or /), return directly
        if (typeof excelDate === 'string' && (excelDate.includes('-') || excelDate.includes('/'))) {
            return new Date(excelDate).toISOString();
        }

        // If it's a number (Excel serial date)
        const numValue = typeof excelDate === 'number' ? excelDate : parseFloat(excelDate);
        if (!isNaN(numValue) && numValue > 0) {
            // Excel serial date: days since 1899-12-30 (with 1900 leap year bug)
            const excelEpoch = new Date(1899, 11, 30);
            const jsDate = new Date(excelEpoch.getTime() + numValue * 86400000);
            return jsDate.toISOString();
        }

        return undefined;
    };

    const parseExcel = (data: any[]): Partial<Invoice & { items: Partial<InvoiceItem>[] }>[] => {
        const invoiceMap: Map<string, Partial<Invoice & { items: Partial<InvoiceItem>[] }>> = new Map();

        data.forEach((row) => {
            const headers = Object.keys(row);
            const invoiceNumber = row['Mã hóa đơn'] || row['Ma hoa don'];

            if (!invoiceNumber) return;

            if (!invoiceMap.has(invoiceNumber)) {
                const invoice: Partial<Invoice & { items: Partial<InvoiceItem>[] }> = {
                    invoiceNumber,
                    items: [],
                };

                headers.forEach((h) => {
                    const key = h.toLowerCase().trim();
                    const val = row[h];
                    const strVal = val?.toString() || '';

                    if (key.includes('chi nhánh')) invoice.branch = strVal;
                    else if (key.includes('thời gian tạo')) invoice.createdAt = excelDateToISO(val) || strVal;
                    else if (key.includes('thời gian') && !key.includes('tạo') && !key.includes('cập nhật')) {
                        invoice.issuedAt = excelDateToISO(val);
                    }
                    else if (key.includes('mã đặt hàng')) invoice.orderCode = strVal;
                    else if (key.includes('mã trả hàng')) invoice.returnOrderCode = strVal;
                    else if (key.includes('mã khách hàng') || key === 'mã kh') invoice.customerCode = strVal;
                    else if (key.includes('tên khách hàng') || key === 'khách hàng') invoice.customerName = strVal;
                    else if (key.includes('email')) invoice.customerEmail = strVal;
                    else if (key.includes('điện thoại')) invoice.customerPhone = strVal;
                    else if (key.includes('địa chỉ')) invoice.customerAddress = strVal;
                    else if (key.includes('khu vực')) invoice.customerArea = strVal;
                    else if (key.includes('phường') || key.includes('xã')) invoice.customerWard = strVal;
                    else if (key.includes('ngày sinh')) invoice.customerDob = strVal;
                    else if (key.includes('bảng giá')) invoice.priceList = strVal;
                    else if (key.includes('người bán')) invoice.seller = strVal;
                    else if (key.includes('kênh bán')) invoice.salesChannel = strVal;
                    else if (key.includes('người tạo')) invoice.creator = strVal;
                    else if (key === 'ghi chú' && !key.includes('hàng')) invoice.notes = strVal;
                    else if (key.includes('tổng tiền hàng')) {
                        const num = typeof val === 'number' ? val : parseFloat(strVal.replace(/[^0-9.-]/g, ''));
                        if (!isNaN(num)) invoice.totalAmount = num;
                    }
                    else if (key.includes('giảm giá hóa đơn')) {
                        const num = typeof val === 'number' ? val : parseFloat(strVal.replace(/[^0-9.-]/g, ''));
                        if (!isNaN(num)) invoice.discountAmount = num;
                    }
                    else if (key.includes('khách cần trả')) {
                        const num = typeof val === 'number' ? val : parseFloat(strVal.replace(/[^0-9.-]/g, ''));
                        if (!isNaN(num)) invoice.amountDue = num;
                    }
                    else if (key.includes('khách đã trả')) {
                        const num = typeof val === 'number' ? val : parseFloat(strVal.replace(/[^0-9.-]/g, ''));
                        if (!isNaN(num)) invoice.amountPaid = num;
                    }
                    else if (key === 'tiền mặt') {
                        const num = typeof val === 'number' ? val : parseFloat(strVal.replace(/[^0-9.-]/g, ''));
                        if (!isNaN(num)) invoice.cashAmount = num;
                    }
                    else if (key === 'thẻ') {
                        const num = typeof val === 'number' ? val : parseFloat(strVal.replace(/[^0-9.-]/g, ''));
                        if (!isNaN(num)) invoice.cardAmount = num;
                    }
                    else if (key === 'ví') {
                        const num = typeof val === 'number' ? val : parseFloat(strVal.replace(/[^0-9.-]/g, ''));
                        if (!isNaN(num)) invoice.walletAmount = num;
                    }
                    else if (key.includes('chuyển khoản')) {
                        const num = typeof val === 'number' ? val : parseFloat(strVal.replace(/[^0-9.-]/g, ''));
                        if (!isNaN(num)) invoice.transferAmount = num;
                    }
                    else if (key === 'trạng thái') {
                        if (strVal.includes('Hoàn thành')) invoice.status = 'COMPLETED';
                        else if (strVal.includes('Đã hủy')) invoice.status = 'CANCELLED';
                        else invoice.status = 'COMPLETED';
                    }
                });

                invoiceMap.set(invoiceNumber, invoice);
            }

            // Add item
            const productCode = row['Mã hàng'] || row['Ma hang'];
            if (productCode) {
                const item: Partial<InvoiceItem> = {
                    productCode,
                    barcode: row['Mã vạch'] || row['Ma vach'],
                    productName: row['Tên hàng'] || row['Ten hang'],
                    brand: row['Thương hiệu'] || row['Thuong hieu'],
                    unit: row['ĐVT'] || row['DVT'],
                    notes: row['Ghi chú hàng hóa'],
                    quantity: parseFloat(row['Số lượng']) || 0,
                    unitPrice: parseFloat(row['Đơn giá']?.toString().replace(/[^0-9.-]/g, '')) || 0,
                    discountPercent: parseFloat(row['Giảm giá %']) || 0,
                    discountAmount: parseFloat(row['Giảm giá']?.toString().replace(/[^0-9.-]/g, '')) || 0,
                    salePrice: parseFloat(row['Giá bán']?.toString().replace(/[^0-9.-]/g, '')) || 0,
                    totalPrice: parseFloat(row['Thành tiền']?.toString().replace(/[^0-9.-]/g, '')) || 0,
                };
                invoiceMap.get(invoiceNumber)!.items!.push(item);
            }
        });

        return Array.from(invoiceMap.values());
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            const invoices = parseExcel(jsonData);

            if (invoices.length === 0) {
                toast.error('Không tìm thấy dữ liệu hợp lệ trong file');
                return;
            }

            const response = await invoicesAPI.bulkCreate(invoices);
            const results = Array.isArray(response.data) ? response.data : [];
            const successCount = results.filter((r: any) => r.success).length;
            const failCount = results.filter((r: any) => !r.success).length;

            if (successCount > 0) {
                toast.success(`Import thành công ${successCount} hóa đơn`);
            }
            if (failCount > 0) {
                toast.error(`${failCount} hóa đơn bị lỗi`);
            }
            if (results.length === 0) {
                toast.error('Không thể import - Backend trả về lỗi');
                console.error('Backend response:', response.data);
            }

            fetchInvoices();
        } catch (error: any) {
            console.error('Import error:', error);
            console.error('Error response:', error.response?.data);
            toast.error(error.response?.data?.message || 'Lỗi import file');
        }

        e.target.value = '';
    };

    // Export Excel
    const handleExport = (type: 'summary' | 'detailed') => {
        setShowExportMenu(false);

        if (type === 'summary') {
            const exportData = invoices.map((inv) => ({
                'Mã hóa đơn': inv.invoiceNumber,
                'Thời gian': formatDate(inv.createdAt),
                'Mã trả hàng': inv.returnOrderCode || '',
                'Mã KH': inv.customerCode || '',
                'Khách hàng': inv.customerName || '',
                'Tổng tiền hàng': inv.totalAmount,
                'Giảm giá': inv.discountAmount,
                'Khách đã trả': inv.amountPaid,
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Hóa đơn');
            XLSX.writeFile(wb, `hoa_don_tong_quan_${new Date().toISOString().split('T')[0]}.xlsx`);
        } else {
            // Detailed export - need to flatten items
            const exportData: any[] = [];

            invoices.forEach((inv) => {
                const baseRow = {
                    'Chi nhánh': inv.branch || '',
                    'Mã hóa đơn': inv.invoiceNumber,
                    'Thời gian': formatDate(inv.issuedAt || inv.createdAt),
                    'Thời gian tạo': formatDate(inv.createdAt),
                    'Ngày cập nhật': inv.updatedAt ? formatDate(inv.updatedAt) : '',
                    'Mã đặt hàng': inv.orderCode || '',
                    'Mã trả hàng': inv.returnOrderCode || '',
                    'Mã khách hàng': inv.customerCode || '',
                    'Tên khách hàng': inv.customerName || '',
                    'Email': inv.customerEmail || '',
                    'Điện thoại': inv.customerPhone || '',
                    'Địa chỉ (Khách hàng)': inv.customerAddress || '',
                    'Khu vực (Khách hàng)': inv.customerArea || '',
                    'Phường/Xã (Khách hàng)': inv.customerWard || '',
                    'Ngày sinh': inv.customerDob || '',
                    'Bảng giá': inv.priceList || '',
                    'Người bán': inv.seller || '',
                    'Kênh bán': inv.salesChannel || '',
                    'Người tạo': inv.creator || '',
                    'Ghi chú': inv.notes || '',
                    'Tổng tiền hàng': inv.totalAmount,
                    'Giảm giá hóa đơn': inv.discountAmount,
                    'Khách cần trả': inv.amountDue || 0,
                    'Khách đã trả': inv.amountPaid,
                    'Tiền mặt': inv.cashAmount || 0,
                    'Thẻ': inv.cardAmount || 0,
                    'Ví': inv.walletAmount || 0,
                    'Chuyển khoản': inv.transferAmount || 0,
                    'Trạng thái': STATUS_LABELS[inv.status] || inv.status,
                };

                if (inv.items && inv.items.length > 0) {
                    inv.items.forEach((item) => {
                        exportData.push({
                            ...baseRow,
                            'Mã hàng': item.productCode || '',
                            'Mã vạch': item.barcode || '',
                            'Tên hàng': item.productName || '',
                            'Thương hiệu': item.brand || '',
                            'ĐVT': item.unit || '',
                            'Ghi chú hàng hóa': item.notes || '',
                            'Số lượng': item.quantity,
                            'Đơn giá': item.unitPrice,
                            'Giảm giá %': item.discountPercent || 0,
                            'Giảm giá': item.discountAmount || 0,
                            'Giá bán': item.salePrice || 0,
                            'Thành tiền': item.totalPrice,
                        });
                    });
                } else {
                    exportData.push({
                        ...baseRow,
                        'Mã hàng': '',
                        'Mã vạch': '',
                        'Tên hàng': '',
                        'Thương hiệu': '',
                        'ĐVT': '',
                        'Ghi chú hàng hóa': '',
                        'Số lượng': 0,
                        'Đơn giá': 0,
                        'Giảm giá %': 0,
                        'Giảm giá': 0,
                        'Giá bán': 0,
                        'Thành tiền': 0,
                    });
                }
            });

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Hóa đơn chi tiết');
            XLSX.writeFile(wb, `hoa_don_chi_tiet_${new Date().toISOString().split('T')[0]}.xlsx`);
        }

        toast.success('Xuất file thành công');
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await invoicesAPI.delete(deleteId);
            toast.success('Xóa hóa đơn thành công');
            setDeleteId(null);
            fetchInvoices();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Lỗi xóa hóa đơn');
        }
    };

    const openDetail = async (invoice: Invoice) => {
        try {
            const response = await invoicesAPI.getOne(invoice.id);
            setSelectedInvoice({
                ...response.data,
                id: response.data.id.toString(),
            });
            setShowDetailModal(true);
        } catch (error) {
            toast.error('Không thể tải chi tiết hóa đơn');
        }
    };

    // Toggle expandable row
    const toggleExpand = async (invoiceId: string) => {
        if (expandedId === invoiceId) {
            setExpandedId(null);
            setExpandedInvoiceDetail(null);
        } else {
            try {
                console.log('Fetching invoice detail for id:', invoiceId);
                const response = await invoicesAPI.getOne(invoiceId);
                console.log('API response:', response);

                // Data is nested: response.data.data
                const invoiceData = response.data.data || response.data;
                console.log('Invoice data:', invoiceData);
                console.log('totalAmount:', invoiceData.totalAmount);

                setExpandedInvoiceDetail({
                    ...invoiceData,
                    id: invoiceData.id?.toString() || invoiceId,
                    items: Array.isArray(invoiceData.items)
                        ? invoiceData.items.map((item: any) => ({
                            ...item,
                            id: item.id?.toString(),
                        }))
                        : [],
                });
                setExpandedId(invoiceId);
            } catch (error: any) {
                console.error('Toggle expand error:', error);
                console.error('Error response:', error.response?.data);
                toast.error('Không thể tải chi tiết hóa đơn');
            }
        }
    };

    const activeFiltersCount = () => {
        let count = 0;
        if (statusFilter.length !== 2) count++;
        if (eInvoiceStatus) count++;
        if (paymentMethod) count++;
        if (creator) count++;
        if (seller) count++;
        if (priceList) count++;
        if (salesChannel) count++;
        if (timeFilter !== 'all') count++;
        return count;
    };

    return (
        <div className="invoice-list">
            <Toast toasts={toast.toasts} onRemove={toast.removeToast} />

            {/* Header */}
            <div className="invoice-header">
                <h2>Hóa đơn</h2>
                <div className="header-actions">
                    <div className="search-box">
                        <MdSearch className="search-icon" />
                        <input
                            type="text"
                            placeholder="Theo mã hóa đơn"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                    <button
                        className={`btn-filter ${showFilterPanel ? 'active' : ''}`}
                        onClick={() => setShowFilterPanel(!showFilterPanel)}
                    >
                        <MdFilterList />
                        {activeFiltersCount() > 0 && (
                            <span className="filter-badge">{activeFiltersCount()}</span>
                        )}
                    </button>
                    <button className="btn-primary" onClick={() => setShowAddModal(true)}>
                        <MdAdd /> Hóa đơn
                    </button>
                    <button className="btn-secondary" onClick={handleImportClick}>
                        <MdFileUpload /> Import file
                    </button>
                    <div className="export-dropdown">
                        <button
                            className="btn-secondary"
                            onClick={() => setShowExportMenu(!showExportMenu)}
                        >
                            <MdFileDownload /> Xuất file <MdExpandMore />
                        </button>
                        {showExportMenu && (
                            <div className="export-menu">
                                <button onClick={() => handleExport('summary')}>
                                    Xuất tổng quan
                                </button>
                                <button onClick={() => handleExport('detailed')}>
                                    Xuất chi tiết
                                </button>
                            </div>
                        )}
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileChange}
                    />
                </div>
            </div>

            <div className="invoice-content">
                {/* Filter Panel */}
                {showFilterPanel && (
                    <div className="filter-panel">
                        <div className="filter-panel-header">
                            <h3>Hóa đơn</h3>
                            <button onClick={() => setShowFilterPanel(false)}>
                                <MdClose />
                            </button>
                        </div>

                        <div className="filter-group">
                            <label>Thời gian</label>
                            <div className="radio-group">
                                <label className="radio-label">
                                    <input
                                        type="radio"
                                        name="time"
                                        checked={timeFilter === 'thisMonth'}
                                        onChange={() => handleTimeFilterChange('thisMonth')}
                                    />
                                    Tháng này
                                </label>
                                <label className="radio-label">
                                    <input
                                        type="radio"
                                        name="time"
                                        checked={timeFilter === 'custom'}
                                        onChange={() => handleTimeFilterChange('custom')}
                                    />
                                    Tùy chỉnh
                                </label>
                            </div>
                            {timeFilter === 'custom' && (
                                <div className="date-range">
                                    <input
                                        type="date"
                                        value={dateFrom}
                                        onChange={(e) => setDateFrom(e.target.value)}
                                    />
                                    <span>-</span>
                                    <input
                                        type="date"
                                        value={dateTo}
                                        onChange={(e) => setDateTo(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="filter-group">
                            <label>Trạng thái</label>
                            <div className="checkbox-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={statusFilter.includes('COMPLETED')}
                                        onChange={() => handleStatusChange('COMPLETED')}
                                    />
                                    Hoàn thành
                                </label>
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={statusFilter.includes('CANCELLED')}
                                        onChange={() => handleStatusChange('CANCELLED')}
                                    />
                                    Đã hủy
                                </label>
                            </div>
                        </div>

                        <div className="filter-group">
                            <label>Trạng thái HĐĐT</label>
                            <select
                                value={eInvoiceStatus}
                                onChange={(e) => setEInvoiceStatus(e.target.value)}
                            >
                                <option value="">Chọn trạng thái</option>
                                <option value="PENDING">Chờ phát hành</option>
                                <option value="ISSUED">Đã phát hành</option>
                                <option value="CANCELLED">Đã hủy</option>
                            </select>
                        </div>

                        <div className="filter-group">
                            <label>Phương thức thanh toán</label>
                            <select
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                            >
                                <option value="">Chọn phương thức thanh toán</option>
                                {filterOptions.paymentMethods.map((pm) => (
                                    <option key={pm} value={pm}>
                                        {pm}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-group">
                            <label>Người tạo</label>
                            <select value={creator} onChange={(e) => setCreator(e.target.value)}>
                                <option value="">Chọn người tạo</option>
                                {filterOptions.creators.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-group">
                            <label>Người bán</label>
                            <select value={seller} onChange={(e) => setSeller(e.target.value)}>
                                <option value="">Chọn người bán</option>
                                {filterOptions.sellers.map((s) => (
                                    <option key={s} value={s}>
                                        {s}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-group">
                            <label>Bảng giá</label>
                            <select
                                value={priceList}
                                onChange={(e) => setPriceList(e.target.value)}
                            >
                                <option value="">Chọn bảng giá</option>
                                {filterOptions.priceLists.map((p) => (
                                    <option key={p} value={p}>
                                        {p}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-group">
                            <label>Kênh bán</label>
                            <select
                                value={salesChannel}
                                onChange={(e) => setSalesChannel(e.target.value)}
                            >
                                <option value="">Chọn kênh bán</option>
                                {filterOptions.salesChannels.map((sc) => (
                                    <option key={sc} value={sc}>
                                        {sc}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="invoice-table-wrapper">
                    {loading ? (
                        <div className="invoice-loading">Đang tải...</div>
                    ) : invoices.length === 0 ? (
                        <div className="invoice-empty">
                            <MdInbox size={64} />
                            <p>Chưa có hóa đơn nào</p>
                        </div>
                    ) : (
                        <>
                            <table className="invoice-table">
                                <thead>
                                    <tr>
                                        <th>Mã hóa đơn</th>
                                        <th>Thời gian</th>
                                        <th>Mã trả hàng</th>
                                        <th>Mã KH</th>
                                        <th>Khách hàng</th>
                                        <th className="text-right">Tổng tiền hàng</th>
                                        <th className="text-right">Giảm giá</th>
                                        <th className="text-right">Khách đã trả</th>
                                        <th>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.map((invoice) => (
                                        <React.Fragment key={invoice.id}>
                                            <tr
                                                className={`invoice-row ${expandedId === invoice.id ? 'expanded' : ''}`}
                                                onClick={() => toggleExpand(invoice.id)}
                                            >
                                                <td>
                                                    <div className="invoice-number-cell">
                                                        <input
                                                            type="checkbox"
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                        <span className="expand-icon">
                                                            {expandedId === invoice.id ? '▼' : '▶'}
                                                        </span>
                                                        <span className="invoice-number">
                                                            {invoice.invoiceNumber}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>{formatDate(invoice.createdAt)}</td>
                                                <td>{invoice.returnOrderCode || '-'}</td>
                                                <td>{invoice.customerCode || '-'}</td>
                                                <td>{invoice.customerName || '-'}</td>
                                                <td className="text-right">
                                                    {formatCurrency(Number(invoice.totalAmount))}
                                                </td>
                                                <td className="text-right">
                                                    {formatCurrency(Number(invoice.discountAmount))}
                                                </td>
                                                <td className="text-right">
                                                    {formatCurrency(Number(invoice.amountPaid))}
                                                </td>
                                                <td className="actions" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        className="btn-icon edit"
                                                        title="Sửa"
                                                        onClick={() => {
                                                            setSelectedInvoice(invoice);
                                                            setShowEditModal(true);
                                                        }}
                                                    >
                                                        <MdEdit />
                                                    </button>
                                                    <button
                                                        className="btn-icon delete"
                                                        title="Xóa"
                                                        onClick={() => setDeleteId(invoice.id)}
                                                    >
                                                        <MdDelete />
                                                    </button>
                                                </td>
                                            </tr>
                                            {/* Expandable Detail Row */}
                                            {expandedId === invoice.id && expandedInvoiceDetail && (
                                                <tr className="invoice-detail-row">
                                                    <td colSpan={9}>
                                                        <div className="invoice-detail-panel">
                                                            {/* Header */}
                                                            <div className="detail-header">
                                                                <div className="detail-header-left">
                                                                    <h3>{expandedInvoiceDetail.customerName || 'Khách lẻ'}</h3>
                                                                    <a href="#" className="invoice-link">
                                                                        {expandedInvoiceDetail.invoiceNumber}
                                                                    </a>
                                                                    <span className={`status-badge ${STATUS_CLASSES[expandedInvoiceDetail.status]}`}>
                                                                        {STATUS_LABELS[expandedInvoiceDetail.status]}
                                                                    </span>
                                                                </div>
                                                                <div className="detail-header-right">
                                                                    <span className="branch-label">{expandedInvoiceDetail.branch || 'Chi nhánh trung tâm'}</span>
                                                                </div>
                                                            </div>

                                                            {/* Info Grid */}
                                                            <div className="detail-info-grid">
                                                                <div className="info-item">
                                                                    <label>Người tạo:</label>
                                                                    <span>{expandedInvoiceDetail.creator || 'Admin'}</span>
                                                                </div>
                                                                <div className="info-item">
                                                                    <label>Người bán:</label>
                                                                    <span>{expandedInvoiceDetail.seller || 'Admin'}</span>
                                                                </div>
                                                                <div className="info-item">
                                                                    <label>Ngày bán:</label>
                                                                    <span>{formatDate(expandedInvoiceDetail.issuedAt || expandedInvoiceDetail.createdAt)}</span>
                                                                </div>
                                                                <div className="info-item">
                                                                    <label>Kênh bán:</label>
                                                                    <span>{expandedInvoiceDetail.salesChannel || 'Bán trực tiếp'}</span>
                                                                </div>
                                                                <div className="info-item">
                                                                    <label>Bảng giá:</label>
                                                                    <span>{expandedInvoiceDetail.priceList || 'Bảng giá chung'}</span>
                                                                </div>
                                                            </div>

                                                            {/* Items Table */}
                                                            <div className="detail-items-section">
                                                                <table className="items-table">
                                                                    <thead>
                                                                        <tr>
                                                                            <th>Mã hàng</th>
                                                                            <th>Tên hàng</th>
                                                                            <th className="text-right">Số lượng</th>
                                                                            <th className="text-right">Đơn giá</th>
                                                                            <th className="text-right">Giảm giá</th>
                                                                            <th className="text-right">Giá bán</th>
                                                                            <th className="text-right">Thành tiền</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {expandedInvoiceDetail.items && expandedInvoiceDetail.items.length > 0 ? (
                                                                            expandedInvoiceDetail.items.map((item, idx) => (
                                                                                <tr key={idx}>
                                                                                    <td>
                                                                                        <a href="#" className="product-code">{item.productCode || '-'}</a>
                                                                                    </td>
                                                                                    <td>{item.productName || '-'}</td>
                                                                                    <td className="text-right">{Number(item.quantity)}</td>
                                                                                    <td className="text-right">{formatCurrency(Number(item.unitPrice))}</td>
                                                                                    <td className="text-right">{formatCurrency(Number(item.discountAmount || 0))}</td>
                                                                                    <td className="text-right">{formatCurrency(Number(item.salePrice || item.unitPrice))}</td>
                                                                                    <td className="text-right">{formatCurrency(Number(item.totalPrice))}</td>
                                                                                </tr>
                                                                            ))
                                                                        ) : (
                                                                            <tr>
                                                                                <td colSpan={7} className="text-center">Không có sản phẩm</td>
                                                                            </tr>
                                                                        )}
                                                                    </tbody>
                                                                </table>
                                                            </div>

                                                            {/* Notes and Totals */}
                                                            <div className="detail-footer">
                                                                <div className="notes-section">
                                                                    <div className="notes-box">
                                                                        <span className="notes-placeholder">{expandedInvoiceDetail.notes || 'Ghi chú...'}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="totals-section">
                                                                    <div className="total-row">
                                                                        <span className="label">Tổng tiền hàng ({expandedInvoiceDetail.items?.length || 0}):</span>
                                                                        <span className="value">{formatCurrency(parseFloat(expandedInvoiceDetail.totalAmount as any) || 0)}</span>
                                                                    </div>
                                                                    <div className="total-row">
                                                                        <span className="label">Giảm giá hóa đơn:</span>
                                                                        <span className="value">{formatCurrency(parseFloat(expandedInvoiceDetail.discountAmount as any) || 0)}</span>
                                                                    </div>
                                                                    <div className="total-row">
                                                                        <span className="label">Khách cần trả:</span>
                                                                        <span className="value">{formatCurrency(parseFloat(expandedInvoiceDetail.amountDue as any) || 0)}</span>
                                                                    </div>
                                                                    <div className="total-row grand">
                                                                        <span className="label">Khách đã trả:</span>
                                                                        <span className="value">{formatCurrency(parseFloat(expandedInvoiceDetail.amountPaid as any) || 0)}</span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Action Buttons */}
                                                            <div className="detail-actions">
                                                                <div className="left-actions">
                                                                    <button className="btn-action" onClick={() => setDeleteId(invoice.id)}>
                                                                        <MdCancel /> Hủy
                                                                    </button>
                                                                    <button className="btn-action">
                                                                        <MdContentCopy /> Sao chép
                                                                    </button>
                                                                    <button className="btn-action" onClick={() => handleExport('detailed')}>
                                                                        <MdFileDownload /> Xuất file
                                                                    </button>
                                                                </div>
                                                                <div className="right-actions">
                                                                    <button className="btn-primary-action">
                                                                        <MdEdit /> Chỉnh sửa
                                                                    </button>
                                                                    <button className="btn-secondary-action">
                                                                        <MdSave /> Lưu
                                                                    </button>
                                                                    <button className="btn-secondary-action">
                                                                        <MdUndo /> Trả hàng
                                                                    </button>
                                                                    <button className="btn-secondary-action">
                                                                        <MdPrint /> In
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>

                            {/* Pagination */}
                            <div className="invoice-pagination">
                                <div className="pagination-info">
                                    Hiển thị {(page - 1) * limit + 1} -{' '}
                                    {Math.min(page * limit, meta.total)} / {meta.total} hóa đơn
                                </div>
                                <div className="pagination-controls">
                                    <select
                                        value={limit}
                                        onChange={(e) => {
                                            setLimit(Number(e.target.value));
                                            setPage(1);
                                        }}
                                    >
                                        <option value={20}>20 / trang</option>
                                        <option value={50}>50 / trang</option>
                                        <option value={100}>100 / trang</option>
                                    </select>
                                    <div className="pagination-buttons">
                                        <button
                                            disabled={page <= 1}
                                            onClick={() => setPage((p) => p - 1)}
                                        >
                                            ← Trước
                                        </button>
                                        <span>
                                            {page} / {meta.totalPages}
                                        </span>
                                        <button
                                            disabled={page >= meta.totalPages}
                                            onClick={() => setPage((p) => p + 1)}
                                        >
                                            Sau →
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Delete Confirmation */}
            <Modal
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                title="Xác nhận xóa"
            >
                <div className="delete-confirm">
                    <p>Bạn có chắc chắn muốn xóa hóa đơn này?</p>
                    <div className="modal-actions">
                        <button className="btn-cancel" onClick={() => setDeleteId(null)}>
                            Hủy
                        </button>
                        <button className="btn-danger" onClick={handleDelete}>
                            Xóa
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Detail Modal */}
            <Modal
                isOpen={showDetailModal}
                onClose={() => {
                    setShowDetailModal(false);
                    setSelectedInvoice(null);
                }}
                title={`Chi tiết hóa đơn ${selectedInvoice?.invoiceNumber || ''}`}
            >
                {selectedInvoice && (
                    <div className="invoice-detail">
                        <div className="detail-grid">
                            <div className="detail-item">
                                <label>Mã hóa đơn:</label>
                                <span>{selectedInvoice.invoiceNumber}</span>
                            </div>
                            <div className="detail-item">
                                <label>Thời gian:</label>
                                <span>{formatDate(selectedInvoice.createdAt)}</span>
                            </div>
                            <div className="detail-item">
                                <label>Khách hàng:</label>
                                <span>{selectedInvoice.customerName || '-'}</span>
                            </div>
                            <div className="detail-item">
                                <label>Điện thoại:</label>
                                <span>{selectedInvoice.customerPhone || '-'}</span>
                            </div>
                            <div className="detail-item">
                                <label>Trạng thái:</label>
                                <span className={STATUS_CLASSES[selectedInvoice.status]}>
                                    {STATUS_LABELS[selectedInvoice.status]}
                                </span>
                            </div>
                            <div className="detail-item">
                                <label>Người bán:</label>
                                <span>{selectedInvoice.seller || '-'}</span>
                            </div>
                        </div>

                        {selectedInvoice.items && selectedInvoice.items.length > 0 && (
                            <div className="detail-items">
                                <h4>Danh sách sản phẩm</h4>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Mã hàng</th>
                                            <th>Tên hàng</th>
                                            <th>SL</th>
                                            <th>Đơn giá</th>
                                            <th>Thành tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedInvoice.items.map((item, idx) => (
                                            <tr key={idx}>
                                                <td>{item.productCode}</td>
                                                <td>{item.productName}</td>
                                                <td>{Number(item.quantity)}</td>
                                                <td>{formatCurrency(Number(item.unitPrice))}</td>
                                                <td>{formatCurrency(Number(item.totalPrice))}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="detail-totals">
                            <div className="total-row">
                                <span>Tổng tiền hàng:</span>
                                <span>{formatCurrency(Number(selectedInvoice.totalAmount))}đ</span>
                            </div>
                            <div className="total-row">
                                <span>Giảm giá:</span>
                                <span>-{formatCurrency(Number(selectedInvoice.discountAmount))}đ</span>
                            </div>
                            <div className="total-row grand">
                                <span>Khách đã trả:</span>
                                <span>{formatCurrency(Number(selectedInvoice.amountPaid))}đ</span>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button
                                className="btn-cancel"
                                onClick={() => {
                                    setShowDetailModal(false);
                                    setSelectedInvoice(null);
                                }}
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
