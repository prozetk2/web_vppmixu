import React, { useState, useEffect, useRef } from 'react';
import { invoicesAPI, salesAPI, settingsAPI } from '../../services/api';
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
    MdMoreHoriz,
    MdViewColumn,
    MdSettings,
    MdHelpOutline,
} from 'react-icons/md';
import * as XLSX from 'xlsx';
import './InvoiceList.css';
import CreateInvoiceModal from './CreateInvoiceModal';
import EditInvoiceModal from './EditInvoiceModal';

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

interface InvoiceListProps {
    onEditInPOS?: (invoiceData: any) => void;
}

const PRINT_TEMPLATE_DEFAULTS = {
    logoText: 'MIXU',
    logoSub: 'OFFICE SUPPLIES',
    companyName: 'CÔNG TY TNHH MTV TM VÀ DV MIXU',
    address: '119 Nguyễn Hữu Thọ, Q. Hải Châu, Tp. Đà Nẵng',
    phone: '0932.542.168 - 0934.792.168',
    website: 'mixuoffice.com',
    email: 'mixuoffice@gmail.com',
};

const escapeHtml = (value: string | number | null | undefined) => {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

export default function InvoiceList({ onEditInPOS }: InvoiceListProps) {
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
            // Detailed export - clean columns
            const exportData: any[] = [];

            invoices.forEach((inv) => {
                const baseRow = {
                    'Chi nhánh': inv.branch || '',
                    'Mã hóa đơn': inv.invoiceNumber,
                    'Thời gian': formatDate(inv.issuedAt || inv.createdAt),
                    'Mã khách hàng': inv.customerCode || '',
                    'Tên khách hàng': inv.customerName || '',
                    'Điện thoại': inv.customerPhone || '',
                    'Địa chỉ': inv.customerAddress || '',
                    'Trạng thái': STATUS_LABELS[inv.status] || inv.status,
                };

                if (inv.items && inv.items.length > 0) {
                    inv.items.forEach((item) => {
                        exportData.push({
                            ...baseRow,
                            'Mã hàng': item.productCode || '',
                            'Tên hàng': item.productName || '',
                            'ĐVT': item.unit || '',
                            'Số lượng': item.quantity,
                            'Đơn giá': item.unitPrice,
                            'Giảm giá': item.discountAmount || 0,
                            'Giá bán': item.salePrice || item.unitPrice,
                            'Thành tiền': item.totalPrice,
                        });
                    });
                } else {
                    exportData.push({
                        ...baseRow,
                        'Mã hàng': '',
                        'Tên hàng': '',
                        'ĐVT': '',
                        'Số lượng': 0,
                        'Đơn giá': 0,
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



    // Print invoice using the unified sales document layout
    const handlePrintInvoice = async (invoice: Invoice) => {
        try {
            // Fetch invoice detail and settings in parallel
            const [invoiceResponse, settingsResponse] = await Promise.all([
                invoicesAPI.getOne(invoice.id),
                settingsAPI.get()
            ]);
            const detail = invoiceResponse.data.data || invoiceResponse.data;
            const settings = settingsResponse.data || {};

            // Create print window
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                toast.error('Không thể mở cửa sổ in. Vui lòng cho phép popup.');
                return;
            }

            const items = detail.items || [];
            const now = new Date();
            const printTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} ${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear().toString().slice(-2)}`;
            const invoiceDate = new Date(invoice.createdAt);
            const invoiceDateStr = `${invoiceDate.getDate().toString().padStart(2, '0')}/${(invoiceDate.getMonth() + 1).toString().padStart(2, '0')}/${invoiceDate.getFullYear()} ${invoiceDate.getHours().toString().padStart(2, '0')}:${invoiceDate.getMinutes().toString().padStart(2, '0')}`;
            const totalDue = Number(detail.amountDue) || (Number(detail.totalAmount) - Number(detail.discountAmount));
            const storeInfo = {
                ...PRINT_TEMPLATE_DEFAULTS,
                companyName: settings.companyName || PRINT_TEMPLATE_DEFAULTS.companyName,
                address: settings.companyAddress || PRINT_TEMPLATE_DEFAULTS.address,
                phone: settings.companyPhone || PRINT_TEMPLATE_DEFAULTS.phone,
                website: settings.companyWebsite || PRINT_TEMPLATE_DEFAULTS.website,
                email: settings.companyEmail || PRINT_TEMPLATE_DEFAULTS.email,
            };
            const printField = (value?: string | null, fallback: string = '&nbsp;') => {
                const normalized = typeof value === 'string' ? value.trim() : '';
                return normalized ? escapeHtml(normalized) : fallback;
            };
            const itemRows = items.length > 0
                ? items.map((item: InvoiceItem, index: number) => `
                    <tr class="item-row">
                        <td class="text-center">${index + 1}</td>
                        <td>${printField(item.productName, '-')}</td>
                        <td class="text-center">${printField(item.unit, 'Cái')}</td>
                        <td class="text-center">${escapeHtml(item.quantity)}</td>
                        <td class="text-right">${escapeHtml(formatCurrency(Number(item.unitPrice)))}</td>
                        <td class="text-right">${escapeHtml(formatCurrency(Number(item.totalPrice)))}</td>
                    </tr>
                `).join('')
                : `
                    <tr class="item-row empty-state-row">
                        <td colspan="6" class="text-center">Không có sản phẩm</td>
                    </tr>
                `;

            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Hóa đơn ${escapeHtml(invoice.invoiceNumber)}</title>
                    <style>
                        @media print {
                            @page { margin: 12mm; size: A4; }
                            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        }
                        * { box-sizing: border-box; margin: 0; padding: 0; }
                        body { 
                            font-family: 'Times New Roman', Times, serif; 
                            font-size: 13px;
                            line-height: 1.3;
                            padding: 0;
                            color: #000;
                        }

                        .print-template {
                            width: 100%;
                        }

                        .print-topbar {
                            display: flex;
                            justify-content: space-between;
                            font-size: 12px;
                            color: #666;
                            margin-bottom: 12px;
                        }

                        .print-header-centered {
                            text-align: center;
                            margin-bottom: 10px;
                        }

                        .store-name-centered {
                            color: #65a30d;
                            font-size: 28px;
                            font-weight: bold;
                            margin-bottom: 5px;
                        }

                        .store-name-centered small {
                            color: #555;
                            font-size: 14px;
                            font-weight: normal;
                            margin-left: 6px;
                        }

                        .company-name-centered {
                            font-size: 19px;
                            font-weight: bold;
                            margin-bottom: 6px;
                            text-transform: uppercase;
                        }

                        .company-details-centered {
                            font-size: 15px;
                            line-height: 1.6;
                        }

                        .label-red {
                            color: #c00000;
                            font-weight: bold;
                        }

                        .print-invoice-title {
                            text-align: center;
                            font-size: 24px;
                            font-weight: bold;
                            margin: 20px 0;
                            text-transform: uppercase;
                        }

                        .print-order-section {
                            display: flex;
                            justify-content: space-between;
                            align-items: flex-start;
                            width: 86%;
                            margin-bottom: 15px;
                            padding-bottom: 10px;
                            border-bottom: 1px solid #000;
                            margin-left: auto;
                            margin-right: auto;
                        }

                        .print-order-section .order-left {
                            font-size: 14px;
                        }

                        .customer-info-print {
                            width: 86%;
                            margin-bottom: 15px;
                            margin-left: auto;
                            margin-right: auto;
                            font-size: 15px;
                        }

                        .customer-info-print .row {
                            display: flex;
                            align-items: flex-start;
                            margin-bottom: 4px;
                        }

                        .customer-info-print .label {
                            width: 100px;
                            flex-shrink: 0;
                            font-weight: bold;
                        }

                        .customer-info-print .value {
                            flex: 1;
                            min-height: 1em;
                        }

                        .print-table {
                            width: 86%;
                            border-collapse: collapse;
                            margin-bottom: 15px;
                            margin-left: auto;
                            margin-right: auto;
                            table-layout: auto;
                        }

                        .print-table thead {
                            display: table-header-group;
                        }

                        .print-table tbody {
                            display: table-row-group;
                        }

                        .print-table tr {
                            display: table-row !important;
                            break-inside: avoid;
                            page-break-inside: avoid;
                        }

                        .print-table th,
                        .print-table td {
                            display: table-cell !important;
                            border: 1px solid #000;
                            padding: 5px 8px;
                            vertical-align: middle;
                        }

                        .print-table th {
                            font-weight: bold;
                            text-align: center;
                            padding-top: 8px;
                            padding-bottom: 8px;
                        }

                        .invoice-print-table .col-stt-print { width: 7%; }
                        .invoice-print-table .col-name-print { width: 39%; }
                        .invoice-print-table .col-unit-print { width: 10%; }
                        .invoice-print-table .col-qty-print { width: 8%; }
                        .invoice-print-table .col-price-print { width: 18%; }
                        .invoice-print-table .col-total-print { width: 18%; }

                        .invoice-print-table tbody tr.item-row td {
                            line-height: 1.25;
                            padding-top: 6px;
                            padding-bottom: 6px;
                        }

                        .invoice-print-table tbody tr.item-row td:nth-child(2) {
                            text-align: left;
                            overflow-wrap: break-word;
                        }

                        .invoice-print-table tbody tr.item-row td:nth-child(1),
                        .invoice-print-table tbody tr.item-row td:nth-child(3),
                        .invoice-print-table tbody tr.item-row td:nth-child(4),
                        .invoice-print-table tbody tr.item-row td:nth-child(5),
                        .invoice-print-table tbody tr.item-row td:nth-child(6),
                        .invoice-print-table tbody tr.summary-row td:last-child {
                            white-space: nowrap;
                        }

                        .invoice-print-table .summary-label {
                            padding-right: 14px;
                            white-space: nowrap;
                        }

                        .empty-state-row td {
                            padding: 20px;
                            color: #666;
                        }

                        .text-center { text-align: center; }
                        .text-right { text-align: right; }
                        .total-amount {
                            color: #c00000;
                        }

                        .print-footer {
                            display: flex;
                            justify-content: space-between;
                            width: 86%;
                            margin: 30px auto 50px;
                            break-inside: avoid;
                            page-break-inside: avoid;
                        }

                        .signature-block {
                            width: 33.333%;
                            text-align: center;
                        }

                        .signature-block .role {
                            font-weight: bold;
                            font-size: 15px;
                            margin-bottom: 40px;
                        }

                        .print-footer-url {
                            display: flex;
                            justify-content: space-between;
                            gap: 16px;
                            width: 86%;
                            margin: 0 auto;
                            padding-top: 5px;
                            border-top: 1px solid #ccc;
                            font-size: 13px;
                            color: #666;
                            break-inside: avoid;
                            page-break-inside: avoid;
                        }
                    </style>
                </head>
                <body>
                    <div class="print-template">
                        <div class="print-topbar">
                            <span>${escapeHtml(printTime)}</span>
                            <span>Chi nhánh trung tâm - Bán hàng</span>
                        </div>

                        <div class="print-header-centered">
                            <div class="store-name-centered">
                                ${escapeHtml(storeInfo.logoText)}
                                <small>${escapeHtml(storeInfo.logoSub)}</small>
                            </div>
                            <div class="company-name-centered">${escapeHtml(storeInfo.companyName)}</div>
                            <div class="company-details-centered">
                                <span class="label-red">A</span> - ${escapeHtml(storeInfo.address)}.<br>
                                <span class="label-red">T</span> - ${escapeHtml(storeInfo.phone)}.<br>
                                <span class="label-red">W</span> - ${escapeHtml(storeInfo.website)} - <span class="label-red">E</span> - ${escapeHtml(storeInfo.email)}.
                            </div>
                        </div>

                        <div class="print-invoice-title">HÓA ĐƠN BÁN HÀNG</div>

                        <div class="print-order-section">
                            <div class="order-left">
                                <span>Mã đơn hàng: <strong>${escapeHtml(invoice.invoiceNumber)}</strong></span><br>
                                <span>${escapeHtml(invoiceDateStr)}</span>
                            </div>
                        </div>

                        <div class="customer-info-print">
                            <div class="row">
                                <span class="label">Khách hàng:</span>
                                <span class="value">${printField(detail.customerName || invoice.customerName || 'Khách lẻ', 'Khách lẻ')}</span>
                            </div>
                            <div class="row">
                                <span class="label">Số điện thoại:</span>
                                <span class="value">${printField(detail.customerPhone || invoice.customerPhone)}</span>
                            </div>
                            <div class="row">
                                <span class="label">Địa chỉ:</span>
                                <span class="value">${printField(detail.customerAddress || invoice.customerAddress)}</span>
                            </div>
                        </div>

                        <table class="print-table invoice-print-table">
                            <colgroup>
                                <col class="col-stt-print">
                                <col class="col-name-print">
                                <col class="col-unit-print">
                                <col class="col-qty-print">
                                <col class="col-price-print">
                                <col class="col-total-print">
                            </colgroup>
                            <thead>
                                <tr>
                                    <th>STT</th>
                                    <th>Tên hàng</th>
                                    <th>DVT</th>
                                    <th>SL</th>
                                    <th>Đơn giá</th>
                                    <th>Thành tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemRows}
                                <tr class="summary-row">
                                    <td colspan="5" class="text-right summary-label"><strong>Số tiền cần phải thanh toán:</strong></td>
                                    <td class="text-right total-amount"><strong>${escapeHtml(formatCurrency(totalDue))}</strong></td>
                                </tr>
                            </tbody>
                        </table>

                        <div class="print-footer">
                            <div class="signature-block">
                                <div class="role">Người mua hàng</div>
                            </div>
                            <div class="signature-block">
                                <div class="role">Đã thanh toán</div>
                            </div>
                            <div class="signature-block">
                                <div class="role">Người bán hàng</div>
                            </div>
                        </div>

                        <div class="print-footer-url">
                            <span>https://vppmixuri.com/</span>
                            <span>1/1</span>
                        </div>
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();

            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
            }, 250);
        } catch (error) {
            toast.error('Không thể in hóa đơn');
        }
    };

    // Return invoice
    const handleReturnInvoice = async (invoice: Invoice) => {
        if (invoice.status === 'RETURNED') {
            toast.error('Hóa đơn này đã được trả hàng rồi');
            return;
        }

        if (!confirm(`Xác nhận trả hàng cho hóa đơn ${invoice.invoiceNumber}?`)) {
            return;
        }

        try {
            await salesAPI.returnOrder(invoice.id, `Trả hàng từ danh sách hóa đơn`);
            toast.success(`Trả hàng thành công: ${invoice.invoiceNumber} `);
            fetchInvoices();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Không thể trả hàng');
        }
    };

    return (
        <div className="invoice-list">
            <Toast toasts={toast.toasts} onRemove={toast.removeToast} />

            {/* Header */}
            {/* Header */}
            <div className="page-header">
                <h2>Hóa đơn</h2>
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
                <div className="header-actions">
                    <div className="header-actions">
                        <button
                            className={`btn - secondary ${showFilterPanel ? 'active' : ''} `}
                            onClick={() => setShowFilterPanel(!showFilterPanel)}
                        >
                            <MdFilterList />
                        </button>
                        <button className="btn-outline-primary" onClick={() => setShowAddModal(true)} style={{ fontWeight: 'bold', color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}>
                            <MdAdd /> Hóa đơn
                        </button>
                        <button className="btn-secondary" onClick={handleImportClick}>
                            <MdFileUpload /> Import file
                        </button>
                        <div className="export-dropdown" style={{ position: 'relative' }}>
                            <button
                                className="btn-secondary"
                                onClick={() => setShowExportMenu(!showExportMenu)}
                            >
                                <MdFileDownload /> Xuất file {showExportMenu ? <MdExpandMore style={{ transform: 'rotate(180deg)' }} /> : <MdExpandMore />}
                            </button>
                            {showExportMenu && (
                                <div className="export-menu" style={{ position: 'absolute', top: '100%', right: 0, zIndex: 100 }}>
                                    <button onClick={() => handleExport('summary')}>
                                        Xuất tổng quan
                                    </button>
                                    <button onClick={() => handleExport('detailed')}>
                                        Xuất chi tiết
                                    </button>
                                </div>
                            )}
                        </div>

                        <button className="btn-icon">
                            <MdMoreHoriz />
                        </button>
                        <button className="btn-icon">
                            <MdViewColumn />
                        </button>
                        <button className="btn-icon">
                            <MdSettings />
                        </button>
                        <button className="btn-icon">
                            <MdHelpOutline />
                        </button>

                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            accept=".xlsx,.xls,.csv"
                            onChange={handleFileChange}
                        />
                    </div>
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
                                                className={`invoice - row ${expandedId === invoice.id ? 'expanded' : ''} `}
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
                                                        className="btn-icon print"
                                                        title="In hóa đơn"
                                                        onClick={() => handlePrintInvoice(invoice)}
                                                    >
                                                        <MdPrint />
                                                    </button>
                                                    {invoice.status === 'COMPLETED' && (
                                                        <button
                                                            className="btn-icon return"
                                                            title="Trả hàng"
                                                            onClick={() => handleReturnInvoice(invoice)}
                                                        >
                                                            <MdUndo />
                                                        </button>
                                                    )}
                                                    <button
                                                        className="btn-icon edit"
                                                        title="Sửa tại trang Bán hàng"
                                                        onClick={async () => {
                                                            if (onEditInPOS) {
                                                                try {
                                                                    // Fetch full invoice detail
                                                                    const response = await invoicesAPI.getOne(invoice.id);
                                                                    const detail = response.data.data || response.data;
                                                                    onEditInPOS({
                                                                        invoiceId: detail.id,
                                                                        invoiceNumber: detail.invoiceNumber,
                                                                        items: detail.items || [],
                                                                        customerId: detail.customerCode,
                                                                        customerName: detail.customerName,
                                                                        discountAmount: detail.discountAmount || 0,
                                                                        totalAmount: detail.totalAmount,
                                                                        status: detail.status,
                                                                    });
                                                                } catch (error) {
                                                                    console.error('Failed to fetch invoice detail:', error);
                                                                    toast.error('Không thể tải chi tiết hóa đơn');
                                                                }
                                                            } else {
                                                                setSelectedInvoice(invoice);
                                                                setShowEditModal(true);
                                                            }
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
                                                                    <span className={`status - badge ${STATUS_CLASSES[expandedInvoiceDetail.status]} `}>
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
                                                                    {onEditInPOS && (
                                                                        <button
                                                                            className="btn-edit-pos"
                                                                            onClick={() => {
                                                                                const invoiceToEdit = expandedInvoiceDetail || invoice;
                                                                                onEditInPOS({
                                                                                    invoiceId: invoiceToEdit.id,
                                                                                    invoiceNumber: invoiceToEdit.invoiceNumber,
                                                                                    items: invoiceToEdit.items || [],
                                                                                    customerId: invoiceToEdit.customerCode,
                                                                                    customerName: invoiceToEdit.customerName,
                                                                                    discountAmount: invoiceToEdit.discountAmount || 0,
                                                                                    totalAmount: invoiceToEdit.totalAmount,
                                                                                    status: invoiceToEdit.status,
                                                                                });
                                                                            }}
                                                                        >
                                                                            <MdEdit /> Sửa tại Bán hàng
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        className="btn-primary-action"
                                                                        onClick={() => {
                                                                            setSelectedInvoice(expandedInvoiceDetail || invoice);
                                                                            setShowEditModal(true);
                                                                        }}
                                                                    >
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
                title={`Chi tiết hóa đơn ${selectedInvoice?.invoiceNumber || ''} `}
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


            <CreateInvoiceModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSuccess={() => {
                    fetchInvoices();
                }}
            />

            <EditInvoiceModal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                onSuccess={() => {
                    fetchInvoices();
                }}
                invoice={selectedInvoice}
            />
        </div>
    );
}
