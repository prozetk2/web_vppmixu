import { useEffect, useState, useMemo, useCallback } from 'react';
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
  unit?: string;
  baseUnitCode?: string;
  conversionRate?: number;
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
    unit: 'Cái',
    baseUnitCode: 'Cái',
    conversionRate: 1,
    defaultPrice: 0,
    defaultCost: 0,
    images: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [importNote, setImportNote] = useState<string>('');
  const [categorySearch, setCategorySearch] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [localPreviews, setLocalPreviews] = useState<string[]>(Array(10).fill(''));

  // Helper to remove accents for searching
  const removeAccents = (str: string) => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  };

  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categories;
    const searchTerm = removeAccents(categorySearch);
    return categories.filter((c) => removeAccents(c.name).includes(searchTerm));
  }, [categories, categorySearch]);

  useEffect(() => {
    if (product) {
      setFormData({
        id: product.id,
        name: product.name || '',
        sku: product.sku || '',
        categoryId: product.categoryId || '',
        unit: product.unit || 'Cái',
        baseUnitCode: product.baseUnitCode || product.unit || 'Cái',
        conversionRate: product.conversionRate || 1,
        defaultPrice: product.defaultPrice || 0,
        defaultCost: product.defaultCost || 0,
        images: product.images || '',
      });
    } else {
      setFormData({
        name: '',
        sku: '',
        categoryId: '',
        unit: 'Cái',
        baseUnitCode: 'Cái',
        conversionRate: 1,
        defaultPrice: 0,
        defaultCost: 0,
        images: '',
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

    if ((formData.conversionRate ?? 1) < 1) {
      newErrors.conversionRate = 'Tỷ lệ quy đổi phải từ 1 trở lên';
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

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (name === 'defaultPrice' || name === 'defaultCost' || name === 'conversionRate') {
      const digitsOnly = value.replace(/[^0-9]/g, '');
      const numericValue = digitsOnly === '' ? (name === 'conversionRate' ? 1 : 0) : Number(digitsOnly);
      setFormData((prev) => ({
        ...prev,
        [name]: numericValue,
      }));
    } else {
      setFormData((prev) => {
        const nextValue = type === 'number' ? parseFloat(value) || 0 : value;
        const nextState = {
          ...prev,
          [name]: nextValue,
        } as ProductFormData;

        if (
          name === 'unit' &&
          (
            !prev.baseUnitCode ||
            prev.baseUnitCode === prev.unit
          )
        ) {
          nextState.baseUnitCode = String(nextValue || '');
        }

        return nextState;
      });
    }

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  }, [errors]);

  const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.75): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Canvas context not found'));
          
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (!blob) return reject(new Error('Blob creation failed'));
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          }, 'image/jpeg', quality);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const originalFile = e.target.files?.[0];
    if (!originalFile) return;

    // Local preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
      setLocalPreviews((prev) => {
        const newPreviews = [...prev];
        newPreviews[index] = reader.result as string;
        return newPreviews;
      });
    };
    reader.readAsDataURL(originalFile);

    setIsUploading(true);
    try {
      // Always compress images to optimize storage and loading
      const fileToUpload = await compressImage(originalFile);
      
      console.log(`Image size: original=${(originalFile.size/1024).toFixed(1)}KB, compressed=${(fileToUpload.size/1024).toFixed(1)}KB`);

      const { productsAPI } = await import('../../services/api');
      const response = await productsAPI.uploadImage(fileToUpload);
      const url = response.data.data?.url || response.data.url;
      
      // Update images string (comma-separated URLs)
      setFormData((prev) => {
        const currentImages = prev.images ? prev.images.split(',').filter(Boolean) : [];
        currentImages[index] = url;
        return { ...prev, images: currentImages.filter(Boolean).join(',') };
      });
      
      // Clear local preview for this index
      setLocalPreviews((prev) => {
        const newPreviews = [...prev];
        newPreviews[index] = '';
        return newPreviews;
      });
    } catch (error: any) {
      console.error('Upload failed', error);
      const msg = error.response?.data?.message || 'Không thể tải ảnh lên, file có thể quá lớn hoặc lỗi server';
      alert(msg);
      setLocalPreviews((prev) => {
        const newPreviews = [...prev];
        newPreviews[index] = '';
        return newPreviews;
      });
    } finally {
      setIsUploading(false);
    }
  }, []);

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

    await onSubmit({
      ...formData,
      baseUnitCode: formData.baseUnitCode || formData.unit || 'Cái',
      conversionRate: formData.conversionRate || 1,
    });
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

      <div className="form-group" style={{ position: 'relative' }}>
        <label htmlFor="categoryId" className="form-label">Danh mục</label>
        <div className="select-search-container">
          <input
            type="text"
            className="form-input"
            placeholder={
              formData.categoryId
                ? categories.find(c => c.id === formData.categoryId)?.name || 'Tìm danh mục...'
                : '-- Chọn danh mục -- (Gõ để tìm)'
            }
            value={categorySearch}
            onChange={(e) => {
              setCategorySearch(e.target.value);
              setShowCategoryDropdown(true);
              if (formData.categoryId && e.target.value !== categories.find(c => c.id === formData.categoryId)?.name) {
                setFormData({ ...formData, categoryId: '' });
              }
            }}
            onFocus={() => setShowCategoryDropdown(true)}
            onBlur={() => setTimeout(() => setShowCategoryDropdown(false), 200)}
          />
          {showCategoryDropdown && (
            <div className="select-dropdown-list">
              {filteredCategories.length > 0 ? (
                filteredCategories.slice(0, 50).map((cat) => (
                  <div
                    key={cat.id}
                    className="select-dropdown-item"
                    onMouseDown={() => {
                      setFormData({ ...formData, categoryId: cat.id });
                      setCategorySearch(''); // Clear search to show placeholder
                      setShowCategoryDropdown(false);
                    }}
                  >
                    {cat.name}
                  </div>
                ))
              ) : (
                <div className="select-dropdown-empty">Không tìm thấy danh mục</div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="unit" className="form-label">
          Đơn vị bán / hiển thị
        </label>
        <input
          type="text"
          id="unit"
          name="unit"
          value={formData.unit || ''}
          onChange={handleChange}
          className="form-input"
          placeholder="VD: Cái, Hộp, Thùng, Kg..."
        />
        <small className="hint">
          Đây là đơn vị mặc định khi bán hàng hoặc in hóa đơn.
        </small>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="baseUnitCode" className="form-label">
            Đơn vị cơ bản
          </label>
          <input
            type="text"
            id="baseUnitCode"
            name="baseUnitCode"
            value={formData.baseUnitCode || ''}
            onChange={handleChange}
            className="form-input"
            placeholder="VD: Cái, Chiếc, Gam..."
          />
          <small className="hint">
            Tồn kho sẽ được quản lý theo đơn vị này.
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="conversionRate" className="form-label">
            Quy đổi sang đơn vị cơ bản
          </label>
          <input
            type="text"
            inputMode="numeric"
            id="conversionRate"
            name="conversionRate"
            value={Number(formData.conversionRate || 1) <= 1 ? '' : Number(formData.conversionRate || 1)}
            onChange={handleChange}
            className={`form-input ${errors.conversionRate ? 'error' : ''}`}
            placeholder="VD: 10"
          />
          <small className="hint">
            1 {formData.unit || 'đơn vị bán'} = {(formData.conversionRate || 1)} {formData.baseUnitCode || formData.unit || 'đơn vị cơ bản'}
          </small>
          {errors.conversionRate && <span className="error-text">{errors.conversionRate}</span>}
        </div>
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
        <label className="form-label">Ảnh sản phẩm (tối đa 10 ảnh)</label>
        <div className="image-gallery-upload">
          {/* Main large image on the left */}
          <div className="main-image-section">
            {(() => {
              const imageUrls = formData.images ? formData.images.split(',').filter(Boolean) : [];
              const mainImageUrl = imageUrls[0] || '';
              const mainPreview = localPreviews[0] || '';
              
              return (
                <label className="main-image-upload">
                  <input
                    type="file"
                    onChange={(e) => handleImageUpload(e, 0)}
                    accept="image/*"
                    style={{ display: 'none' }}
                    disabled={isUploading}
                  />
                  {isUploading && mainPreview ? (
                    <div className="upload-loading">
                      <div className="spinner-small" style={{ borderTopColor: '#667eea' }}></div>
                      <span>Đang tải...</span>
                    </div>
                  ) : (
                    <>
                      {(mainPreview || mainImageUrl) ? (
                        <img
                          src={mainPreview || mainImageUrl}
                          alt="Main product"
                          className="uploaded-main-image"
                        />
                      ) : (
                        <div className="upload-placeholder-main">
                          <span style={{ fontSize: '48px' }}>+</span>
                          <span>Thêm ảnh</span>
                          <small>Tối đa 50 MB (tự động nén)</small>
                        </div>
                      )}
                    </>
                  )}
                  {mainImageUrl && !mainPreview && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const imageUrls = formData.images ? formData.images.split(',').filter(Boolean) : [];
                        imageUrls.splice(0, 1);
                        setFormData((prev) => ({ ...prev, images: imageUrls.join(',') }));
                      }}
                      className="delete-image-btn"
                      title="Xóa ảnh"
                    >
                      ×
                    </button>
                  )}
                </label>
              );
            })()}
          </div>

          {/* Thumbnail grid on the right - 2x2 grid showing first 4, rest below */}
          <div className="thumbnail-grid-section">
            {[1, 2, 3, 4].map((index) => {
              const imageUrls = formData.images ? formData.images.split(',').filter(Boolean) : [];
              const imageUrl = imageUrls[index] || '';
              const localPreview = localPreviews[index] || '';
              
              return (
                <div key={index} className="thumbnail-item">
                  <label className="thumbnail-upload">
                    <input
                      type="file"
                      onChange={(e) => handleImageUpload(e, index)}
                      accept="image/*"
                      style={{ display: 'none' }}
                      disabled={isUploading}
                    />
                    {isUploading && localPreview ? (
                      <div className="upload-loading-small">
                        <div className="spinner-tiny"></div>
                      </div>
                    ) : (
                      <>
                        {(localPreview || imageUrl) ? (
                          <img
                            src={localPreview || imageUrl}
                            alt={`Product ${index + 1}`}
                            className="uploaded-thumbnail"
                          />
                        ) : (
                          <div className="upload-placeholder-thumb">
                            <span>+</span>
                          </div>
                        )}
                      </>
                    )}
                    {imageUrl && !localPreview && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const imageUrls = formData.images ? formData.images.split(',').filter(Boolean) : [];
                          imageUrls.splice(index, 1);
                          setFormData((prev) => ({ ...prev, images: imageUrls.join(',') }));
                        }}
                        className="delete-thumb-btn"
                        title="Xóa ảnh"
                      >
                        ×
                      </button>
                    )}
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        {/* Additional 5 images below in a single row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginTop: '12px' }}>
          {[5, 6, 7, 8, 9].map((index) => {
            const imageUrls = formData.images ? formData.images.split(',').filter(Boolean) : [];
            const imageUrl = imageUrls[index] || '';
            const localPreview = localPreviews[index] || '';
            
            return (
              <div key={index} className="thumbnail-item">
                <label className="thumbnail-upload">
                  <input
                    type="file"
                    onChange={(e) => handleImageUpload(e, index)}
                    accept="image/*"
                    style={{ display: 'none' }}
                    disabled={isUploading}
                  />
                  {isUploading && localPreview ? (
                    <div className="upload-loading-small">
                      <div className="spinner-tiny"></div>
                    </div>
                  ) : (
                    <>
                      {(localPreview || imageUrl) ? (
                        <img
                          src={localPreview || imageUrl}
                          alt={`Product ${index + 1}`}
                          className="uploaded-thumbnail"
                        />
                      ) : (
                        <div className="upload-placeholder-thumb">
                          <span>+</span>
                        </div>
                      )}
                    </>
                  )}
                  {imageUrl && !localPreview && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const imageUrls = formData.images ? formData.images.split(',').filter(Boolean) : [];
                        imageUrls.splice(index, 1);
                        setFormData((prev) => ({ ...prev, images: imageUrls.join(',') }));
                      }}
                      className="delete-thumb-btn"
                      title="Xóa ảnh"
                    >
                      ×
                    </button>
                  )}
                </label>
              </div>
            );
          })}
        </div>

        <small className="hint">Dung lượng tối đa 50MB mỗi ảnh (tự động nén). Hỗ trợ JPG, PNG, WEBP. Ảnh đầu tiên sẽ là ảnh chính.</small>
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
