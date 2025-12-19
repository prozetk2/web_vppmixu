import { useState, useEffect, useRef } from 'react';
import { suppliersAPI } from '../../services/api';
import Modal from '../shared/Modal';
import { Toast, useToast } from '../shared/Toast';
import * as XLSX from 'xlsx';
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
    MdHourglassEmpty
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

            {/* Header */}
            <div className="supplier-header">
                <h2><MdLocalShipping /> Nhà cung cấp</h2>
                <div className="header-actions">
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

            {/* Search & Filter Bar */}
            <div className="search-filter-bar">
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
                <button
                    className={`btn-filter-toggle ${showFilters ? 'active' : ''}`}
                    onClick={() => setShowFilters(!showFilters)}
                >
                    <MdFilterList />
                </button>
            </div>

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
                                            <tr key={supplier.id}>
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
                                                        <button className="btn-edit" onClick={() => openEditModal(supplier)} title="Sửa">
                                                            <MdEdit />
                                                        </button>
                                                        <button className="btn-delete" onClick={() => handleDelete(supplier)} title="Xóa">
                                                            <MdDelete />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
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
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Mã NCC</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                placeholder="Tự động tạo nếu để trống"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">
                                Tên nhà cung cấp <span className="required">*</span>
                            </label>
                            <input
                                type="text"
                                className={`form-input ${errors.name ? 'error' : ''}`}
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Nhập tên nhà cung cấp"
                            />
                            {errors.name && <span className="error-text">{errors.name}</span>}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input
                                type="email"
                                className="form-input"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="email@example.com"
                            />
                        </div>
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
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Công ty</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.company}
                                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                placeholder="Tên công ty"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Mã số thuế</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.taxNumber}
                                onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                                placeholder="MST"
                            />
                        </div>
                    </div>

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
                                placeholder="Khu vực"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Phường/Xã</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.ward}
                                onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                                placeholder="Phường/Xã"
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Nhóm NCC</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.supplierGroup}
                                onChange={(e) => setFormData({ ...formData, supplierGroup: e.target.value })}
                                placeholder="Nhóm nhà cung cấp"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Trạng thái</label>
                            <select
                                className="form-input"
                                value={formData.active ? 'active' : 'inactive'}
                                onChange={(e) => setFormData({ ...formData, active: e.target.value === 'active' })}
                            >
                                <option value="active">Đang hoạt động</option>
                                <option value="inactive">Ngừng hoạt động</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Ghi chú</label>
                        <textarea
                            className="form-input"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Ghi chú về nhà cung cấp"
                            rows={3}
                        />
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={closeFormModal}>
                            Hủy
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={submitting}>
                            {submitting ? 'Đang lưu...' : (editingSupplier ? 'Cập nhật' : 'Thêm mới')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
