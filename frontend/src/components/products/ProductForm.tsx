import { useEffect, useState } from 'react';
import './ProductForm.css';

interface Category {
  id: string;
  name: string;
}

interface ProductFormData {
  id?: string;
  name: string;
  sku?: string;
  categoryId?: string;
  defaultPrice: number;
  defaultCost?: number;
  images?: string;
}

interface ProductFormProps {
  product?: ProductFormData | null;
  categories: Category[];
  onSubmit: (data: ProductFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ProductForm({
  product,
  categories,
  onSubmit,
  onCancel,
  isLoading = false,
}: ProductFormProps) {
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    sku: '',
    categoryId: '',
    defaultPrice: 0,
    defaultCost: 0,
    images: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [importNote, setImportNote] = useState<string>('');

  useEffect(() => {
    if (product) {
      setFormData({
        id: product.id,
        name: product.name || '',
        sku: product.sku || '',
        categoryId: product.categoryId || '',
        defaultPrice: product.defaultPrice || 0,
        defaultCost: product.defaultCost || 0,
        images: product.images || '',
      });
    }
  }, [product]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Tên sản phẩm là bắt buộc';
    }

    if (formData.defaultPrice < 0) {
      newErrors.defaultPrice = 'Giá bán không được âm';
    }

    if ((formData.defaultCost ?? 0) < 0) {
      newErrors.defaultCost = 'Giá vốn không được âm';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const normalize = (text: string) =>
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '')
      .toLowerCase();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (name === 'defaultPrice' || name === 'defaultCost') {
      const digitsOnly = value.replace(/[^0-9]/g, '');
      const numericValue = digitsOnly === '' ? 0 : Number(digitsOnly);
      setFormData((prev) => ({
        ...prev,
        [name]: numericValue,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === 'number' ? parseFloat(value) || 0 : value,
      }));
    }

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { productsAPI } = await import('../../services/api');
      const response = await productsAPI.uploadImage(file);
      const url = response.data.data?.url || response.data.url;
      setFormData((prev) => ({ ...prev, images: url }));
    } catch (error) {
      console.error('Upload failed', error);
      alert('Không thể tải ảnh lên, vui lòng thử lại');
    }
  };

  const getValue = (headers: string[], row: string[]) => {
    const headerMap = headers.map(normalize);
    const find = (aliases: string[]) => {
      const target = aliases.map(normalize);
      const idx = headerMap.findIndex((h) => target.includes(h));
      return idx >= 0 ? row[idx]?.trim() ?? '' : '';
    };
    return {
      name: find(['name', 'ten', 'ten san pham', 'ten sp', 'tensanpham', 'tên sản phẩm']),
      sku: find(['sku', 'ma', 'ma sp', 'barcode', 'ma vach', 'mavach', 'mã', 'mã sp']),
      category: find(['category', 'danh muc', 'danhmuc', 'danh muc sp', 'danh mục']),
      price: find(['price', 'gia ban', 'giaban', 'defaultprice', 'giá bán']),
      cost: find(['cost', 'gia von', 'giavon', 'defaultcost', 'giá vốn']),
    };
  };

  const applyImportedData = (data: { name?: string; sku?: string; category?: string; price?: string; cost?: string }) => {
    const digitsToNumber = (val: string | undefined) => {
      if (!val) return 0;
      const digits = val.replace(/[^0-9]/g, '');
      return digits ? Number(digits) : 0;
    };

    const matchedCategory = categories.find(
      (c) => normalize(c.name) === normalize(data.category || '')
    );

    setFormData((prev) => ({
      ...prev,
      name: data.name || prev.name,
      sku: data.sku || prev.sku,
      categoryId: matchedCategory ? matchedCategory.id : prev.categoryId,
      defaultPrice: data.price ? digitsToNumber(data.price) : prev.defaultPrice,
      defaultCost: data.cost ? digitsToNumber(data.cost) : prev.defaultCost,
    }));

    setImportNote(
      `Đã lấy dữ liệu từ file${data.category && !matchedCategory ? ' (không khớp danh mục, vui lòng chọn thủ công)' : ''}.`
    );
  };

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
        const pdfjs = await import('pdfjs-dist');
        const pdfData = new Uint8Array(await file.arrayBuffer());
        const pdf = await pdfjs.getDocument({ data: pdfData }).promise;
        const page = await pdf.getPage(1);
        const txt = await page.getTextContent();
        const textContent = txt.items.map((i: any) => i.str).join(' ');
        const lines = textContent.split(/\n|;/).map((l) => l.trim()).filter(Boolean);
        if (lines.length < 2) {
          setImportNote('Không đọc được bảng từ PDF. Vui lòng xuất PDF sang CSV/Excel.');
          return;
        }
        const splitLine = (line: string) =>
          line.split(/[,;\t]+|\s{2,}/).map((c) => c.trim()).filter(Boolean);
        const headers = splitLine(lines[0]);
        const row = splitLine(lines[1]);
        applyImportedData(getValue(headers, row));
        return;
      }

      setImportNote('Định dạng không hỗ trợ. Vui lòng dùng CSV, Excel hoặc PDF chứa bảng.');
    } catch (err) {
      console.error('Import failed:', err);
      setImportNote('Có lỗi khi đọc file. Vui lòng kiểm tra định dạng và thử lại.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await onSubmit(formData);
  };

  const toNumber = (val: unknown) => {
    if (typeof val === 'number' && Number.isFinite(val)) return val;
    if (typeof val === 'string') {
      const digits = val.replace(/[^0-9-]/g, '');
      return digits ? Number(digits) : 0;
    }
    return 0;
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value);

  const formatCurrencyWithUnit = (value: number) => `${formatCurrency(value)} VND`;

  const sale = toNumber(formData.defaultPrice);
  const cost = toNumber(formData.defaultCost ?? 0);
  const profit = sale - cost;

  return (
    <form onSubmit={handleSubmit} className="product-form">
      <div className="form-group">
        <label htmlFor="name" className="form-label">
          Tên sản phẩm <span className="required">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className={`form-input ${errors.name ? 'error' : ''}`}
          placeholder="Nhập tên sản phẩm"
          autoFocus
        />
        {errors.name && <span className="error-text">{errors.name}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="sku" className="form-label">
          Mã SKU / Mã vạch
        </label>
        <input
          type="text"
          id="sku"
          name="sku"
          value={formData.sku}
          onChange={handleChange}
          className="form-input"
          placeholder="Nhập mã sản phẩm"
        />
      </div>

      <div className="form-group">
        <label htmlFor="categoryId" className="form-label">
          Danh mục
        </label>
        <select
          id="categoryId"
          name="categoryId"
          value={formData.categoryId}
          onChange={handleChange}
          className="form-select"
        >
          <option value="">-- Chọn danh mục --</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="defaultPrice" className="form-label">
            Giá bán (VND)
          </label>
          <input
            type="text"
            inputMode="numeric"
            id="defaultPrice"
            name="defaultPrice"
            value={sale === 0 ? '' : formatCurrency(sale)}
            onChange={handleChange}
            className={`form-input ${errors.defaultPrice ? 'error' : ''}`}
            placeholder="Nhập giá bán"
          />
          {sale > 0 && (
            <span className="currency-preview">{formatCurrencyWithUnit(sale)}</span>
          )}
          {errors.defaultPrice && <span className="error-text">{errors.defaultPrice}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="defaultCost" className="form-label">
            Giá vốn (VND)
          </label>
          <input
            type="text"
            inputMode="numeric"
            id="defaultCost"
            name="defaultCost"
            value={cost === 0 ? '' : formatCurrency(cost)}
            onChange={handleChange}
            className={`form-input ${errors.defaultCost ? 'error' : ''}`}
            placeholder="Nhập giá vốn"
          />
          {cost > 0 && (
            <span className="currency-preview">{formatCurrencyWithUnit(cost)}</span>
          )}
          {errors.defaultCost && <span className="error-text">{errors.defaultCost}</span>}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Ảnh sản phẩm</label>
        <div className="image-upload-content">
          <input
            type="file"
            onChange={handleImageUpload}
            accept="image/*"
            className="form-input"
          />
          {formData.images && (
            <div className="image-preview" style={{ marginTop: '10px' }}>
              <img
                src={formData.images}
                alt="Product Preview"
                style={{
                  width: '100px',
                  height: '100px',
                  objectFit: 'cover',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Nhập nhanh từ file</label>
        <div className="import-row">
          <input
            type="file"
            accept=".csv,.xlsx,.xls,.pdf"
            onChange={handleImport}
            aria-label="Chọn file để nhập sản phẩm"
          />
          <small className="hint">
            Hỗ trợ CSV, Excel (xlsx/xls) hoặc PDF chứa bảng có cột: name, sku, category, price, cost.
          </small>
          {importNote && <small className="hint success">{importNote}</small>}
        </div>
      </div>

      {sale > 0 && cost > 0 && (
        <div className="profit-preview">
          <span className="profit-label">Lợi nhuận dự kiến:</span>
          <span className={`profit-value ${profit >= 0 ? 'positive' : 'negative'}`}>
            {formatCurrencyWithUnit(profit)}
            <small>({((profit / (cost || 1)) * 100).toFixed(1)}%)</small>
          </span>
        </div>
      )}

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn btn-secondary" disabled={isLoading}>
          Huỷ
        </button>
        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          {isLoading ? (
            <>
              <span className="spinner-small"></span>
              Đang lưu...
            </>
          ) : product ? (
            'Cập nhật'
          ) : (
            'Thêm mới'
          )}
        </button>
      </div>
    </form>
  );
}
