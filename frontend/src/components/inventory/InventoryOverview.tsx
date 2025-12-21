import React, { useState, useEffect, useCallback, useRef } from 'react';
import { inventoryAPI, warehousesAPI } from '../../services/api';
import Modal from '../shared/Modal';
import { Toast, useToast } from '../shared/Toast';
import StockAdjustment from './StockAdjustment';
import {
    MdSearch,
    MdInventory,
    MdFileUpload,
    MdFileDownload,
    MdAdd,
    MdRemove,
    MdTune,
    MdExpandMore,
} from 'react-icons/md';
import * as XLSX from 'xlsx';
import './InventoryOverview.css';

interface InventoryReportItem {
    id: string;
    productCode: string;
    productName: string;
    unit: string;
    beginningQty: number;
    beginningValue: number;
    importQty: number;
    importValue: number;
    exportQty: number;
    exportValue: number;
    endingQty: number;
    endingValue: number;
    unitCost: number;
}

interface Warehouse {
    id: string;
    name: string;
    code?: string;
}

interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
}

interface ReportTotals {
    beginningQty: number;
    beginningValue: number;
    importQty: number;
    importValue: number;
    exportQty: number;
    exportValue: number;
    endingQty: number;
    endingValue: number;
}

export default function InventoryOverview() {
    const [reportData, setReportData] = useState<InventoryReportItem[]>([]);
    const [totals, setTotals] = useState<ReportTotals | null>(null);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState<PaginationMeta>({
        page: 1,
        limit: 50,
        total: 0,
    });

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [warehouseFilter, setWarehouseFilter] = useState('');

    // Date range for period (default: current month)
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const [fromDate, setFromDate] = useState(firstOfMonth);
    const [toDate, setToDate] = useState(lastOfMonth);

    // Modals
    const [isAdjustOpen, setIsAdjustOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showExportDropdown, setShowExportDropdown] = useState(false);

    // File import
    const fileInputRef = useRef<HTMLInputElement>(null);

    const toast = useToast();

    // Fetch warehouses on mount
    useEffect(() => {
        fetchWarehouses();
    }, []);

    // Fetch report when filters change
    useEffect(() => {
        fetchReport();
    }, [warehouseFilter, fromDate, toDate, pagination.page]);

    const fetchWarehouses = async () => {
        try {
            const response = await warehousesAPI.getAll();
            setWarehouses(response.data?.data || response.data || []);
        } catch (error) {
            console.error('Failed to fetch warehouses:', error);
        }
    };

    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const response = await inventoryAPI.getReport({
                warehouseId: warehouseFilter || undefined,
                fromDate,
                toDate,
                search: searchTerm || undefined,
                page: pagination.page,
                limit: pagination.limit,
            });

            const data = response.data?.data || response.data;
            setReportData(data.data || []);
            setTotals(data.totals || null);
            if (data.meta) {
                setPagination((prev) => ({
                    ...prev,
                    total: data.meta.total,
                }));
            }
        } catch (error) {
            console.error('Failed to fetch inventory report:', error);
            toast.error('Không thể tải báo cáo tồn kho');
        } finally {
            setLoading(false);
        }
    }, [warehouseFilter, fromDate, toDate, searchTerm, pagination.page, pagination.limit]);

    const handleAdjustSubmit = async (data: {
        warehouseId: string;
        productId: string;
        quantity: number;
        type: 'IMPORT' | 'EXPORT' | 'ADJUST';
        note?: string;
    }) => {
        setIsSubmitting(true);
        try {
            await inventoryAPI.adjustStock(data);
            const typeLabel = data.type === 'IMPORT' ? 'Nhập kho' : data.type === 'EXPORT' ? 'Xuất kho' : 'Điều chỉnh';
            toast.success(`${typeLabel} thành công`);
            setIsAdjustOpen(false);
            setIsImportOpen(false);
            setIsExportOpen(false);
            fetchReport();
        } catch (error: any) {
            const message = error.response?.data?.message;
            if (message === 'INSUFFICIENT_STOCK') {
                toast.error('Tồn kho không đủ để xuất');
            } else {
                toast.error(message || 'Có lỗi xảy ra');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSearch = () => {
        setPagination((prev) => ({ ...prev, page: 1 }));
        fetchReport();
    };

    // Excel Import
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];

            // Get raw data as array of arrays to handle merged headers
            const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            console.log('Raw sheet data (first 10 rows):', rawData.slice(0, 10));

            // Find the main header row containing "Mã hàng", "Tên hàng"
            let headerRowIndex = -1;
            for (let i = 0; i < Math.min(10, rawData.length); i++) {
                const row = rawData[i];
                if (!row || row.length < 2) continue;

                const rowText = row.map(cell => String(cell || '').toLowerCase()).join(' ');
                // Look for row with both "mã" and "tên" 
                if (rowText.includes('mã') && rowText.includes('tên')) {
                    headerRowIndex = i;
                    console.log('Found main header row at index:', i, row);
                    break;
                }
            }

            if (headerRowIndex === -1) {
                toast.error('Không tìm thấy dòng header. Cần có cột: Mã hàng, Tên hàng');
                return;
            }

            const mainHeaders = rawData[headerRowIndex].map((h: any) => String(h || '').trim().toLowerCase());
            console.log('Main headers:', mainHeaders);

            // Check if next row is sub-headers (Số lượng, Giá trị)
            let dataStartIndex = headerRowIndex + 1;
            const nextRow = rawData[headerRowIndex + 1];
            if (nextRow) {
                const nextRowText = nextRow.map((c: any) => String(c || '').toLowerCase()).join(' ');
                if (nextRowText.includes('số lượng') || nextRowText.includes('giá trị')) {
                    console.log('Found sub-header row:', nextRow);
                    dataStartIndex = headerRowIndex + 2;
                }
            }

            // Find column indices based on main headers (with null safety)
            const codeIdx = mainHeaders.findIndex(h => h?.includes('mã hàng') || h?.includes('mã sp') || h === 'mã' || h?.includes('sku'));
            const nameIdx = mainHeaders.findIndex(h => h?.includes('tên hàng') || h?.includes('tên sp') || h === 'tên');
            const unitIdx = mainHeaders.findIndex(h => h?.includes('đvt') || h?.includes('đơn vị'));

            // For inventory report format with merged cells, quantity is typically at:
            // Position of "Cuối kỳ" or if not found, position of "Nhập kho"
            let qtyIdx = mainHeaders.findIndex(h => h?.includes('cuối kỳ'));
            if (qtyIdx === -1) {
                qtyIdx = mainHeaders.findIndex(h => h?.includes('nhập kho'));
            }
            if (qtyIdx === -1) {
                qtyIdx = mainHeaders.findIndex(h => h?.includes('số lượng'));
            }
            // If still not found, use a fixed offset (typically Cuối kỳ-SL is at index 9 in your format)
            if (qtyIdx === -1 && mainHeaders.length >= 10) {
                qtyIdx = 9; // Cuối kỳ - Số lượng
            }

            console.log('Column indices - code:', codeIdx, 'name:', nameIdx, 'unit:', unitIdx, 'qty:', qtyIdx);

            if (codeIdx === -1 && nameIdx === -1) {
                toast.error(`Không tìm thấy cột Mã hàng hoặc Tên hàng. Headers: ${mainHeaders.join(', ')}`);
                return;
            }

            // Get data rows (skip header rows)
            const dataRows = rawData.slice(dataStartIndex);
            console.log('Data rows count:', dataRows.length);

            // Parse data rows
            const items = dataRows
                .filter((row: any[]) => row && row.length > 0)
                .map((row: any[]) => {
                    const code = codeIdx >= 0 ? String(row[codeIdx] || '').trim() : '';
                    const name = nameIdx >= 0 ? String(row[nameIdx] || '').trim() : '';
                    let qty = 1;
                    if (qtyIdx >= 0 && row[qtyIdx] !== undefined && row[qtyIdx] !== null && row[qtyIdx] !== '') {
                        qty = Math.max(0, parseInt(row[qtyIdx]) || 0);
                    }

                    return {
                        productCode: code,
                        productName: name,
                        warehouseId: warehouseFilter || warehouses[0]?.id || '',
                        quantity: Math.max(1, qty), // minimum 1
                        type: 'IMPORT' as const,
                        note: 'Import từ Excel',
                    };
                })
                .filter(item => (item.productCode || item.productName) && item.quantity > 0);

            console.log('Parsed items (first 5):', items.slice(0, 5));
            console.log('Total valid items:', items.length);

            if (items.length === 0) {
                toast.error('File không có dữ liệu hợp lệ. Cần có cột "Mã hàng" hoặc "Tên hàng".');
                return;
            }

            if (!items[0].warehouseId) {
                toast.error('Vui lòng chọn kho trước khi import');
                return;
            }

            // Call bulk import API
            const response = await inventoryAPI.bulkAdjust({ items });
            const result = response.data?.data || response.data;

            console.log('Import result:', result);

            if (result.success) {
                toast.success(`Import thành công ${result.successCount} sản phẩm`);
            } else {
                toast.error(`Import: ${result.successCount} thành công, ${result.failCount} thất bại`);
            }

            fetchReport();
        } catch (error: any) {
            console.error('File import error:', error);
            const message = error.response?.data?.message || 'Có lỗi khi import file Excel';
            toast.error(message);
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    // Excel Export
    const handleExport = (format: 'excel' | 'csv') => {
        setShowExportDropdown(false);

        const exportData = reportData.map((item) => ({
            'Mã hàng': item.productCode,
            'Tên hàng': item.productName,
            'ĐVT': item.unit,
            'Đầu kỳ - SL': item.beginningQty,
            'Đầu kỳ - GT': item.beginningValue,
            'Nhập kho - SL': item.importQty,
            'Nhập kho - GT': item.importValue,
            'Xuất kho - SL': item.exportQty,
            'Xuất kho - GT': item.exportValue,
            'Cuối kỳ - SL': item.endingQty,
            'Cuối kỳ - GT': item.endingValue,
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Báo cáo tồn kho');

        const filename = `bao_cao_ton_kho_${fromDate}_${toDate}.${format === 'excel' ? 'xlsx' : 'csv'}`;
        XLSX.writeFile(workbook, filename);
        toast.success('Xuất file thành công');
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN').format(value);
    };

    const openAdjustModal = (type: 'IMPORT' | 'EXPORT' | 'ADJUST') => {
        if (type === 'IMPORT') setIsImportOpen(true);
        else if (type === 'EXPORT') setIsExportOpen(true);
        else setIsAdjustOpen(true);
    };

    return (
        <div className="inventory-overview">
            <Toast toasts={toast.toasts} onRemove={toast.removeToast} />
            <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx,.xls,.csv"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
            />

            {/* Toolbar */}
            <div className="inventory-toolbar">
                <div className="toolbar-filters">
                    <div className="search-box">
                        <span className="search-icon"><MdSearch /></span>
                        <input
                            type="text"
                            placeholder="Tìm theo mã, tên hàng..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            className="search-input"
                        />
                    </div>
                    <select
                        value={warehouseFilter}
                        onChange={(e) => {
                            setWarehouseFilter(e.target.value);
                            setPagination((prev) => ({ ...prev, page: 1 }));
                        }}
                        className="filter-select"
                    >
                        <option value="">Tất cả kho</option>
                        {warehouses.map((wh) => (
                            <option key={wh.id} value={wh.id}>
                                {wh.name}
                            </option>
                        ))}
                    </select>
                    <div className="date-range">
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="date-input"
                        />
                        <span className="date-separator">đến</span>
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="date-input"
                        />
                    </div>
                </div>
                <div className="toolbar-actions">
                    <button onClick={() => openAdjustModal('IMPORT')} className="btn-action btn-import">
                        <MdAdd /> Nhập kho
                    </button>
                    <button onClick={() => openAdjustModal('EXPORT')} className="btn-action btn-export">
                        <MdRemove /> Xuất kho
                    </button>
                    <button onClick={() => openAdjustModal('ADJUST')} className="btn-action btn-adjust">
                        <MdTune /> Điều chỉnh
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="btn-action btn-file">
                        <MdFileUpload /> Import file
                    </button>
                    <div className="export-dropdown-wrapper">
                        <button
                            onClick={() => setShowExportDropdown(!showExportDropdown)}
                            className="btn-action btn-file"
                        >
                            <MdFileDownload /> Xuất file <MdExpandMore />
                        </button>
                        {showExportDropdown && (
                            <div className="export-dropdown">
                                <button onClick={() => handleExport('excel')}>Xuất Excel (.xlsx)</button>
                                <button onClick={() => handleExport('csv')}>Xuất CSV</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="inventory-table-wrapper">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner-large"></div>
                        <p>Đang tải dữ liệu...</p>
                    </div>
                ) : reportData.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon"><MdInventory size={64} /></div>
                        <h3>Chưa có dữ liệu tồn kho</h3>
                        <p>Thêm sản phẩm vào kho bằng cách nhập kho hoặc điều chỉnh</p>
                    </div>
                ) : (
                    <table className="inventory-report-table">
                        <thead>
                            <tr className="header-row-1">
                                <th rowSpan={2}>Mã hàng</th>
                                <th rowSpan={2}>Tên hàng</th>
                                <th rowSpan={2}>ĐVT</th>
                                <th colSpan={2} className="header-group">Đầu kỳ</th>
                                <th colSpan={2} className="header-group">Nhập kho</th>
                                <th colSpan={2} className="header-group">Xuất kho</th>
                                <th colSpan={2} className="header-group">Cuối kỳ</th>
                            </tr>
                            <tr className="header-row-2">
                                <th className="num-col">Số lượng</th>
                                <th className="num-col">Giá trị</th>
                                <th className="num-col">Số lượng</th>
                                <th className="num-col">Giá trị</th>
                                <th className="num-col">Số lượng</th>
                                <th className="num-col">Giá trị</th>
                                <th className="num-col">Số lượng</th>
                                <th className="num-col">Giá trị</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.map((item) => (
                                <tr key={item.id}>
                                    <td className="code-cell">{item.productCode}</td>
                                    <td className="name-cell">{item.productName}</td>
                                    <td className="unit-cell">{item.unit}</td>
                                    <td className="num-cell">{formatCurrency(item.beginningQty)}</td>
                                    <td className="num-cell">{formatCurrency(item.beginningValue)}</td>
                                    <td className="num-cell import-cell">{formatCurrency(item.importQty)}</td>
                                    <td className="num-cell import-cell">{formatCurrency(item.importValue)}</td>
                                    <td className="num-cell export-cell">{formatCurrency(item.exportQty)}</td>
                                    <td className="num-cell export-cell">{formatCurrency(item.exportValue)}</td>
                                    <td className="num-cell ending-cell">{formatCurrency(item.endingQty)}</td>
                                    <td className="num-cell ending-cell">{formatCurrency(item.endingValue)}</td>
                                </tr>
                            ))}
                        </tbody>
                        {totals && (
                            <tfoot>
                                <tr className="totals-row">
                                    <td colSpan={3}><strong>Tổng cộng</strong></td>
                                    <td className="num-cell"><strong>{formatCurrency(totals.beginningQty)}</strong></td>
                                    <td className="num-cell"><strong>{formatCurrency(totals.beginningValue)}</strong></td>
                                    <td className="num-cell"><strong>{formatCurrency(totals.importQty)}</strong></td>
                                    <td className="num-cell"><strong>{formatCurrency(totals.importValue)}</strong></td>
                                    <td className="num-cell"><strong>{formatCurrency(totals.exportQty)}</strong></td>
                                    <td className="num-cell"><strong>{formatCurrency(totals.exportValue)}</strong></td>
                                    <td className="num-cell"><strong>{formatCurrency(totals.endingQty)}</strong></td>
                                    <td className="num-cell"><strong>{formatCurrency(totals.endingValue)}</strong></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                )}
            </div>

            {/* Pagination */}
            {pagination.total > pagination.limit && (
                <div className="pagination">
                    <button
                        onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                        disabled={pagination.page === 1}
                        className="pagination-btn"
                    >
                        Trước
                    </button>
                    <span className="pagination-info">
                        Trang {pagination.page} / {Math.ceil(pagination.total / pagination.limit)}
                    </span>
                    <button
                        onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                        disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
                        className="pagination-btn"
                    >
                        Sau
                    </button>
                </div>
            )}

            {/* Import Modal */}
            <Modal
                isOpen={isImportOpen}
                onClose={() => setIsImportOpen(false)}
                title="Nhập kho"
                size="md"
            >
                <StockAdjustment
                    warehouses={warehouses}
                    onSubmit={(data) => handleAdjustSubmit({ ...data, type: 'IMPORT' })}
                    onCancel={() => setIsImportOpen(false)}
                    isLoading={isSubmitting}
                    defaultType="IMPORT"
                />
            </Modal>

            {/* Export Modal */}
            <Modal
                isOpen={isExportOpen}
                onClose={() => setIsExportOpen(false)}
                title="Xuất kho"
                size="md"
            >
                <StockAdjustment
                    warehouses={warehouses}
                    onSubmit={(data) => handleAdjustSubmit({ ...data, type: 'EXPORT' })}
                    onCancel={() => setIsExportOpen(false)}
                    isLoading={isSubmitting}
                    defaultType="EXPORT"
                />
            </Modal>

            {/* Adjust Modal */}
            <Modal
                isOpen={isAdjustOpen}
                onClose={() => setIsAdjustOpen(false)}
                title="Điều chỉnh tồn kho"
                size="md"
            >
                <StockAdjustment
                    warehouses={warehouses}
                    onSubmit={handleAdjustSubmit}
                    onCancel={() => setIsAdjustOpen(false)}
                    isLoading={isSubmitting}
                />
            </Modal>
        </div>
    );
}
