import React, { useState, useEffect, useRef } from 'react';
import { suppliersAPI } from '../../services/api';
import Modal from '../shared/Modal';
import { Toast, useToast } from '../shared/Toast';
import XLSX from 'xlsx-js-style';
import {
    MdLocalShipping,
    MdSearch,
    MdFilterList,
    MdDownload,
    MdAdd,
    MdEdit,
    MdDelete,
    MdClose,
    MdCheck,
    MdHourglassEmpty,
    MdBlock,
    MdNotes,
    MdExpandMore,
    MdExpandLess
} from 'react-icons/md';
import './SupplierList.css';

interface Supplier {
    id: string;
    code?: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    taxNumber?: string;
    area?: string;
    ward?: string;
    notes?: string;
    supplierGroup?: string;
    company?: string;
    creator?: string;
    totalPurchase?: number;
    currentDebt?: number;
    totalPurchaseAfterReturn?: number;
    active?: boolean;
    createdAt: string;
}

interface FormData {
    code: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    taxNumber: string;
    area: string;
    ward: string;
    notes: string;
    supplierGroup: string;
    company: string;
    active: boolean;
}

interface FilterState {
    search: string;
    status: 'all' | 'active' | 'inactive';
    totalPurchaseFrom: string;
    totalPurchaseTo: string;
    currentDebtFrom: string;
    currentDebtTo: string;
    dateFrom: string;
    dateTo: string;
    timeFilter: 'all' | 'custom';
}

interface PurchaseOrder {
    id: string;
    orderNumber: string;
    createdAt: string;
    totalAmount: number;
    status: string;
    note?: string;
}

export default function SupplierList() {
    const createEmptyFormData = (): FormData => ({
        code: '',
        name: '',
        email: '',
        phone: '',
        address: '',
        taxNumber: '',
        area: '',
        ward: '',
        notes: '',
        supplierGroup: '',
        company: '',
        active: true,
    });

    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [formData, setFormData] = useState<FormData>(createEmptyFormData());
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // Expandable row state
    const [expandedSupplierId, setExpandedSupplierId] = useState<string | null>(null);
    const [activeDetailTab, setActiveDetailTab] = useState<'info' | 'history' | 'debt'>('info');

    // Form collapsible sections
    const [formSections, setFormSections] = useState({
        address: true,
        groupNotes: true,
        invoice: true
    });

    const toggleFormSection = (section: 'address' | 'groupNotes' | 'invoice') => {
        setFormSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    // Purchase history for expanded supplier
    const [supplierPurchases, setSupplierPurchases] = useState<PurchaseOrder[]>([]);
    const [loadingPurchases, setLoadingPurchases] = useState(false);
    const [debtFilter, setDebtFilter] = useState<'all' | 'pending' | 'paid'>('all');

    // Debt action modals
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);
    const [discountModalOpen, setDiscountModalOpen] = useState(false);
    const [selectedSupplierForDebt, setSelectedSupplierForDebt] = useState<Supplier | null>(null);

    // Payment form state
    const [paymentForm, setPaymentForm] = useState({
        dateTime: new Date().toISOString().slice(0, 16),
        payer: 'Mixu',
        paymentMethod: 'cash',
        amount: '',
        note: '',
        allocateToPurchases: true
    });

    // Adjustment form state
    const [adjustmentForm, setAdjustmentForm] = useState({
        adjustDate: '',
        adjustAmount: '',
        description: ''
    });

    // Discount form state
    const [discountForm, setDiscountForm] = useState({
        dateTime: new Date().toISOString().slice(0, 16),
        executor: 'Mixu',
        discountAmount: '',
        note: '',
        allocateToPurchases: false
    });

    // Export Debt Modal state
    const [exportDebtModalOpen, setExportDebtModalOpen] = useState(false);
    const [exportDebtTimePeriod, setExportDebtTimePeriod] = useState('this_month');
    const [exportDebtFields, setExportDebtFields] = useState({
        detailRows: true,
        dvt: true,
        soLuong: true,
        donGia: true,
        giamGia: true,
        vat: true,
        giaNhapTra: true,
        thanhTien: true,
        ghiChu: true
    });

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalSuppliers, setTotalSuppliers] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    // Filters
    const [filters, setFilters] = useState<FilterState>({
        search: '',
        status: 'all',
        totalPurchaseFrom: '',
        totalPurchaseTo: '',
        currentDebtFrom: '',
        currentDebtTo: '',
        dateFrom: '',
        dateTo: '',
        timeFilter: 'all',
    });

    // Import
    const [importing, setImporting] = useState(false);
    const [importNote, setImportNote] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const toast = useToast();

    useEffect(() => {
        fetchSuppliers();
    }, [currentPage, itemsPerPage]);

    const fetchSuppliers = async () => {
        setLoading(true);
        try {
            const params: Record<string, unknown> = {
                page: currentPage,
                limit: itemsPerPage,
            };

            if (filters.search) params.search = filters.search;
            if (filters.totalPurchaseFrom) params.totalPurchaseFrom = filters.totalPurchaseFrom;
            if (filters.totalPurchaseTo) params.totalPurchaseTo = filters.totalPurchaseTo;
            if (filters.currentDebtFrom) params.currentDebtFrom = filters.currentDebtFrom;
            if (filters.currentDebtTo) params.currentDebtTo = filters.currentDebtTo;
            if (filters.timeFilter === 'custom') {
                if (filters.dateFrom) params.dateFrom = filters.dateFrom;
                if (filters.dateTo) params.dateTo = filters.dateTo;
            }

            const response = await suppliersAPI.getAll(params);
            const result = response.data;

            if (result.data) {
                setSuppliers(result.data.map((s: any) => ({ ...s, id: s.id.toString() })));
                setTotalPages(result.meta?.totalPages || 1);
                setTotalSuppliers(result.meta?.total || 0);
            } else {
                // Fallback for old API format
                setSuppliers((result || []).map((s: any) => ({ ...s, id: s.id.toString() })));
            }
        } catch (error) {
            console.error('Failed to fetch suppliers:', error);
            toast.error('Không thể tải danh sách nhà cung cấp');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        setCurrentPage(1);
        fetchSuppliers();
    };

    const handleClearFilters = () => {
        setFilters({
            search: '',
            status: 'all',
            totalPurchaseFrom: '',
            totalPurchaseTo: '',
            currentDebtFrom: '',
            currentDebtTo: '',
            dateFrom: '',
            dateTo: '',
            timeFilter: 'all',
        });
        setCurrentPage(1);
        setTimeout(fetchSuppliers, 0);
    };

    // Toggle expand row
    const toggleExpandRow = async (supplierId: string) => {
        if (expandedSupplierId === supplierId) {
            setExpandedSupplierId(null);
            setSupplierPurchases([]);
        } else {
            setExpandedSupplierId(supplierId);
            setActiveDetailTab('info');
            // Fetch purchases for this supplier
            fetchSupplierPurchases(supplierId);
        }
    };

    const fetchSupplierPurchases = async (supplierId: string) => {
        setLoadingPurchases(true);
        try {
            const response = await suppliersAPI.getPurchases(supplierId);
            const purchases = response.data?.data || response.data || [];
            setSupplierPurchases(purchases.map((p: any) => ({
                id: p.id?.toString(),
                orderNumber: p.orderNumber || `PN${p.id}`,
                createdAt: p.createdAt,
                totalAmount: parseFloat(p.totalAmount) || 0,
                status: p.status,
                note: p.note
            })));
        } catch (error) {
            console.error('Failed to fetch supplier purchases:', error);
            setSupplierPurchases([]);
        } finally {
            setLoadingPurchases(false);
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const formatDateTime = (dateString: string) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' +
            date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    const exportPurchaseHistory = (supplier: Supplier) => {
        if (supplierPurchases.length === 0) {
            toast.error('Không có dữ liệu để xuất');
            return;
        }

        const exportData = supplierPurchases.map(purchase => ({
            'Mã phiếu': purchase.orderNumber,
            'Thời gian': formatDateTime(purchase.createdAt),
            'Chi nhánh': supplier.company || 'Chi nhánh trung tâm',
            'Nhà cung cấp': supplier.name,
            'Người tạo': 'Mixu',
            'Tổng cộng': purchase.totalAmount,
            'Trạng thái': purchase.status === 'CONFIRMED' ? 'Đã nhập hàng' :
                purchase.status === 'PENDING' ? 'Chờ xác nhận' :
                    purchase.status === 'CANCELLED' ? 'Đã hủy' : purchase.status,
            'Mô tả': purchase.note || ''
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Lịch sử nhập hàng');

        // Auto-fit column widths
        const colWidths = [
            { wch: 12 },  // Mã phiếu
            { wch: 18 },  // Thời gian
            { wch: 20 },  // Chi nhánh
            { wch: 20 },  // Nhà cung cấp
            { wch: 12 },  // Người tạo
            { wch: 12 },  // Tổng cộng
            { wch: 14 },  // Trạng thái
            { wch: 25 },  // Mô tả
        ];
        worksheet['!cols'] = colWidths;

        const fileName = `lich_su_nhap_hang_${supplier.code || supplier.name}_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.xlsx`;
        XLSX.writeFile(workbook, fileName);
        toast.success('Xuất file thành công!');
    };

    // Open Payment Modal
    const openPaymentModal = (supplier: Supplier) => {
        setSelectedSupplierForDebt(supplier);
        setPaymentForm({
            dateTime: new Date().toISOString().slice(0, 16),
            payer: 'Mixu',
            paymentMethod: 'cash',
            amount: '',
            note: '',
            allocateToPurchases: true
        });
        setPaymentModalOpen(true);
    };

    // Open Adjustment Modal
    const openAdjustmentModal = (supplier: Supplier) => {
        setSelectedSupplierForDebt(supplier);
        setAdjustmentForm({
            adjustDate: new Date().toISOString().slice(0, 16),
            adjustAmount: '',
            description: ''
        });
        setAdjustmentModalOpen(true);
    };

    // Open Discount Modal
    const openDiscountModal = (supplier: Supplier) => {
        setSelectedSupplierForDebt(supplier);
        setDiscountForm({
            dateTime: new Date().toISOString().slice(0, 16),
            executor: 'Mixu',
            discountAmount: '',
            note: '',
            allocateToPurchases: false
        });
        setDiscountModalOpen(true);
    };

    // Open Export Debt Modal
    const openExportDebtModal = (supplier: Supplier) => {
        setSelectedSupplierForDebt(supplier);
        setExportDebtModalOpen(true);
    };

    // Get date range based on time period
    const getDateRange = (period: string): { from: Date; to: Date } => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        switch (period) {
            case 'today':
                return { from: today, to: now };
            case 'this_week':
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay() + 1);
                return { from: weekStart, to: now };
            case 'last_7_days':
                const last7 = new Date(today);
                last7.setDate(today.getDate() - 7);
                return { from: last7, to: now };
            case 'last_30_days':
                const last30 = new Date(today);
                last30.setDate(today.getDate() - 30);
                return { from: last30, to: now };
            case 'this_month':
                return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
            case 'last_month':
                return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: new Date(now.getFullYear(), now.getMonth(), 0) };
            case 'this_quarter':
                const quarter = Math.floor(now.getMonth() / 3);
                return { from: new Date(now.getFullYear(), quarter * 3, 1), to: now };
            case 'this_year':
                return { from: new Date(now.getFullYear(), 0, 1), to: now };
            case 'all_time':
                return { from: new Date(2020, 0, 1), to: now };
            default:
                return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
        }
    };

    // Export Debt to Excel
    const exportDebtToExcel = () => {
        if (!selectedSupplierForDebt) return;

        const supplier = selectedSupplierForDebt;
        const dateRange = getDateRange(exportDebtTimePeriod);
        const fromDate = dateRange.from.toLocaleDateString('vi-VN');
        const toDate = dateRange.to.toLocaleDateString('vi-VN');
        const currentDebt = supplier.currentDebt || 0;

        // Create workbook
        const workbook = XLSX.utils.book_new();

        // Build data rows
        const data: any[][] = [];

        // Header rows
        data.push(['Công Ty TNHH MTV TM&DV MIXU']);
        data.push(['Địa chỉ', 'Phường Hòa Thuận Tây, Quận Hải Châu']);
        data.push(['Điện thoại', '']);
        data.push([]);
        data.push(['', '', '', 'Công nợ chi tiết nhà cung cấp']);
        data.push(['', '', '', `Từ ngày ${fromDate} đến ngày ${toDate}`]);
        data.push([]);

        // Supplier info
        data.push(['Tên NCC', supplier.name, '', '', '', '', 'Nợ đầu kỳ', '', formatCurrency(currentDebt)]);
        data.push(['Mã NCC', supplier.code || '', '', '', '', '', 'Phát sinh trong k', '', '0', '0']);
        data.push(['Điện thoại', supplier.phone || '', '', '', '', '', 'Nợ cuối kỳ', '', formatCurrency(currentDebt)]);
        data.push([]);

        // Table header - build dynamically based on selected fields
        const headers = ['Thời gian', 'Mã', 'Diễn giải'];
        if (exportDebtFields.dvt) headers.push('ĐVT');
        if (exportDebtFields.soLuong) headers.push('Số lượng');
        if (exportDebtFields.donGia) headers.push('Đơn giá');
        if (exportDebtFields.giamGia) headers.push('Giảm giá');
        if (exportDebtFields.vat) headers.push('VAT');
        if (exportDebtFields.giaNhapTra) headers.push('Giá nhập/trả');
        if (exportDebtFields.thanhTien) headers.push('Thành tiền');
        headers.push('Ghi nợ', 'Ghi có');

        data.push(headers);

        // Add purchase data if available
        if (exportDebtFields.detailRows && supplierPurchases.length > 0) {
            supplierPurchases.forEach(p => {
                const row: any[] = [formatDateTime(p.createdAt), p.orderNumber, 'Nhập hàng'];
                if (exportDebtFields.dvt) row.push('');
                if (exportDebtFields.soLuong) row.push('');
                if (exportDebtFields.donGia) row.push('');
                if (exportDebtFields.giamGia) row.push('');
                if (exportDebtFields.vat) row.push('');
                if (exportDebtFields.giaNhapTra) row.push('');
                if (exportDebtFields.thanhTien) row.push(p.totalAmount);
                row.push(p.totalAmount, 0);
                data.push(row);
            });
        }

        data.push([]);

        // Date row
        const currentDate = new Date();
        data.push(['', '', '', '', '', '', '', '', '', `Ngày ${currentDate.getDate()} tháng ${currentDate.getMonth() + 1} năm ${currentDate.getFullYear()}`]);
        data.push([]);

        // Signature row
        data.push(['Nhà cung cấp', '', '', '', 'Người lập biểu', '', '', '', 'TM Công ty']);
        data.push(['(Ký, họ tên)', '', '', '', '(Ký, họ tên)', '', '', '', '(Ký, họ tên)']);

        // Create worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(data);

        // Add borders to table header and data rows
        const headerRowIndex = 11; // Row index for table header (0-based)
        const numCols = headers.length;
        const numDataRows = exportDebtFields.detailRows ? supplierPurchases.length : 0;

        // Define border style for xlsx-js-style
        const thinBorder = { style: 'thin', color: { rgb: '000000' } };
        const borderStyle = {
            top: thinBorder,
            bottom: thinBorder,
            left: thinBorder,
            right: thinBorder
        };

        // Header cell style (bold + border)
        const headerCellStyle = {
            border: borderStyle,
            font: { bold: true },
            alignment: { horizontal: 'center', vertical: 'center' }
        };

        // Data cell style (border only)
        const dataCellStyle = {
            border: borderStyle
        };

        // Apply styles to header row
        for (let c = 0; c < numCols; c++) {
            const cellRef = XLSX.utils.encode_cell({ r: headerRowIndex, c });
            if (!worksheet[cellRef]) {
                worksheet[cellRef] = { v: '', t: 's' };
            }
            worksheet[cellRef].s = headerCellStyle;
        }

        // Apply styles to data rows
        for (let r = headerRowIndex + 1; r <= headerRowIndex + numDataRows + 1; r++) {
            for (let c = 0; c < numCols; c++) {
                const cellRef = XLSX.utils.encode_cell({ r, c });
                if (!worksheet[cellRef]) {
                    worksheet[cellRef] = { v: '', t: 's' };
                }
                worksheet[cellRef].s = dataCellStyle;
            }
        }

        // Set column widths
        worksheet['!cols'] = headers.map(() => ({ wch: 12 }));

        // Add to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Công nợ NCC');

        // Generate filename
        const fileName = `cong_no_${supplier.code || supplier.name}_${fromDate.replace(/\//g, '-')}_${toDate.replace(/\//g, '-')}.xlsx`;

        XLSX.writeFile(workbook, fileName);
        toast.success('Xuất file công nợ thành công!');
        setExportDebtModalOpen(false);
    };

    // Export Debt Simple (Xuất file button)
    const exportDebtSimple = (supplier: Supplier) => {
        if (supplierPurchases.length === 0) {
            toast.error('Không có dữ liệu để xuất!');
            return;
        }

        // Create workbook
        const workbook = XLSX.utils.book_new();

        // Define border style
        const thinBorder = { style: 'thin', color: { rgb: '000000' } };
        const borderStyle = {
            top: thinBorder,
            bottom: thinBorder,
            left: thinBorder,
            right: thinBorder
        };

        // Header style
        const headerCellStyle = {
            border: borderStyle,
            font: { bold: true },
            fill: { fgColor: { rgb: 'D9E1F2' } },
            alignment: { horizontal: 'center', vertical: 'center' }
        };

        // Data cell style
        const dataCellStyle = {
            border: borderStyle
        };

        // Build data with headers
        const headers = ['Mã phiếu', 'Thời gian', 'Loại', 'Giá trị', 'Nợ cần trả nhà cung cấp'];
        const data: any[][] = [headers];

        // Add purchase data
        supplierPurchases.forEach(p => {
            data.push([
                p.orderNumber,
                formatDateTime(p.createdAt),
                'Nhập hàng',
                p.totalAmount,
                p.totalAmount
            ]);
        });

        // Create worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(data);

        // Apply header styles
        for (let c = 0; c < headers.length; c++) {
            const cellRef = XLSX.utils.encode_cell({ r: 0, c });
            if (worksheet[cellRef]) {
                worksheet[cellRef].s = headerCellStyle;
            }
        }

        // Apply data styles
        for (let r = 1; r < data.length; r++) {
            for (let c = 0; c < headers.length; c++) {
                const cellRef = XLSX.utils.encode_cell({ r, c });
                if (!worksheet[cellRef]) {
                    worksheet[cellRef] = { v: '', t: 's' };
                }
                worksheet[cellRef].s = dataCellStyle;
            }
        }

        // Set column widths
        worksheet['!cols'] = [
            { wch: 12 }, // Mã phiếu
            { wch: 20 }, // Thời gian
            { wch: 12 }, // Loại
            { wch: 15 }, // Giá trị
            { wch: 22 }  // Nợ cần trả
        ];

        // Add auto filter
        worksheet['!autofilter'] = { ref: `A1:E${data.length}` };

        // Add to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh sách nợ');

        // Generate filename
        const fileName = `no_ncc_${supplier.code || supplier.name}_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.xlsx`;

        XLSX.writeFile(workbook, fileName);
        toast.success('Xuất file thành công!');
    };

    const openAddModal = () => {
        setEditingSupplier(null);
        setFormData(createEmptyFormData());
        setErrors({});
        setIsFormOpen(true);
    };

    const openEditModal = (supplier: Supplier) => {
        setEditingSupplier(supplier);
        setFormData({
            code: supplier.code || '',
            name: supplier.name,
            email: supplier.email || '',
            phone: supplier.phone || '',
            address: supplier.address || '',
            taxNumber: supplier.taxNumber || '',
            area: supplier.area || '',
            ward: supplier.ward || '',
            notes: supplier.notes || '',
            supplierGroup: supplier.supplierGroup || '',
            company: supplier.company || '',
            active: supplier.active ?? true,
        });
        setErrors({});
        setIsFormOpen(true);
    };

    const closeFormModal = () => {
        setIsFormOpen(false);
        setEditingSupplier(null);
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) newErrors.name = 'Tên nhà cung cấp là bắt buộc';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setSubmitting(true);
        try {
            if (editingSupplier) {
                await suppliersAPI.update(editingSupplier.id, formData);
                toast.success('Cập nhật nhà cung cấp thành công');
            } else {
                await suppliersAPI.create(formData);
                toast.success('Thêm nhà cung cấp thành công');
            }
            closeFormModal();
            fetchSuppliers();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (supplier: Supplier) => {
        if (!confirm(`Xóa nhà cung cấp "${supplier.name}"?`)) return;
        try {
            await suppliersAPI.delete(supplier.id);
            toast.success('Xóa nhà cung cấp thành công');
            fetchSuppliers();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Không thể xóa nhà cung cấp');
        }
    };

    const formatCurrency = (value: any): string => {
        const num = typeof value === 'number' ? value : parseFloat(value);
        if (isNaN(num)) return '0';
        return new Intl.NumberFormat('vi-VN').format(num);
    };

    // Import functionality
    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        setImportNote('');

        try {
            const parsedSuppliers = await parseExcel(file);

            if (!parsedSuppliers || parsedSuppliers.length === 0) {
                setImportNote('❌ Không tìm thấy dữ liệu nhà cung cấp trong file');
                return;
            }

            let successCount = 0;
            let failCount = 0;

            for (const supplier of parsedSuppliers) {
                if (!supplier.name) continue;
                try {
                    await suppliersAPI.create(supplier as any);
                    successCount++;
                } catch (error: any) {
                    failCount++;
                    console.error('Import error:', supplier.name, error.response?.data?.message);
                }
            }

            setImportNote(`✅ Import thành công ${successCount} nhà cung cấp${failCount > 0 ? ` (${failCount} lỗi)` : ''}`);
            toast.success(`Import thành công ${successCount} nhà cung cấp`);
            fetchSuppliers();
        } catch (error: any) {
            setImportNote(`❌ Lỗi: ${error.message}`);
            toast.error(error.message);
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const parseExcel = async (file: File): Promise<Partial<FormData & { totalPurchase?: number; currentDebt?: number; totalPurchaseAfterReturn?: number }>[]> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

                    let headerIdx = 0;
                    for (let i = 0; i < Math.min(5, jsonData.length); i++) {
                        const row = jsonData[i]?.map((c) => String(c || '').toLowerCase()) || [];
                        if (row.some((c) => c.includes('tên') || c.includes('nhà cung cấp'))) {
                            headerIdx = i;
                            break;
                        }
                    }

                    const headers = jsonData[headerIdx]?.map((h) => String(h || '').toLowerCase()) || [];
                    const suppliers: any[] = [];

                    for (let i = headerIdx + 1; i < jsonData.length; i++) {
                        const row = jsonData[i];
                        if (!row || row.every((c) => !c)) continue;

                        const supplier: any = { active: true };

                        headers.forEach((h, idx) => {
                            const val = row[idx];
                            if (val === null || val === undefined || val === '') return;
                            const strVal = String(val).trim();

                            if (h.includes('mã nhà cung cấp') || h.includes('mã ncc')) {
                                supplier.code = strVal;
                            } else if (h.includes('tên nhà cung cấp') || h.includes('tên ncc')) {
                                supplier.name = strVal;
                            } else if (h.includes('email')) {
                                supplier.email = strVal;
                            } else if (h.includes('điện thoại')) {
                                supplier.phone = strVal;
                            } else if (h.includes('địa chỉ') && !h.includes('khu vực')) {
                                supplier.address = strVal;
                            } else if (h.includes('khu vực')) {
                                supplier.area = strVal;
                            } else if (h.includes('phường') || h.includes('xã')) {
                                supplier.ward = strVal;
                            } else if (h.includes('tổng mua') && !h.includes('trừ')) {
                                const num = typeof val === 'number' ? val : parseFloat(strVal.replace(/[^0-9.-]/g, ''));
                                if (!isNaN(num)) supplier.totalPurchase = num;
                            } else if (h.includes('nợ cần trả') || h.includes('nợ hiện tại')) {
                                const num = typeof val === 'number' ? val : parseFloat(strVal.replace(/[^0-9.-]/g, ''));
                                if (!isNaN(num)) supplier.currentDebt = num;
                            } else if (h.includes('mã số thuế')) {
                                supplier.taxNumber = strVal;
                            } else if (h.includes('ghi chú')) {
                                supplier.notes = strVal;
                            } else if (h.includes('nhóm nhà cung cấp') || h.includes('nhóm ncc')) {
                                supplier.supplierGroup = strVal;
                            } else if (h.includes('trạng thái')) {
                                // Handle numeric: 1 = active (TRUE), 0 = inactive (FALSE)
                                // Handle text: "Đang hoạt động" = active, "Ngừng hoạt động" = inactive
                                if (typeof val === 'number') {
                                    supplier.active = val === 1 || val > 0;
                                } else {
                                    const lowerVal = strVal.toLowerCase();
                                    // If it's "1" string, treat as active
                                    if (strVal === '1') {
                                        supplier.active = true;
                                    } else if (strVal === '0') {
                                        supplier.active = false;
                                    } else {
                                        // Text-based: "Đang hoạt động" = true, "Ngừng hoạt động" = false
                                        supplier.active = lowerVal.includes('hoạt động') && !lowerVal.includes('ngừng');
                                    }
                                }
                            } else if (h.includes('tổng mua trừ')) {
                                const num = typeof val === 'number' ? val : parseFloat(strVal.replace(/[^0-9.-]/g, ''));
                                if (!isNaN(num)) supplier.totalPurchaseAfterReturn = num;
                            } else if (h.includes('công ty')) {
                                supplier.company = strVal;
                            } else if (h.includes('người tạo')) {
                                supplier.creator = strVal;
                            }
                        });

                        if (supplier.name) suppliers.push(supplier);
                    }

                    resolve(suppliers);
                } catch {
                    reject(new Error('Không thể đọc file Excel'));
                }
            };
            reader.onerror = () => reject(new Error('Lỗi đọc file'));
            reader.readAsArrayBuffer(file);
        });
    };

    // Filter by status locally
    const filteredSuppliers = suppliers.filter((s) => {
        if (filters.status === 'active') return s.active !== false;
        if (filters.status === 'inactive') return s.active === false;
        return true;
    });

    return (
        <div className="supplier-page">
            <Toast toasts={toast.toasts} onRemove={toast.removeToast} />

            {/* Header với Search và Actions */}
            <div className="supplier-header">
                <h2><MdLocalShipping /> Nhà cung cấp</h2>

                {/* Search Box - Centered */}
                <div className="header-search">
                    <div className="search-box">
                        <MdSearch className="search-icon" />
                        <input
                            type="text"
                            placeholder="Theo mã, tên, số điện thoại"
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="search-input"
                        />
                        {filters.search && (
                            <button className="clear-search" onClick={() => { setFilters({ ...filters, search: '' }); handleSearch(); }}>
                                <MdClose />
                            </button>
                        )}
                    </div>
                </div>

                {/* Actions - Right aligned */}
                <div className="header-actions">
                    <button
                        className={`btn-filter-toggle ${showFilters ? 'active' : ''}`}
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <MdFilterList />
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept=".xlsx,.xls,.csv"
                        style={{ display: 'none' }}
                    />
                    <button onClick={handleImportClick} className="btn-import" disabled={importing}>
                        {importing ? <><MdHourglassEmpty /> Đang import...</> : <><MdDownload /> Import file</>}
                    </button>
                    <button onClick={openAddModal} className="btn-add">
                        <MdAdd /> Nhà cung cấp
                    </button>
                </div>
            </div>

            {importNote && (
                <div className={`import-note ${importNote.startsWith('✅') ? 'success' : 'error'}`}>
                    {importNote}
                </div>
            )}

            <div className="supplier-content">
                {/* Filter Panel */}
                {showFilters && (
                    <div className="filter-panel">
                        <div className="filter-section">
                            <h4>Nhóm nhà cung cấp</h4>
                            <select
                                value=""
                                onChange={(e) => setFilters({ ...filters, supplierGroup: e.target.value } as any)}
                                className="filter-select-full"
                            >
                                <option value="">Tất cả các nhóm</option>
                            </select>
                        </div>

                        <div className="filter-section">
                            <h4>Tổng mua</h4>
                            <p className="filter-label">Giá trị</p>
                            <div className="filter-range">
                                <div className="filter-input-group">
                                    <span className="filter-prefix">Từ</span>
                                    <input
                                        type="text"
                                        placeholder="Nhập giá trị"
                                        value={filters.totalPurchaseFrom}
                                        onChange={(e) => setFilters({ ...filters, totalPurchaseFrom: e.target.value })}
                                    />
                                </div>
                                <div className="filter-input-group">
                                    <span className="filter-prefix">Tới</span>
                                    <input
                                        type="text"
                                        placeholder="Nhập giá trị"
                                        value={filters.totalPurchaseTo}
                                        onChange={(e) => setFilters({ ...filters, totalPurchaseTo: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="filter-section">
                            <h4>Thời gian</h4>
                            <div className="filter-radio-group">
                                <label className={`filter-radio ${filters.timeFilter === 'all' ? 'selected' : ''}`}>
                                    <input
                                        type="radio"
                                        name="timeFilter"
                                        checked={filters.timeFilter === 'all'}
                                        onChange={() => setFilters({ ...filters, timeFilter: 'all' })}
                                    />
                                    <span className="radio-dot"></span>
                                    Toàn thời gian
                                </label>
                                <label className={`filter-radio ${filters.timeFilter === 'custom' ? 'selected' : ''}`}>
                                    <input
                                        type="radio"
                                        name="timeFilter"
                                        checked={filters.timeFilter === 'custom'}
                                        onChange={() => setFilters({ ...filters, timeFilter: 'custom' })}
                                    />
                                    <span className="radio-dot"></span>
                                    Tùy chỉnh
                                </label>
                            </div>
                            {filters.timeFilter === 'custom' && (
                                <div className="filter-date-range">
                                    <input
                                        type="date"
                                        value={filters.dateFrom}
                                        onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                                    />
                                    <input
                                        type="date"
                                        value={filters.dateTo}
                                        onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="filter-section">
                            <h4>Nợ hiện tại</h4>
                            <div className="filter-range">
                                <div className="filter-input-group">
                                    <span className="filter-prefix">Từ</span>
                                    <input
                                        type="text"
                                        placeholder="Nhập giá trị"
                                        value={filters.currentDebtFrom}
                                        onChange={(e) => setFilters({ ...filters, currentDebtFrom: e.target.value })}
                                    />
                                </div>
                                <div className="filter-input-group">
                                    <span className="filter-prefix">Tới</span>
                                    <input
                                        type="text"
                                        placeholder="Nhập giá trị"
                                        value={filters.currentDebtTo}
                                        onChange={(e) => setFilters({ ...filters, currentDebtTo: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="filter-section">
                            <h4>Trạng thái</h4>
                            <div className="status-toggle-group">
                                <button
                                    className={`status-btn ${filters.status === 'all' ? 'active' : ''}`}
                                    onClick={() => setFilters({ ...filters, status: 'all' })}
                                >
                                    Tất cả
                                </button>
                                <button
                                    className={`status-btn ${filters.status === 'active' ? 'active' : ''}`}
                                    onClick={() => setFilters({ ...filters, status: 'active' })}
                                >
                                    Đang hoạt động
                                </button>
                                <button
                                    className={`status-btn ${filters.status === 'inactive' ? 'active' : ''}`}
                                    onClick={() => setFilters({ ...filters, status: 'inactive' })}
                                >
                                    Ngừng hoạt động
                                </button>
                            </div>
                        </div>

                        <div className="filter-actions">
                            <button className="btn-apply" onClick={handleSearch}>
                                <MdCheck /> Áp dụng
                            </button>
                            <button className="btn-clear" onClick={handleClearFilters}>
                                Xóa bộ lọc
                            </button>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="supplier-table-container">
                    {loading ? (
                        <div className="supplier-loading">
                            <MdHourglassEmpty className="loading-icon" />
                            <p>Đang tải...</p>
                        </div>
                    ) : filteredSuppliers.length === 0 ? (
                        <div className="supplier-empty">
                            <MdLocalShipping className="empty-icon" />
                            <p>Chưa có nhà cung cấp nào</p>
                            <button onClick={openAddModal} className="btn-add-empty">
                                <MdAdd /> Thêm nhà cung cấp
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="supplier-table-wrapper">
                                <table className="supplier-table">
                                    <thead>
                                        <tr>
                                            <th>Mã NCC</th>
                                            <th>Tên nhà cung cấp</th>
                                            <th>Điện thoại</th>
                                            <th>Địa chỉ</th>
                                            <th className="text-right">Tổng mua</th>
                                            <th className="text-right">Nợ hiện tại</th>
                                            <th className="text-center">Trạng thái</th>
                                            <th className="text-center">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredSuppliers.map((supplier) => (
                                            <React.Fragment key={supplier.id}>
                                                <tr
                                                    className={`supplier-row ${expandedSupplierId === supplier.id ? 'expanded' : ''}`}
                                                    onClick={() => toggleExpandRow(supplier.id)}
                                                >
                                                    <td className="supplier-code">{supplier.code || '-'}</td>
                                                    <td className="supplier-name">{supplier.name}</td>
                                                    <td>{supplier.phone || '-'}</td>
                                                    <td>{supplier.address || '-'}</td>
                                                    <td className="text-right">{formatCurrency(supplier.totalPurchase || 0)}</td>
                                                    <td className="text-right">
                                                        <span className={`debt-badge ${(supplier.currentDebt || 0) > 0 ? 'has-debt' : ''}`}>
                                                            {formatCurrency(supplier.currentDebt || 0)}
                                                        </span>
                                                    </td>
                                                    <td className="text-center">
                                                        <span className={`status-badge ${supplier.active !== false ? 'active' : 'inactive'}`}>
                                                            {supplier.active !== false ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                                                        </span>
                                                    </td>
                                                    <td className="text-center">
                                                        <div className="actions-cell">
                                                            <button className="btn-edit" onClick={(e) => { e.stopPropagation(); openEditModal(supplier); }} title="Sửa">
                                                                <MdEdit />
                                                            </button>
                                                            <button className="btn-delete" onClick={(e) => { e.stopPropagation(); handleDelete(supplier); }} title="Xóa">
                                                                <MdDelete />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>

                                                {/* Expandable Detail Row */}
                                                {expandedSupplierId === supplier.id && (
                                                    <tr className="supplier-detail-row">
                                                        <td colSpan={8}>
                                                            <div className="supplier-detail-container">
                                                                {/* Tabs */}
                                                                <div className="detail-tabs">
                                                                    <button
                                                                        className={`detail-tab ${activeDetailTab === 'info' ? 'active' : ''}`}
                                                                        onClick={(e) => { e.stopPropagation(); setActiveDetailTab('info'); }}
                                                                    >
                                                                        Thông tin
                                                                    </button>
                                                                    <button
                                                                        className={`detail-tab ${activeDetailTab === 'history' ? 'active' : ''}`}
                                                                        onClick={(e) => { e.stopPropagation(); setActiveDetailTab('history'); }}
                                                                    >
                                                                        Lịch sử nhập/trả hàng
                                                                    </button>
                                                                    <button
                                                                        className={`detail-tab ${activeDetailTab === 'debt' ? 'active' : ''}`}
                                                                        onClick={(e) => { e.stopPropagation(); setActiveDetailTab('debt'); }}
                                                                    >
                                                                        Nợ cần trả nhà cung cấp
                                                                    </button>
                                                                </div>

                                                                {/* Tab Content */}
                                                                <div className="detail-content">
                                                                    {activeDetailTab === 'info' && (
                                                                        <div className="info-tab-content">
                                                                            <div className="info-header">
                                                                                <div className="info-title">
                                                                                    <h3>{supplier.name} <span className="supplier-code-tag">{supplier.code}</span></h3>
                                                                                    <span className="branch-tag">{supplier.company || 'Chi nhánh trung tâm'}</span>
                                                                                </div>
                                                                            </div>

                                                                            <div className="info-meta">
                                                                                <span>Người tạo: <strong>{supplier.creator || 'Mixu'}</strong></span>
                                                                                <span>Ngày tạo: <strong>{formatDate(supplier.createdAt)}</strong></span>
                                                                                <span>Nhóm nhà cung cấp: <strong>{supplier.supplierGroup || 'Chưa có'}</strong></span>
                                                                            </div>

                                                                            <div className="info-grid">
                                                                                <div className="info-row">
                                                                                    <div className="info-item">
                                                                                        <label>Điện thoại</label>
                                                                                        <p>{supplier.phone || 'Chưa có'}</p>
                                                                                    </div>
                                                                                    <div className="info-item">
                                                                                        <label>Email</label>
                                                                                        <p>{supplier.email || 'Chưa có'}</p>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="info-row">
                                                                                    <div className="info-item full-width">
                                                                                        <label>Địa chỉ</label>
                                                                                        <p>{supplier.address || 'Chưa có'}</p>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="info-row">
                                                                                    <div className="info-item full-width">
                                                                                        <a href="#" className="add-invoice-info">Thêm thông tin xuất hóa đơn</a>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="info-row">
                                                                                    <div className="info-item full-width notes-section">
                                                                                        <MdNotes className="notes-icon" />
                                                                                        <span>{supplier.notes || 'Chưa có ghi chú'}</span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <div className="detail-actions">
                                                                                <button className="btn-detail-delete" onClick={(e) => { e.stopPropagation(); handleDelete(supplier); }}>
                                                                                    <MdDelete /> Xóa
                                                                                </button>
                                                                                <button className="btn-detail-edit" onClick={(e) => { e.stopPropagation(); openEditModal(supplier); }}>
                                                                                    <MdEdit /> Chỉnh sửa
                                                                                </button>
                                                                                <button className="btn-detail-deactivate" onClick={(e) => e.stopPropagation()}>
                                                                                    <MdBlock /> {supplier.active !== false ? 'Ngừng hoạt động' : 'Kích hoạt'}
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {activeDetailTab === 'history' && (
                                                                        <div className="history-tab-content">
                                                                            {loadingPurchases ? (
                                                                                <p className="empty-tab-message">Đang tải...</p>
                                                                            ) : supplierPurchases.length === 0 ? (
                                                                                <p className="empty-tab-message">Chưa có lịch sử nhập/trả hàng</p>
                                                                            ) : (
                                                                                <>
                                                                                    <table className="history-table">
                                                                                        <thead>
                                                                                            <tr>
                                                                                                <th>Mã phiếu</th>
                                                                                                <th>Thời gian</th>
                                                                                                <th>Người tạo</th>
                                                                                                <th className="text-right">Tổng cộng</th>
                                                                                                <th>Trạng thái</th>
                                                                                            </tr>
                                                                                        </thead>
                                                                                        <tbody>
                                                                                            {supplierPurchases.map(purchase => (
                                                                                                <tr key={purchase.id}>
                                                                                                    <td className="purchase-code">{purchase.orderNumber}</td>
                                                                                                    <td>{formatDateTime(purchase.createdAt)}</td>
                                                                                                    <td>Mixu</td>
                                                                                                    <td className="text-right">{formatCurrency(purchase.totalAmount)}</td>
                                                                                                    <td>
                                                                                                        <span className={`purchase-status ${purchase.status?.toLowerCase()}`}>
                                                                                                            {purchase.status === 'CONFIRMED' ? 'Đã nhập hàng' :
                                                                                                                purchase.status === 'PENDING' ? 'Chờ xác nhận' :
                                                                                                                    purchase.status === 'CANCELLED' ? 'Đã hủy' : purchase.status}
                                                                                                        </span>
                                                                                                    </td>
                                                                                                </tr>
                                                                                            ))}
                                                                                        </tbody>
                                                                                    </table>
                                                                                    <div className="history-actions">
                                                                                        <button type="button" className="btn-export-history" onClick={(e) => { e.stopPropagation(); exportPurchaseHistory(supplier); }}>
                                                                                            <MdDownload /> Xuất file
                                                                                        </button>
                                                                                    </div>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    {activeDetailTab === 'debt' && (
                                                                        <div className="debt-tab-content">
                                                                            <div className="debt-header">
                                                                                <select
                                                                                    className="debt-filter-select"
                                                                                    value={debtFilter}
                                                                                    onChange={(e) => setDebtFilter(e.target.value as 'all' | 'pending' | 'paid')}
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                >
                                                                                    <option value="all">Tất cả giao dịch</option>
                                                                                    <option value="pending">Chưa thanh toán</option>
                                                                                    <option value="paid">Đã thanh toán</option>
                                                                                </select>
                                                                            </div>
                                                                            {loadingPurchases ? (
                                                                                <p className="empty-tab-message">Đang tải...</p>
                                                                            ) : supplierPurchases.length === 0 ? (
                                                                                <p className="empty-tab-message">Chưa có thông tin nợ</p>
                                                                            ) : (
                                                                                <>
                                                                                    <table className="debt-table">
                                                                                        <thead>
                                                                                            <tr>
                                                                                                <th>Mã phiếu</th>
                                                                                                <th>Thời gian</th>
                                                                                                <th>Loại</th>
                                                                                                <th className="text-right">Giá trị</th>
                                                                                                <th className="text-right">Nợ cần trả nhà cung cấp</th>
                                                                                            </tr>
                                                                                        </thead>
                                                                                        <tbody>
                                                                                            {supplierPurchases
                                                                                                .filter(p => {
                                                                                                    if (debtFilter === 'all') return true;
                                                                                                    if (debtFilter === 'pending') return p.status !== 'PAID';
                                                                                                    if (debtFilter === 'paid') return p.status === 'PAID';
                                                                                                    return true;
                                                                                                })
                                                                                                .map(purchase => (
                                                                                                    <tr key={purchase.id}>
                                                                                                        <td className="purchase-code">{purchase.orderNumber}</td>
                                                                                                        <td>{formatDateTime(purchase.createdAt)}</td>
                                                                                                        <td>Nhập hàng</td>
                                                                                                        <td className="text-right">{formatCurrency(purchase.totalAmount)}</td>
                                                                                                        <td className="text-right debt-amount">{formatCurrency(purchase.totalAmount)}</td>
                                                                                                    </tr>
                                                                                                ))}
                                                                                        </tbody>
                                                                                    </table>
                                                                                    <div className="debt-actions">
                                                                                        <button type="button" className="btn-debt-action" onClick={(e) => { e.stopPropagation(); openExportDebtModal(supplier); }}>
                                                                                            <MdDownload /> Xuất file công nợ
                                                                                        </button>
                                                                                        <button type="button" className="btn-debt-action" onClick={(e) => { e.stopPropagation(); exportDebtSimple(supplier); }}>
                                                                                            <MdDownload /> Xuất file
                                                                                        </button>
                                                                                        <div className="debt-actions-right">
                                                                                            <button type="button" className="btn-debt-primary" onClick={(e) => { e.stopPropagation(); openAdjustmentModal(supplier); }}>
                                                                                                <MdEdit /> Điều chỉnh
                                                                                            </button>
                                                                                            <button type="button" className="btn-debt-success" onClick={(e) => { e.stopPropagation(); openPaymentModal(supplier); }}>
                                                                                                Thanh toán
                                                                                            </button>
                                                                                            <button type="button" className="btn-debt-outline" onClick={(e) => { e.stopPropagation(); openDiscountModal(supplier); }}>
                                                                                                Chiết khấu thanh toán
                                                                                            </button>
                                                                                        </div>
                                                                                    </div>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="pagination-container">
                                <div className="pagination-info">
                                    Hiển thị {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalSuppliers)} / {totalSuppliers} nhà cung cấp
                                </div>
                                <div className="pagination-controls">
                                    <button
                                        className="pagination-btn"
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(1)}
                                    >
                                        {'<<'}
                                    </button>
                                    <button
                                        className="pagination-btn"
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(currentPage - 1)}
                                    >
                                        {'<'}
                                    </button>
                                    <span className="pagination-current">{currentPage} / {totalPages}</span>
                                    <button
                                        className="pagination-btn"
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(currentPage + 1)}
                                    >
                                        {'>'}
                                    </button>
                                    <button
                                        className="pagination-btn"
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(totalPages)}
                                    >
                                        {'>>'}
                                    </button>
                                    <select
                                        value={itemsPerPage}
                                        onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                        className="pagination-select"
                                    >
                                        <option value="10">10 / trang</option>
                                        <option value="20">20 / trang</option>
                                        <option value="50">50 / trang</option>
                                        <option value="100">100 / trang</option>
                                    </select>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Add/Edit Modal */}
            <Modal isOpen={isFormOpen} onClose={closeFormModal} title={editingSupplier ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp'}>
                <form onSubmit={handleSubmit} className="supplier-form">
                    {/* Basic Info - Always visible */}
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Tên nhà cung cấp</label>
                            <input
                                type="text"
                                className={`form-input ${errors.name ? 'error' : ''}`}
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Nhập tên nhà cung cấp"
                            />
                            {errors.name && <span className="error-text">{errors.name}</span>}
                        </div>
                        <div className="form-group">
                            <label className="form-label">Mã nhà cung cấp</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                placeholder="Tự động tạo nếu để trống"
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Điện thoại</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="0123 456 789"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input
                                type="email"
                                className="form-input"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="email@gmail.com"
                            />
                        </div>
                    </div>

                    {/* Collapsible: Địa chỉ */}
                    <div className="form-section">
                        <button
                            type="button"
                            className="form-section-header"
                            onClick={() => toggleFormSection('address')}
                        >
                            <span>Địa chỉ</span>
                            {formSections.address ? <MdExpandLess /> : <MdExpandMore />}
                        </button>
                        {formSections.address && (
                            <div className="form-section-content">
                                <div className="form-group">
                                    <label className="form-label">Địa chỉ</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        placeholder="Nhập địa chỉ"
                                    />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Khu vực</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.area}
                                            onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                                            placeholder="Chọn Tỉnh/Thành phố"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Phường/Xã</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.ward}
                                            onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                                            placeholder="Chọn Phường/Xã"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Collapsible: Nhóm nhà cung cấp, ghi chú */}
                    <div className="form-section">
                        <button
                            type="button"
                            className="form-section-header"
                            onClick={() => toggleFormSection('groupNotes')}
                        >
                            <span>Nhóm nhà cung cấp, ghi chú</span>
                            {formSections.groupNotes ? <MdExpandLess /> : <MdExpandMore />}
                        </button>
                        {formSections.groupNotes && (
                            <div className="form-section-content">
                                <div className="form-group">
                                    <label className="form-label">Nhóm nhà cung cấp</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.supplierGroup}
                                        onChange={(e) => setFormData({ ...formData, supplierGroup: e.target.value })}
                                        placeholder="Chọn nhóm nhà cung cấp"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Ghi chú</label>
                                    <textarea
                                        className="form-input"
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        placeholder="Nhập ghi chú"
                                        rows={3}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Collapsible: Thông tin xuất hóa đơn */}
                    <div className="form-section">
                        <button
                            type="button"
                            className="form-section-header"
                            onClick={() => toggleFormSection('invoice')}
                        >
                            <span>Thông tin xuất hóa đơn</span>
                            {formSections.invoice ? <MdExpandLess /> : <MdExpandMore />}
                        </button>
                        {formSections.invoice && (
                            <div className="form-section-content">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Tên công ty</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.company}
                                            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                            placeholder="Nhập tên công ty"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Mã số thuế</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.taxNumber}
                                            onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                                            placeholder="Nhập mã số thuế"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={closeFormModal}>
                            Bỏ qua
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={submitting}>
                            {submitting ? 'Đang lưu...' : 'Lưu'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Payment Modal */}
            <Modal isOpen={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} title="Thanh toán" size="xl">
                <div className="debt-modal-content">
                    <div className="debt-modal-header">
                        <span className="debt-modal-supplier">{selectedSupplierForDebt?.name}</span>
                        <span className="debt-modal-total">Nợ hiện tại: <strong>{formatCurrency(selectedSupplierForDebt?.currentDebt || 0)}</strong></span>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Thời gian</label>
                            <input
                                type="datetime-local"
                                className="form-input"
                                value={paymentForm.dateTime}
                                onChange={(e) => setPaymentForm({ ...paymentForm, dateTime: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Người chi</label>
                            <select
                                className="form-input"
                                value={paymentForm.payer}
                                onChange={(e) => setPaymentForm({ ...paymentForm, payer: e.target.value })}
                            >
                                <option value="Mixu">Mixu</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Phương thức thanh toán</label>
                        <select
                            className="form-input"
                            value={paymentForm.paymentMethod}
                            onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                        >
                            <option value="cash">Tiền mặt</option>
                            <option value="transfer">Chuyển khoản</option>
                            <option value="card">Thẻ</option>
                        </select>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Số tiền</label>
                            <input
                                type="number"
                                className="form-input"
                                value={paymentForm.amount}
                                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                placeholder="Nhập số tiền thanh toán"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Nợ còn</label>
                            <div className="debt-remaining-display">
                                {formatCurrency((selectedSupplierForDebt?.currentDebt || 0) - (parseFloat(paymentForm.amount) || 0))}
                            </div>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Ghi chú</label>
                        <input
                            type="text"
                            className="form-input"
                            value={paymentForm.note}
                            onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
                            placeholder="Nhập ghi chú"
                        />
                    </div>
                    <div className="form-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={paymentForm.allocateToPurchases}
                                onChange={(e) => setPaymentForm({ ...paymentForm, allocateToPurchases: e.target.checked })}
                            />
                            Phân bổ vào phiếu nhập hàng
                        </label>
                    </div>
                    {paymentForm.allocateToPurchases && supplierPurchases.length > 0 && (
                        <table className="allocation-table">
                            <thead>
                                <tr>
                                    <th>Mã hóa đơn</th>
                                    <th>Thời gian</th>
                                    <th className="text-right">Giá trị phiếu nhập</th>
                                    <th className="text-right">Đã trả trước</th>
                                    <th className="text-right">Còn cần trả</th>
                                    <th className="text-right">Tiền trả</th>
                                </tr>
                            </thead>
                            <tbody>
                                {supplierPurchases.map(p => (
                                    <tr key={p.id}>
                                        <td className="purchase-code">{p.orderNumber}</td>
                                        <td>{formatDateTime(p.createdAt)}</td>
                                        <td className="text-right">{formatCurrency(p.totalAmount)}</td>
                                        <td className="text-right">0</td>
                                        <td className="text-right">{formatCurrency(p.totalAmount)}</td>
                                        <td><input type="number" className="allocation-input" placeholder="0" /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => setPaymentModalOpen(false)}>
                            Bỏ qua
                        </button>
                        <button type="button" className="btn btn-outline-primary" onClick={() => toast.info('Tạo phiếu chi & In')}>
                            Tạo phiếu chi & In
                        </button>
                        <button type="button" className="btn btn-primary" onClick={() => { toast.success('Tạo phiếu chi thành công!'); setPaymentModalOpen(false); }}>
                            Tạo phiếu chi
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Adjustment Modal */}
            <Modal isOpen={adjustmentModalOpen} onClose={() => setAdjustmentModalOpen(false)} title="Điều chỉnh">
                <div className="debt-modal-content">
                    <div className="adjustment-info">
                        <span className="adjustment-label">Nợ cần trả hiện tại:</span>
                        <span className="adjustment-value">{formatCurrency(selectedSupplierForDebt?.currentDebt || 0)}</span>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Ngày điều chỉnh:</label>
                        <input
                            type="datetime-local"
                            className="form-input"
                            value={adjustmentForm.adjustDate}
                            onChange={(e) => setAdjustmentForm({ ...adjustmentForm, adjustDate: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Giá trị nợ điều chỉnh:</label>
                        <input
                            type="number"
                            className="form-input"
                            value={adjustmentForm.adjustAmount}
                            onChange={(e) => setAdjustmentForm({ ...adjustmentForm, adjustAmount: e.target.value })}
                            placeholder="Nhập giá trị điều chỉnh"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Mô tả:</label>
                        <textarea
                            className="form-input"
                            value={adjustmentForm.description}
                            onChange={(e) => setAdjustmentForm({ ...adjustmentForm, description: e.target.value })}
                            placeholder="✏️"
                            rows={3}
                        />
                    </div>
                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => setAdjustmentModalOpen(false)}>
                            Bỏ qua
                        </button>
                        <button type="button" className="btn btn-primary" onClick={() => { toast.success('Điều chỉnh thành công!'); setAdjustmentModalOpen(false); }}>
                            Chỉnh sửa
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Discount Modal */}
            <Modal isOpen={discountModalOpen} onClose={() => setDiscountModalOpen(false)} title="Chiết khấu thanh toán">
                <div className="debt-modal-content">
                    <div className="debt-modal-header">
                        <span className="debt-modal-supplier">{selectedSupplierForDebt?.name}</span>
                        <span className="debt-modal-total">Nợ hiện tại: <strong>{formatCurrency(selectedSupplierForDebt?.currentDebt || 0)}</strong></span>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Thời gian</label>
                            <input
                                type="datetime-local"
                                className="form-input"
                                value={discountForm.dateTime}
                                onChange={(e) => setDiscountForm({ ...discountForm, dateTime: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Người thực hiện</label>
                            <select
                                className="form-input"
                                value={discountForm.executor}
                                onChange={(e) => setDiscountForm({ ...discountForm, executor: e.target.value })}
                            >
                                <option value="Mixu">Mixu</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Chiết khấu từ nhà cung cấp</label>
                        <input
                            type="number"
                            className="form-input"
                            value={discountForm.discountAmount}
                            onChange={(e) => setDiscountForm({ ...discountForm, discountAmount: e.target.value })}
                            placeholder="Nhập số tiền chiết khấu"
                        />
                        <span className="debt-remaining-hint">Còn nợ: {formatCurrency((selectedSupplierForDebt?.currentDebt || 0) - (parseFloat(discountForm.discountAmount) || 0))}</span>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Ghi chú</label>
                        <input
                            type="text"
                            className="form-input"
                            value={discountForm.note}
                            onChange={(e) => setDiscountForm({ ...discountForm, note: e.target.value })}
                            placeholder="Nhập ghi chú"
                        />
                    </div>
                    <div className="form-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={discountForm.allocateToPurchases}
                                onChange={(e) => setDiscountForm({ ...discountForm, allocateToPurchases: e.target.checked })}
                            />
                            Phân bổ vào phiếu nhập hàng
                        </label>
                    </div>
                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => setDiscountModalOpen(false)}>
                            Bỏ qua
                        </button>
                        <button type="button" className="btn btn-primary" onClick={() => { toast.success('Tạo chiết khấu thành công!'); setDiscountModalOpen(false); }}>
                            Tạo phiếu
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Export Debt Modal */}
            <Modal isOpen={exportDebtModalOpen} onClose={() => setExportDebtModalOpen(false)} title="Xuất file công nợ">
                <div className="export-debt-modal-content">
                    <div className="export-debt-section">
                        <label className="export-debt-label">Thời gian</label>
                        <div className="time-period-pills">
                            <button
                                type="button"
                                className={`time-pill ${exportDebtTimePeriod === 'today' ? 'active' : ''}`}
                                onClick={() => setExportDebtTimePeriod('today')}
                            >Hôm nay</button>
                            <button
                                type="button"
                                className={`time-pill ${exportDebtTimePeriod === 'this_week' ? 'active' : ''}`}
                                onClick={() => setExportDebtTimePeriod('this_week')}
                            >Tuần này</button>
                            <button
                                type="button"
                                className={`time-pill ${exportDebtTimePeriod === 'last_7_days' ? 'active' : ''}`}
                                onClick={() => setExportDebtTimePeriod('last_7_days')}
                            >7 ngày qua</button>
                            <button
                                type="button"
                                className={`time-pill ${exportDebtTimePeriod === 'last_30_days' ? 'active' : ''}`}
                                onClick={() => setExportDebtTimePeriod('last_30_days')}
                            >30 ngày qua</button>
                            <button
                                type="button"
                                className={`time-pill ${exportDebtTimePeriod === 'this_month' ? 'active' : ''}`}
                                onClick={() => setExportDebtTimePeriod('this_month')}
                            >Tháng này</button>
                            <button
                                type="button"
                                className={`time-pill ${exportDebtTimePeriod === 'last_month' ? 'active' : ''}`}
                                onClick={() => setExportDebtTimePeriod('last_month')}
                            >Tháng trước</button>
                        </div>
                        <div className="time-period-pills">
                            <button
                                type="button"
                                className={`time-pill ${exportDebtTimePeriod === 'this_quarter' ? 'active' : ''}`}
                                onClick={() => setExportDebtTimePeriod('this_quarter')}
                            >Quý này</button>
                            <button
                                type="button"
                                className={`time-pill ${exportDebtTimePeriod === 'this_year' ? 'active' : ''}`}
                                onClick={() => setExportDebtTimePeriod('this_year')}
                            >Năm nay</button>
                            <button
                                type="button"
                                className={`time-pill ${exportDebtTimePeriod === 'all_time' ? 'active' : ''}`}
                                onClick={() => setExportDebtTimePeriod('all_time')}
                            >Toàn thời gian</button>
                        </div>
                    </div>

                    <div className="export-debt-section">
                        <label className="export-debt-label">Thông tin xuất file</label>
                        <div className="export-info-note">
                            <strong>Dữ liệu tổng quan (luôn có)</strong>
                            <p>Thời gian, Mã, Ghi nợ, Ghi có</p>
                        </div>

                        <div className="export-field-group">
                            <label className="checkbox-label export-field-header">
                                <input
                                    type="checkbox"
                                    checked={exportDebtFields.detailRows}
                                    onChange={(e) => setExportDebtFields({ ...exportDebtFields, detailRows: e.target.checked })}
                                />
                                Chi tiết từng hàng giao dịch
                            </label>
                            <p className="export-field-desc">Diễn giải chi tiết từng dòng sản phẩm/dịch vụ</p>

                            {exportDebtFields.detailRows && (
                                <div className="export-field-items">
                                    <label className="checkbox-label">
                                        <input type="checkbox" checked={exportDebtFields.dvt} onChange={(e) => setExportDebtFields({ ...exportDebtFields, dvt: e.target.checked })} />
                                        ĐVT
                                    </label>
                                    <label className="checkbox-label">
                                        <input type="checkbox" checked={exportDebtFields.soLuong} onChange={(e) => setExportDebtFields({ ...exportDebtFields, soLuong: e.target.checked })} />
                                        Số lượng
                                    </label>
                                    <label className="checkbox-label">
                                        <input type="checkbox" checked={exportDebtFields.donGia} onChange={(e) => setExportDebtFields({ ...exportDebtFields, donGia: e.target.checked })} />
                                        Đơn giá
                                    </label>
                                    <label className="checkbox-label">
                                        <input type="checkbox" checked={exportDebtFields.giamGia} onChange={(e) => setExportDebtFields({ ...exportDebtFields, giamGia: e.target.checked })} />
                                        Giảm giá
                                    </label>
                                    <label className="checkbox-label">
                                        <input type="checkbox" checked={exportDebtFields.vat} onChange={(e) => setExportDebtFields({ ...exportDebtFields, vat: e.target.checked })} />
                                        VAT
                                    </label>
                                    <label className="checkbox-label">
                                        <input type="checkbox" checked={exportDebtFields.giaNhapTra} onChange={(e) => setExportDebtFields({ ...exportDebtFields, giaNhapTra: e.target.checked })} />
                                        Giá nhập/trả
                                    </label>
                                    <label className="checkbox-label">
                                        <input type="checkbox" checked={exportDebtFields.thanhTien} onChange={(e) => setExportDebtFields({ ...exportDebtFields, thanhTien: e.target.checked })} />
                                        Thành tiền
                                    </label>
                                </div>
                            )}
                        </div>

                        <label className="checkbox-label">
                            <input type="checkbox" checked={exportDebtFields.ghiChu} onChange={(e) => setExportDebtFields({ ...exportDebtFields, ghiChu: e.target.checked })} />
                            Ghi chú
                        </label>
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => setExportDebtModalOpen(false)}>
                            Bỏ qua
                        </button>
                        <button type="button" className="btn btn-primary" onClick={exportDebtToExcel}>
                            Đồng ý
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
