import { useState, useEffect } from 'react';
import { productsAPI } from '../../services/api';
import { MdDownload, MdUpload, MdSync, MdFolder } from 'react-icons/md';
import './StockAdjustment.css';

interface Warehouse {
    id: string;
    name: string;
    code?: string;
}

interface Product {
    id: string;
    name: string;
    sku?: string;
}

interface StockAdjustmentProps {
    warehouses: Warehouse[];
    onSubmit: (data: {
        warehouseId: string;
        productId: string;
        quantity: number;
        type: 'IMPORT' | 'EXPORT' | 'ADJUST';
        note?: string;
    }) => Promise<void>;
    onCancel: () => void;
    isLoading?: boolean;
    defaultType?: 'IMPORT' | 'EXPORT' | 'ADJUST';
}

type MovementType = 'IMPORT' | 'EXPORT' | 'ADJUST';

export default function StockAdjustment({
    warehouses,
    onSubmit,
    onCancel,
    isLoading = false,
    defaultType = 'IMPORT',
}: StockAdjustmentProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [formData, setFormData] = useState({
        warehouseId: '',
        productId: '',
        quantity: '',
        type: defaultType as MovementType,
        note: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [importNote, setImportNote] = useState('');

    // Fetch products on mount
    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const response = await productsAPI.getAll({ limit: 1000 });
            setProducts(response.data?.data || []);
        } catch (error) {
            console.error('Failed to fetch products:', error);
        }
    };

    // Helper to parse numbers from string (handle Vietnamese format)
    const digitsToNumber = (str: string): number => {
        if (!str) return 0;
        return parseInt(String(str).replace(/[^\d]/g, ''), 10) || 0;
    };

    // Helper to find product by name or sku
    const findProduct = (name?: string, sku?: string): Product | undefined => {
        if (!name && !sku) return undefined;
        return products.find(
            (p) =>
                (sku && p.sku?.toLowerCase() === sku.toLowerCase()) ||
                (name && p.name.toLowerCase().includes(name.toLowerCase()))
        );
    };

    // Helper to find warehouse by name or code
    const findWarehouse = (name?: string, code?: string): Warehouse | undefined => {
        if (!name && !code) return undefined;
        return warehouses.find(
            (w) =>
                (code && w.code?.toLowerCase() === code.toLowerCase()) ||
                (name && w.name.toLowerCase().includes(name.toLowerCase()))
        );
    };

    // Get value from headers/row
    const getValue = (
        headers: string[],
        row: string[]
    ): { product?: string; sku?: string; warehouse?: string; warehouseCode?: string; quantity?: string; note?: string } => {
        const get = (names: string[]): string | undefined => {
            for (const n of names) {
                const idx = headers.findIndex((h) => h.toLowerCase().includes(n.toLowerCase()));
                if (idx !== -1 && row[idx]) return row[idx];
            }
            return undefined;
        };
        return {
            product: get(['product', 'tên sản phẩm', 'sản phẩm', 'name']),
            sku: get(['sku', 'mã', 'barcode', 'mã vạch']),
            warehouse: get(['warehouse', 'kho', 'tên kho']),
            warehouseCode: get(['mã kho', 'warehouse code']),
            quantity: get(['quantity', 'số lượng', 'sl']),
            note: get(['note', 'ghi chú', 'notes']),
        };
    };

    // Apply imported data to form
    const applyImportedData = (data: ReturnType<typeof getValue>) => {
        const matchedProduct = findProduct(data.product, data.sku);
        const matchedWarehouse = findWarehouse(data.warehouse, data.warehouseCode);
        const qty = data.quantity ? digitsToNumber(data.quantity) : 0;

        setFormData((prev) => ({
            ...prev,
            productId: matchedProduct ? matchedProduct.id : prev.productId,
            warehouseId: matchedWarehouse ? matchedWarehouse.id : prev.warehouseId,
            quantity: qty > 0 ? String(qty) : prev.quantity,
            note: data.note || prev.note,
        }));

        const messages: string[] = [];
        if (matchedProduct) messages.push(`Sản phẩm: ${matchedProduct.name}`);
        if (matchedWarehouse) messages.push(`Kho: ${matchedWarehouse.name}`);
        if (qty > 0) messages.push(`Số lượng: ${qty}`);
        if (!matchedProduct && data.product) messages.push('(Không tìm thấy sản phẩm, vui lòng chọn thủ công)');
        if (!matchedWarehouse && data.warehouse) messages.push('(Không tìm thấy kho, vui lòng chọn thủ công)');

        setImportNote(messages.length ? `Đã lấy: ${messages.join(', ')}` : 'Không tìm thấy dữ liệu phù hợp');
    };

    // Handle file import
    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const ext = file.name.split('.').pop()?.toLowerCase();
        try {
            if (ext === 'csv') {
                const text = await file.text();
                const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
                if (lines.length < 2) {
                    setImportNote('File CSV cần header và ít nhất 1 dòng dữ liệu.');
                    return;
                }
                const headers = lines[0].split(',').map((h) => h.trim());
                const row = lines[1].split(',').map((c) => c.trim());
                applyImportedData(getValue(headers, row));
                return;
            }

            if (ext === 'xlsx' || ext === 'xls') {
                const XLSX = await import('xlsx');
                const buffer = await file.arrayBuffer();
                const workbook = XLSX.read(buffer, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                const headers = (rows[0] || []).map((h) => String(h || '').trim());
                const row = (rows[1] || []).map((c) => String(c ?? '').trim());
                if (!headers.length || !row.length) {
                    setImportNote('File Excel cần header và ít nhất 1 dòng dữ liệu.');
                    return;
                }
                applyImportedData(getValue(headers, row));
                return;
            }

            if (ext === 'pdf') {
                const pdfjsLib = await import('pdfjs-dist');
                pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
                const buffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
                let text = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    text += content.items.map((item: any) => item.str).join(' ') + '\n';
                }
                // Simple extraction - look for patterns
                const skuMatch = text.match(/(?:sku|mã|barcode)[:\s]*([^\s,]+)/i);
                const qtyMatch = text.match(/(?:số lượng|quantity|sl)[:\s]*(\d+)/i);
                applyImportedData({
                    sku: skuMatch?.[1],
                    quantity: qtyMatch?.[1],
                });
                return;
            }

            setImportNote('Định dạng file không được hỗ trợ. Vui lòng dùng CSV, Excel hoặc PDF.');
        } catch (error) {
            console.error('Import error:', error);
            setImportNote('Lỗi đọc file. Vui lòng kiểm tra định dạng.');
        }

        // Reset file input
        e.target.value = '';
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.warehouseId) {
            newErrors.warehouseId = 'Vui lòng chọn kho';
        }

        if (!formData.productId) {
            newErrors.productId = 'Vui lòng chọn sản phẩm';
        }

        const qty = parseInt(formData.quantity);
        if (!formData.quantity || isNaN(qty) || qty <= 0) {
            newErrors.quantity = 'Số lượng phải lớn hơn 0';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        await onSubmit({
            warehouseId: formData.warehouseId,
            productId: formData.productId,
            quantity: parseInt(formData.quantity),
            type: formData.type,
            note: formData.note || undefined,
        });
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const handleTypeChange = (type: MovementType) => {
        setFormData((prev) => ({ ...prev, type }));
    };

    const getTypeHint = () => {
        switch (formData.type) {
            case 'IMPORT':
                return 'Nhập hàng vào kho (tăng tồn)';
            case 'EXPORT':
                return 'Xuất hàng ra khỏi kho (giảm tồn)';
            case 'ADJUST':
                return 'Điều chỉnh số lượng sau kiểm kê';
            default:
                return '';
        }
    };

    return (
        <form onSubmit={handleSubmit} className="stock-adjustment-form">
            {/* Movement Type */}
            <div className="form-group">
                <label className="form-label">
                    Loại điều chỉnh <span className="required">*</span>
                </label>
                <div className="movement-type-buttons">
                    <button
                        type="button"
                        className={`type-btn ${formData.type === 'IMPORT' ? 'active import' : ''}`}
                        onClick={() => handleTypeChange('IMPORT')}
                    >
                        <span className="type-icon"><MdDownload /></span>
                        <span className="type-label">Nhập kho</span>
                    </button>
                    <button
                        type="button"
                        className={`type-btn ${formData.type === 'EXPORT' ? 'active export' : ''}`}
                        onClick={() => handleTypeChange('EXPORT')}
                    >
                        <span className="type-icon"><MdUpload /></span>
                        <span className="type-label">Xuất kho</span>
                    </button>
                    <button
                        type="button"
                        className={`type-btn ${formData.type === 'ADJUST' ? 'active adjust' : ''}`}
                        onClick={() => handleTypeChange('ADJUST')}
                    >
                        <span className="type-icon"><MdSync /></span>
                        <span className="type-label">Điều chỉnh</span>
                    </button>
                </div>
                <p className="type-hint">{getTypeHint()}</p>
            </div>

            {/* Warehouse */}
            <div className="form-group">
                <label htmlFor="warehouseId" className="form-label">
                    Kho hàng <span className="required">*</span>
                </label>
                <select
                    id="warehouseId"
                    name="warehouseId"
                    value={formData.warehouseId}
                    onChange={handleChange}
                    className={`form-select ${errors.warehouseId ? 'error' : ''}`}
                >
                    <option value="">-- Chọn kho --</option>
                    {warehouses.map((wh) => (
                        <option key={wh.id} value={wh.id}>
                            {wh.name} {wh.code ? `(${wh.code})` : ''}
                        </option>
                    ))}
                </select>
                {errors.warehouseId && <span className="error-text">{errors.warehouseId}</span>}
            </div>

            {/* Product */}
            <div className="form-group">
                <label htmlFor="productId" className="form-label">
                    Sản phẩm <span className="required">*</span>
                </label>
                <select
                    id="productId"
                    name="productId"
                    value={formData.productId}
                    onChange={handleChange}
                    className={`form-select ${errors.productId ? 'error' : ''}`}
                >
                    <option value="">-- Chọn sản phẩm --</option>
                    {products.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name} {p.sku ? `[${p.sku}]` : ''}
                        </option>
                    ))}
                </select>
                {errors.productId && <span className="error-text">{errors.productId}</span>}
            </div>

            {/* Quantity */}
            <div className="form-group">
                <label htmlFor="quantity" className="form-label">
                    Số lượng <span className="required">*</span>
                </label>
                <input
                    type="number"
                    id="quantity"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    className={`form-input ${errors.quantity ? 'error' : ''}`}
                    placeholder="Nhập số lượng"
                    min="1"
                />
                {errors.quantity && <span className="error-text">{errors.quantity}</span>}
            </div>

            {/* Note */}
            <div className="form-group">
                <label htmlFor="note" className="form-label">
                    Ghi chú
                </label>
                <textarea
                    id="note"
                    name="note"
                    value={formData.note}
                    onChange={handleChange}
                    className="form-textarea"
                    placeholder="Nhập ghi chú (tùy chọn)"
                    rows={3}
                />
            </div>

            {/* Import from file */}
            <div className="form-group import-section">
                <label className="form-label">Nhập nhanh từ file</label>
                <div className="import-file-wrapper">
                    <label className="btn-import-file">
                        <span><MdFolder /> Chọn tệp</span>
                        <input
                            type="file"
                            accept=".csv,.xlsx,.xls,.pdf"
                            onChange={handleImport}
                            style={{ display: 'none' }}
                        />
                    </label>
                    <span className="import-hint">Hỗ trợ CSV, Excel (xlsx/xls) hoặc PDF</span>
                </div>
                <p className="import-help">
                    File cần có cột: sản phẩm/sku, kho/mã kho, số lượng
                </p>
                {importNote && (
                    <div className={`import-note ${importNote.includes('Không') || importNote.includes('Lỗi') ? 'error' : 'success'}`}>
                        {importNote}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="form-actions">
                <button type="button" onClick={onCancel} className="btn btn-secondary" disabled={isLoading}>
                    Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                    {isLoading ? (
                        <>
                            <span className="spinner-small"></span>
                            Đang xử lý...
                        </>
                    ) : (
                        'Xác nhận'
                    )}
                </button>
            </div>
        </form>
    );
}
