import { useState } from 'react';
import { MdClose, MdExpandMore, MdExpandLess } from 'react-icons/md';
import * as XLSX from 'xlsx-js-style';
import './ExportDebtModal.css';

interface TransactionItem {
    productCode: string;
    productName: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    salePrice: number;
    totalPrice: number;
}

interface Transaction {
    id: string;
    code: string;
    time: string;
    type: string;
    value: number;
    runningBalance: number;
    items?: TransactionItem[];
    note?: string;
}

interface ExportDebtModalProps {
    isOpen: boolean;
    onClose: () => void;
    customerName: string;
    customerCode?: string;
    customerAddress?: string;
    customerPhone?: string;
    currentDebt: number;
    transactions: Transaction[];
}

type DateRangeOption = 'today' | 'this_week' | '7_days' | '30_days' | 'this_month' |
    'last_month' | 'this_month_lunar' | 'last_month_lunar' | 'this_quarter' |
    'this_year' | 'this_year_lunar' | 'all_time' | 'custom';

const dateRangeOptions: { key: DateRangeOption; label: string }[] = [
    { key: 'today', label: 'Hôm nay' },
    { key: 'this_week', label: 'Tuần này' },
    { key: '7_days', label: '7 ngày qua' },
    { key: '30_days', label: '30 ngày qua' },
    { key: 'this_month', label: 'Tháng này' },
    { key: 'last_month', label: 'Tháng trước' },
    { key: 'this_month_lunar', label: 'Tháng này (âm lịch)' },
    { key: 'last_month_lunar', label: 'Tháng trước (âm lịch)' },
    { key: 'this_quarter', label: 'Quý này' },
    { key: 'this_year', label: 'Năm nay' },
    { key: 'this_year_lunar', label: 'Năm nay (âm lịch)' },
    { key: 'all_time', label: 'Toàn thời gian' },
    { key: 'custom', label: 'Lựa chọn khác' },
];

const detailFields = [
    { key: 'unit', label: 'ĐVT' },
    { key: 'quantity', label: 'Số lượng' },
    { key: 'unitPrice', label: 'Đơn giá' },
    { key: 'discount', label: 'Giảm giá' },
    { key: 'vat', label: 'VAT' },
    { key: 'salePrice', label: 'Giá bán/trả' },
    { key: 'total', label: 'Thành tiền' },
    { key: 'note', label: 'Ghi chú' },
];

export default function ExportDebtModal({
    isOpen,
    onClose,
    customerName,
    customerCode,
    customerAddress, // Used in header row
    customerPhone,
    currentDebt,
    transactions,
}: ExportDebtModalProps) {
    const [selectedDateRange, setSelectedDateRange] = useState<DateRangeOption>('this_month');
    const [showDetails, setShowDetails] = useState(true);
    const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({
        unit: true,
        quantity: true,
        unitPrice: true,
        discount: true,
        vat: true,
        salePrice: true,
        total: true,
        note: true,
    });

    const formatDate = (dateStr: string): string => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('vi-VN');
    };

    const formatDateTime = (dateStr: string): string => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('vi-VN') + '\n' + date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    const getDateRange = (): { from: Date; to: Date } => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (selectedDateRange) {
            case 'today':
                return { from: today, to: now };
            case 'this_week': {
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - today.getDay() + 1);
                return { from: startOfWeek, to: now };
            }
            case '7_days': {
                const sevenDaysAgo = new Date(today);
                sevenDaysAgo.setDate(today.getDate() - 7);
                return { from: sevenDaysAgo, to: now };
            }
            case '30_days': {
                const thirtyDaysAgo = new Date(today);
                thirtyDaysAgo.setDate(today.getDate() - 30);
                return { from: thirtyDaysAgo, to: now };
            }
            case 'this_month':
                return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
            case 'last_month': {
                const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
                return { from: lastMonth, to: lastMonthEnd };
            }
            case 'this_year':
                return { from: new Date(now.getFullYear(), 0, 1), to: now };
            case 'all_time':
            default:
                return { from: new Date(2000, 0, 1), to: now };
        }
    };

    const toggleField = (key: string) => {
        setSelectedFields(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleExport = () => {
        const dateRange = getDateRange();

        // Filter transactions by date range
        const filteredTransactions = transactions.filter(tx => {
            const txDate = new Date(tx.time);
            return txDate >= dateRange.from && txDate <= dateRange.to;
        });

        // Calculate summary
        const totalDebit = filteredTransactions
            .filter(tx => tx.type === 'Bán hàng')
            .reduce((sum, tx) => sum + Math.abs(tx.value), 0);

        // Calculate debt summary
        const openingDebt = 0; // Can be calculated from previous period
        const periodChange = totalDebit;
        const closingDebt = currentDebt;

        // Create workbook
        const wb = XLSX.utils.book_new();

        // Build header rows matching KiotViet format
        const headerRows: (string | number)[][] = [
            ['Công Ty TNHH MTV TM&DV MIXU', '', '', '', '', '', '', '', '', '', '', ''],
            ['Chi nhánh', 'Chi nhánh trung tâm', '', '', '', '', '', '', '', '', '', ''],
            ['Địa chỉ', '119 Nguyễn Hữu Thọ, Quận Hải Châu, Đà Nẵng', '', '', '', '', '', '', '', '', '', ''],
            ['Điện thoại', '02366563583/ 0932542168', '', '', '', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', '', '', '', '', ''],
            ['', '', '', '', 'Công nợ chi tiết khách hàng', '', '', '', '', '', '', ''],
            ['', '', '', '', `Từ ngày ${formatDate(dateRange.from.toISOString())} đến ngày ${formatDate(dateRange.to.toISOString())}`, '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', '', '', '', '', ''],
            ['Khách hàng', customerName, '', '', '', '', '', '', 'Nợ đầu kỳ', '', openingDebt, ''],
            ['Mã KH', customerCode || '', '', '', '', '', '', '', 'Phát sinh trong kỳ', '', periodChange, ''],
            ['Điện thoại', customerPhone || '', '', '', '', '', '', '', 'Nợ cuối kỳ', '', closingDebt, ''],
            ['Địa chỉ KH', customerAddress || '', '', '', '', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', '', '', '', '', ''],
        ];

        // Build table header row based on selected fields
        const tableHeader: (string | number)[] = ['Thời gian', 'Mã', 'Diễn giải'];
        if (showDetails) {
            if (selectedFields.unit) tableHeader.push('ĐVT');
            if (selectedFields.quantity) tableHeader.push('Số lượng');
            if (selectedFields.unitPrice) tableHeader.push('Đơn giá');
            if (selectedFields.discount) tableHeader.push('Giảm giá');
            if (selectedFields.vat) tableHeader.push('VAT');
            if (selectedFields.salePrice) tableHeader.push('Giá bán/trả');
            if (selectedFields.total) tableHeader.push('Thành tiền');
        }
        tableHeader.push('Ghi nợ', 'Ghi có');
        if (showDetails && selectedFields.note) tableHeader.push('Ghi chú');

        const tableData: (string | number)[][] = [tableHeader];

        // DEBUG: Log transactions to check if items are available
        console.log('=== DEBUG ExportDebtModal ===');
        console.log('Total transactions:', filteredTransactions.length);
        filteredTransactions.forEach((tx, idx) => {
            console.log(`Transaction ${idx}:`, tx.code, tx.type, 'items:', tx.items?.length || 0);
            if (tx.items && tx.items.length > 0) {
                console.log('  Items:', tx.items);
            }
        });

        // Add transaction rows with product details
        filteredTransactions.forEach(tx => {
            // Main transaction row
            const mainRow: (string | number)[] = [
                formatDateTime(tx.time),
                tx.code,
                tx.type,
            ];

            if (showDetails) {
                if (selectedFields.unit) mainRow.push('');
                if (selectedFields.quantity) mainRow.push('');
                if (selectedFields.unitPrice) mainRow.push('');
                if (selectedFields.discount) mainRow.push('');
                if (selectedFields.vat) mainRow.push('');
                if (selectedFields.salePrice) mainRow.push('');
                if (selectedFields.total) mainRow.push('');
            }

            // Ghi nợ / Ghi có
            if (tx.type === 'Bán hàng') {
                mainRow.push(Math.abs(tx.value), '');
            } else {
                mainRow.push('', Math.abs(tx.value));
            }

            if (showDetails && selectedFields.note) mainRow.push(tx.note || '');
            tableData.push(mainRow);

            // Product detail rows - loop through items array
            if (showDetails && tx.items && tx.items.length > 0) {
                tx.items.forEach((item) => {
                    const detailRow: (string | number)[] = [
                        '', // Empty time column for detail rows
                        item.productCode || '',
                        item.productName || '',
                    ];

                    if (selectedFields.unit) detailRow.push(item.unit || '');
                    if (selectedFields.quantity) detailRow.push(item.quantity || 0);
                    if (selectedFields.unitPrice) detailRow.push(item.unitPrice || 0);
                    if (selectedFields.discount) detailRow.push(item.discountAmount || 0);
                    if (selectedFields.vat) detailRow.push(0); // VAT not in item, default 0
                    if (selectedFields.salePrice) detailRow.push(item.salePrice || 0);
                    if (selectedFields.total) detailRow.push(item.totalPrice || 0);

                    // Empty Ghi nợ/Ghi có columns for detail rows
                    detailRow.push('', '');
                    if (selectedFields.note) detailRow.push('');

                    tableData.push(detailRow);
                });
            }
        });

        // Footer rows with date and signatures
        const today = new Date();
        const footerRows: (string | number)[][] = [
            ['', '', '', '', '', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', '', '', `Ngày ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()}`, '', ''],
            ['', '', '', '', '', '', '', '', '', '', '', ''],
            ['Khách hàng', '', '', '', '', 'Người lập biểu', '', '', '', 'TM Công ty', '', ''],
            ['(Ký, họ tên)', '', '', '', '', '(Ký, họ tên)', '', '', '', '(Ký, họ tên)', '', ''],
        ];

        // Combine all data
        const allData = [...headerRows, ...tableData, ...footerRows];

        // Create worksheet
        const ws = XLSX.utils.aoa_to_sheet(allData);

        // Define border styles
        const thinBorder = {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } },
        };

        const leftBorder = { left: { style: 'thin', color: { rgb: '000000' } } };
        const bottomBorder = { bottom: { style: 'thin', color: { rgb: '000000' } } };

        // Helper function to apply style to a cell
        const applyStyle = (cellAddr: string, style: any) => {
            if (ws[cellAddr]) {
                ws[cellAddr].s = style;
            }
        };

        // === HEADER SECTION STYLING (Rows 1-4: Company info) ===
        // Company name - Row 1, green bold text with left border
        applyStyle('A1', {
            font: { bold: true, sz: 12, color: { rgb: '006400' } },
            border: leftBorder,
        });

        // Chi nhánh, Địa chỉ, Điện thoại - Rows 2-4, left border only
        ['A2', 'A3', 'A4'].forEach(addr => {
            applyStyle(addr, { border: leftBorder });
        });

        // === TITLE SECTION (Rows 6-7) ===
        // Title "Công nợ chi tiết khách hàng" - centered, bold
        applyStyle('E6', {
            font: { bold: true, sz: 11 },
            alignment: { horizontal: 'center' },
        });
        // Date range subtitle
        applyStyle('E7', {
            font: { italic: true, sz: 10 },
            alignment: { horizontal: 'center' },
        });

        // === CUSTOMER INFO SECTION (Rows 9-12) ===
        // Left side: Customer info with left border
        ['A9', 'A10', 'A11', 'A12'].forEach(addr => {
            applyStyle(addr, {
                font: { bold: true },
                border: leftBorder,
            });
        });

        // Right side: Debt summary (Nợ đầu kỳ, Phát sinh, Nợ cuối kỳ)
        ['I9', 'I10', 'I11'].forEach(addr => {
            applyStyle(addr, { font: { bold: true } });
        });
        // Debt values aligned right
        ['K9', 'K10', 'K11'].forEach(addr => {
            applyStyle(addr, { alignment: { horizontal: 'right' } });
        });

        // === TABLE SECTION ===
        const tableStartRow = headerRows.length; // 0-indexed row where table header starts
        const tableEndRow = tableStartRow + tableData.length - 1;
        const tableCols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

        // Apply borders to table header row (with gray background)
        tableCols.forEach(col => {
            const cellAddr = `${col}${tableStartRow + 1}`;
            if (ws[cellAddr]) {
                ws[cellAddr].s = {
                    font: { bold: true },
                    fill: { fgColor: { rgb: 'E0E0E0' } },
                    border: thinBorder,
                    alignment: { horizontal: 'center', vertical: 'center' },
                };
            }
        });

        // Apply borders to table data rows
        for (let row = tableStartRow + 1; row <= tableEndRow; row++) {
            tableCols.forEach(col => {
                const cellAddr = `${col}${row + 1}`;
                if (ws[cellAddr]) {
                    ws[cellAddr].s = {
                        border: thinBorder,
                        alignment: { vertical: 'center' },
                    };
                }
            });
        }

        // === FOOTER/SIGNATURE SECTION ===
        const signatureRow = allData.length - 1; // Second to last row
        const dateRow = signatureRow - 2;

        // Date - right aligned
        applyStyle(`J${dateRow}`, {
            font: { italic: true },
            alignment: { horizontal: 'right' },
        });

        // Signature labels
        applyStyle(`A${signatureRow}`, { font: { bold: true }, alignment: { horizontal: 'center' } });
        applyStyle(`E${signatureRow}`, { font: { bold: true }, alignment: { horizontal: 'center' } });
        applyStyle(`J${signatureRow}`, { font: { bold: true }, alignment: { horizontal: 'center' } });

        // (Ký, họ tên) labels
        applyStyle(`A${signatureRow + 1}`, { font: { italic: true, color: { rgb: '008000' } }, alignment: { horizontal: 'center' } });
        applyStyle(`E${signatureRow + 1}`, { font: { italic: true }, alignment: { horizontal: 'center' } });
        applyStyle(`J${signatureRow + 1}`, { font: { italic: true, color: { rgb: '008000' } }, alignment: { horizontal: 'center' } });

        // Set column widths for better formatting
        ws['!cols'] = [
            { wch: 10 },  // A - Thời gian
            { wch: 14 },  // B - Mã
            { wch: 16 },  // C - Diễn giải
            { wch: 6 },   // D - ĐVT
            { wch: 9 },   // E - Số lượng
            { wch: 11 },  // F - Đơn giá
            { wch: 9 },   // G - Giảm giá
            { wch: 6 },   // H - VAT
            { wch: 11 },  // I - Giá bán/trả
            { wch: 11 },  // J - Thành tiền
            { wch: 11 },  // K - Ghi nợ
            { wch: 11 },  // L - Ghi có
        ];

        // Set row heights
        ws['!rows'] = [];
        for (let i = 0; i < allData.length; i++) {
            ws['!rows'].push({ hpx: 18 }); // 18 pixels height
        }

        // Merge cells
        ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },  // Company name A1:D1
            { s: { r: 5, c: 3 }, e: { r: 5, c: 8 } },  // Title D6:I6
            { s: { r: 6, c: 3 }, e: { r: 6, c: 8 } },  // Date range D7:I7
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Công nợ');

        // Export with formatted filename
        const dateStr = formatDate(new Date().toISOString()).replace(/\//g, '-');
        const fileName = `CongNo_${customerCode || 'KH'}_${dateStr}.xlsx`;
        XLSX.writeFile(wb, fileName);

        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="export-debt-modal-overlay">
            <div className="export-debt-modal">
                <div className="export-debt-modal-header">
                    <h2>Xuất file công nợ</h2>
                    <button className="export-debt-close-btn" onClick={onClose}>
                        <MdClose size={20} />
                    </button>
                </div>

                <div className="export-debt-modal-body">
                    {/* Date Range Section */}
                    <div className="export-section">
                        <h3 className="section-title">Thời gian</h3>
                        <div className="date-range-pills">
                            {dateRangeOptions.map(option => (
                                <button
                                    key={option.key}
                                    className={`date-pill ${selectedDateRange === option.key ? 'active' : ''}`}
                                    onClick={() => setSelectedDateRange(option.key)}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Export Info Section */}
                    <div className="export-section">
                        <h3 className="section-title">Thông tin xuất file</h3>

                        <div className="export-info-item">
                            <span className="export-info-label">Dữ liệu tổng quan (luôn có)</span>
                            <span className="export-info-sublabel">Thời gian, Mã, Ghi nợ, Ghi có</span>
                        </div>

                        <div className="export-details-toggle">
                            <button
                                className="toggle-btn"
                                onClick={() => setShowDetails(!showDetails)}
                            >
                                {showDetails ? <MdExpandLess /> : <MdExpandMore />}
                                <input
                                    type="checkbox"
                                    checked={showDetails}
                                    onChange={(e) => setShowDetails(e.target.checked)}
                                />
                                <span>Chi tiết từng hàng giao dịch</span>
                            </button>
                            <span className="export-info-sublabel">Diễn giải chi tiết từng dòng sản phẩm/dịch vụ</span>
                        </div>

                        {showDetails && (
                            <div className="export-fields-list">
                                {detailFields.map(field => (
                                    <label key={field.key} className="field-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={selectedFields[field.key]}
                                            onChange={() => toggleField(field.key)}
                                        />
                                        <span>{field.label}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="export-debt-modal-footer">
                    <button className="btn-cancel" onClick={onClose}>
                        Bỏ qua
                    </button>
                    <button className="btn-primary" onClick={handleExport}>
                        Đồng ý
                    </button>
                </div>
            </div>
        </div>
    );
}
