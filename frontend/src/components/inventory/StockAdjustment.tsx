import { useState, useEffect, useRef } from "react";
import { productsAPI, categoriesAPI } from "../../services/api";
import Modal from "../shared/Modal";
import ProductForm from "../products/ProductForm";
import {
  MdDownload,
  MdUpload,
  MdSync,
  MdFolder,
  MdAdd,
  MdSearch,
  MdClose,
} from "react-icons/md";
import "./StockAdjustment.css";

interface Warehouse {
  id: string;
  name: string;
  code?: string;
}

interface Store {
  id: string;
  name: string;
  code?: string;
}

interface Product {
  id: string;
  name: string;
  sku?: string;
  unit?: string;
  baseUnitCode?: string;
}

interface Category {
  id: string;
  name: string;
}

interface StockAdjustmentProps {
  warehouses: Warehouse[];
  stores?: Store[];
  onSubmit: (data: {
    warehouseId: string;
    productId: string;
    quantity: number;
    type: "IMPORT" | "EXPORT" | "ADJUST";
    note?: string;
    storeId?: string;
    unit?: string;
  }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  defaultType?: "IMPORT" | "EXPORT" | "ADJUST";
}

const removeAccents = (str: string) => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
};

type MovementType = "IMPORT" | "EXPORT" | "ADJUST";

export default function StockAdjustment({
  warehouses,
  stores = [],
  onSubmit,
  onCancel,
  isLoading = false,
  defaultType = "IMPORT",
}: StockAdjustmentProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState({
    warehouseId: "",
    productId: "",
    quantity: "",
    type: defaultType as MovementType,
    note: "",
    storeId: "",
    unit: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [importNote, setImportNote] = useState("");

  // States cho tìm kiếm sản phẩm
  const [productSearch, setProductSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [selectedProductName, setSelectedProductName] = useState("");
  const productInputRef = useRef<HTMLInputElement>(null);
  const productDropdownRef = useRef<HTMLDivElement>(null);

  // States cho Modal thêm sản phẩm mới
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  // Fetch products and categories on mount
  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  // Close product dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        productDropdownRef.current &&
        !productDropdownRef.current.contains(event.target as Node)
      ) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchProducts = async () => {
    try {
      // Fetch all products - increased limit to handle larger product catalogs
      const response = await productsAPI.getAll({ limit: 10000 });
      setProducts(response.data?.data || []);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAll();
      setCategories(response.data?.data || response.data || []);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  // Xử lý tạo sản phẩm mới
  const handleCreateProduct = async (productData: any) => {
    setIsCreatingProduct(true);
    try {
      const response = await productsAPI.create(productData);
      const newProduct = response.data?.data || response.data;

      // Refresh danh sách sản phẩm
      await fetchProducts();

      // Tự động chọn sản phẩm vừa tạo
      if (newProduct?.id) {
        setFormData((prev) => ({ ...prev, productId: String(newProduct.id) }));
      }

      // Đóng modal
      setIsProductModalOpen(false);
    } catch (error) {
      console.error("Failed to create product:", error);
      throw error;
    } finally {
      setIsCreatingProduct(false);
    }
  };

  // Helper to parse numbers from string (handle Vietnamese format)
  const digitsToNumber = (str: string): number => {
    if (!str) return 0;
    return parseInt(String(str).replace(/[^\d]/g, ""), 10) || 0;
  };

  // Helper to find product by name or sku
  const findProduct = (name?: string, sku?: string): Product | undefined => {
    if (!name && !sku) return undefined;
    return products.find(
      (p) =>
        (sku && p.sku?.toLowerCase() === sku.toLowerCase()) ||
        (name && p.name.toLowerCase().includes(name.toLowerCase())),
    );
  };

  // Helper to find warehouse by name or code
  const findWarehouse = (
    name?: string,
    code?: string,
  ): Warehouse | undefined => {
    if (!name && !code) return undefined;
    return warehouses.find(
      (w) =>
        (code && w.code?.toLowerCase() === code.toLowerCase()) ||
        (name && w.name.toLowerCase().includes(name.toLowerCase())),
    );
  };

  // Get value from headers/row
  const getValue = (
    headers: string[],
    row: string[],
  ): {
    product?: string;
    sku?: string;
    warehouse?: string;
    warehouseCode?: string;
    quantity?: string;
    unit?: string;
    note?: string;
  } => {
    const get = (names: string[]): string | undefined => {
      for (const n of names) {
        const idx = headers.findIndex((h) =>
          h.toLowerCase().includes(n.toLowerCase()),
        );
        if (idx !== -1 && row[idx]) return row[idx];
      }
      return undefined;
    };

    // For quantity, try to find 'cuối kỳ' column with 'số lượng', or fallback to general quantity
    const getQuantity = (): string | undefined => {
      // First try to find 'Cuối kỳ' section with 'Số lượng'
      for (let i = 0; i < headers.length; i++) {
        const h = headers[i].toLowerCase();
        if (h.includes("cuối") && h.includes("số lượng")) {
          if (row[i]) return row[i];
        }
      }
      // Try to find standalone quantity column
      return get(["quantity", "số lượng", "sl", "tồn kho", "tồn"]);
    };

    return {
      product: get(["tên hàng", "tên sản phẩm", "sản phẩm", "product", "name"]),
      sku: get(["mã hàng", "mã sp", "sku", "mã", "barcode", "mã vạch"]),
      warehouse: get(["warehouse", "kho", "tên kho"]),
      warehouseCode: get(["mã kho", "warehouse code"]),
      quantity: getQuantity(),
      unit: get(["đvt", "đơn vị", "unit"]),
      note: get(["note", "ghi chú", "notes"]),
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
      unit: data.unit || matchedProduct?.baseUnitCode || matchedProduct?.unit || prev.unit,
      note: data.note || prev.note,
    }));

    const messages: string[] = [];
    if (matchedProduct) messages.push(`Sản phẩm: ${matchedProduct.name}`);
    if (data.unit) messages.push(`ĐVT: ${data.unit}`);
    if (matchedWarehouse) messages.push(`Kho: ${matchedWarehouse.name}`);
    if (qty > 0) messages.push(`Số lượng: ${qty}`);
    if (!matchedProduct && data.product)
      messages.push("(Không tìm thấy sản phẩm, vui lòng chọn thủ công)");
    if (!matchedWarehouse && data.warehouse)
      messages.push("(Không tìm thấy kho, vui lòng chọn thủ công)");

    setImportNote(
      messages.length
        ? `Đã lấy: ${messages.join(", ")}`
        : "Không tìm thấy dữ liệu phù hợp",
    );
  };

  // Handle file import
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    try {
      if (ext === "csv") {
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          setImportNote("File CSV cần header và ít nhất 1 dòng dữ liệu.");
          return;
        }
        const headers = lines[0].split(",").map((h) => h.trim());
        const row = lines[1].split(",").map((c) => c.trim());
        applyImportedData(getValue(headers, row));
        return;
      }

      if (ext === "xlsx" || ext === "xls") {
        const XLSX = await import("xlsx");
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const allRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Find the actual header row by looking for common column names
        let headerRowIndex = -1;
        const headerKeywords = [
          "mã hàng",
          "tên hàng",
          "sản phẩm",
          "sku",
          "số lượng",
          "đvt",
          "mã",
          "tên",
        ];

        for (let i = 0; i < Math.min(allRows.length, 10); i++) {
          const rowText = (allRows[i] || [])
            .map((c) => String(c || "").toLowerCase())
            .join(" ");
          const matchCount = headerKeywords.filter((k) =>
            rowText.includes(k),
          ).length;
          if (matchCount >= 2) {
            headerRowIndex = i;
            break;
          }
        }

        if (headerRowIndex === -1) {
          // Fallback to first row as header
          headerRowIndex = 0;
        }

        const headers = (allRows[headerRowIndex] || []).map((h) =>
          String(h || "").trim(),
        );
        const dataRowIndex = headerRowIndex + 1;
        const row = (allRows[dataRowIndex] || []).map((c) =>
          String(c ?? "").trim(),
        );

        if (!headers.length || !row.length) {
          setImportNote("File Excel cần header và ít nhất 1 dòng dữ liệu.");
          return;
        }

        console.log("Header row index:", headerRowIndex, "Headers:", headers);
        console.log("Data row:", row);

        applyImportedData(getValue(headers, row));
        return;
      }

      if (ext === "pdf") {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
        const buffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        let text = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map((item: any) => item.str).join(" ") + "\n";
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

      setImportNote(
        "Định dạng file không được hỗ trợ. Vui lòng dùng CSV, Excel hoặc PDF.",
      );
    } catch (error) {
      console.error("Import error:", error);
      setImportNote("Lỗi đọc file. Vui lòng kiểm tra định dạng.");
    }

    // Reset file input
    e.target.value = "";
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.warehouseId) {
      newErrors.warehouseId = "Vui lòng chọn kho";
    }

    if (!formData.productId) {
      newErrors.productId = "Vui lòng chọn sản phẩm";
    }

    const qty = parseInt(formData.quantity);
    if (!formData.quantity || isNaN(qty) || qty <= 0) {
      newErrors.quantity = "Số lượng phải lớn hơn 0";
    }

    // Company required when EXPORT
    if (formData.type === "EXPORT" && stores.length > 0 && !formData.storeId) {
      newErrors.storeId = "Vui lòng chọn công ty khi xuất kho";
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
      storeId: formData.storeId || undefined,
      unit: formData.unit || undefined,
    });
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleTypeChange = (type: MovementType) => {
    setFormData((prev) => ({
      ...prev,
      type,
      // Reset storeId when not EXPORT (only EXPORT requires company)
      storeId: type === "EXPORT" ? prev.storeId : "",
    }));
  };

  const getTypeHint = () => {
    switch (formData.type) {
      case "IMPORT":
        return "Nhập hàng vào kho (tăng tồn)";
      case "EXPORT":
        return "Xuất hàng ra khỏi kho (giảm tồn)";
      case "ADJUST":
        return "Điều chỉnh số lượng sau kiểm kê";
      default:
        return "";
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="stock-adjustment-form">
        {/* Movement Type */}
        <div className="form-group">
          <label className="form-label">
            Loại điều chỉnh <span className="required">*</span>
          </label>
          <div className="movement-type-buttons">
            <button
              type="button"
              className={`type-btn ${formData.type === "IMPORT" ? "active import" : ""}`}
              onClick={() => handleTypeChange("IMPORT")}
            >
              <span className="type-icon">
                <MdDownload />
              </span>
              <span className="type-label">Nhập kho</span>
            </button>
            <button
              type="button"
              className={`type-btn ${formData.type === "EXPORT" ? "active export" : ""}`}
              onClick={() => handleTypeChange("EXPORT")}
            >
              <span className="type-icon">
                <MdUpload />
              </span>
              <span className="type-label">Xuất kho</span>
            </button>
            <button
              type="button"
              className={`type-btn ${formData.type === "ADJUST" ? "active adjust" : ""}`}
              onClick={() => handleTypeChange("ADJUST")}
            >
              <span className="type-icon">
                <MdSync />
              </span>
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
            className={`form-select ${errors.warehouseId ? "error" : ""}`}
          >
            <option value="">-- Chọn kho --</option>
            {warehouses.map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.name} {wh.code ? `(${wh.code})` : ""}
              </option>
            ))}
          </select>
          {errors.warehouseId && (
            <span className="error-text">{errors.warehouseId}</span>
          )}
        </div>

        {/* Company - Required when EXPORT */}
        {stores.length > 0 && formData.type === "EXPORT" && (
          <div className="form-group">
            <label htmlFor="storeId" className="form-label">
              Công ty <span className="required">*</span>
            </label>
            <select
              id="storeId"
              name="storeId"
              value={formData.storeId}
              onChange={handleChange}
              className={`form-select ${errors.storeId ? "error" : ""}`}
            >
              <option value="">-- Chọn công ty --</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name} {store.code ? `(${store.code})` : ""}
                </option>
              ))}
            </select>
            {errors.storeId && (
              <span className="error-text">{errors.storeId}</span>
            )}
            <p className="field-hint">
              Chọn công ty xuất hàng (ghi nhận vào báo cáo)
            </p>
          </div>
        )}

        {/* Product - Searchable Input */}
        <div className="form-group">
          <label htmlFor="productSearch" className="form-label">
            Sản phẩm <span className="required">*</span>
          </label>
          <div className="product-select-row">
            <div className="product-search-wrapper" ref={productDropdownRef}>
              <div className="product-search-input-container">
                <MdSearch className="search-icon" />
                <input
                  ref={productInputRef}
                  type="text"
                  id="productSearch"
                  className={`form-input product-search-input ${errors.productId ? "error" : ""}`}
                  placeholder="Gõ tên hoặc mã sản phẩm..."
                  value={selectedProductName || productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setSelectedProductName("");
                    setFormData((prev) => ({ ...prev, productId: "" }));
                    setShowProductDropdown(true);
                    if (errors.productId)
                      setErrors((prev) => ({ ...prev, productId: "" }));
                  }}
                  onFocus={() => setShowProductDropdown(true)}
                  autoComplete="off"
                />
                {(selectedProductName || productSearch) && (
                  <button
                    type="button"
                    className="clear-search-btn"
                    onClick={() => {
                      setProductSearch("");
                      setSelectedProductName("");
                      setFormData((prev) => ({ ...prev, productId: "" }));
                      productInputRef.current?.focus();
                    }}
                  >
                    <MdClose />
                  </button>
                )}
              </div>
              {showProductDropdown && (
                <div className="product-dropdown">
                  {products
                    .filter((p) => {
                      const search = removeAccents(productSearch);
                      const name = removeAccents(p.name);
                      const sku = removeAccents(p.sku || '');
                      const barcode = removeAccents((p as any).barcode || '');
                      return (
                        !search ||
                        name.includes(search) ||
                        sku.includes(search) ||
                        barcode.includes(search)
                      );
                    })
                    .map((p) => (
                      <div
                        key={p.id}
                        className={`product-option ${formData.productId === p.id ? "selected" : ""}`}
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            productId: p.id,
                            unit: p.baseUnitCode || p.unit || prev.unit || 'Cái'
                          }));
                          setSelectedProductName(
                            `${p.name}${p.sku ? ` [${p.sku}]` : ""}`,
                          );
                          setProductSearch("");
                          setShowProductDropdown(false);
                          if (errors.productId)
                            setErrors((prev) => ({ ...prev, productId: "" }));
                        }}
                      >
                        <span className="product-name">{p.name}</span>
                        {p.sku && (
                          <span className="product-sku">[{p.sku}]</span>
                        )}
                      </div>
                    ))}
                  {products.filter((p) => {
                    const search = productSearch.toLowerCase();
                    return (
                      !search ||
                      p.name.toLowerCase().includes(search) ||
                      p.sku?.toLowerCase().includes(search)
                    );
                  }).length === 0 && (
                      <div className="product-option no-result">
                        Không tìm thấy sản phẩm
                      </div>
                    )}
                </div>
              )}
            </div>
            <button
              type="button"
              className="btn-add-product"
              onClick={() => setIsProductModalOpen(true)}
              title="Thêm sản phẩm mới"
            >
              <MdAdd /> Thêm SP mới
            </button>
          </div>
          {errors.productId && (
            <span className="error-text">{errors.productId}</span>
          )}
        </div>

        {/* Quantity */}
        <div className="form-group">
          {/* Quantity and Unit */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="quantity" className="form-label">
                Số lượng <span className="required">*</span>
              </label>
              <div className="quantity-input-wrapper">
                <input
                  type="number"
                  id="quantity"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  className={`form-input ${errors.quantity ? "error" : ""}`}
                  placeholder="Nhập số lượng"
                  min="1"
                />
              </div>
              {errors.quantity && (
                <span className="error-text">{errors.quantity}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="unit" className="form-label">
                Đơn vị tính <span className="optional-hint">(Cần cập nhật?)</span>
              </label>
              <input
                type="text"
                id="unit"
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                className="form-input"
                placeholder="VD: Cái, Ram, Hộp..."
              />
              <p className="field-hint">ĐVT này sẽ được lưu cho chứng từ kho. Nếu sản phẩm có đa đơn vị, nên dùng đơn vị cơ bản.</p>
            </div>
          </div>
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
              <span>
                <MdFolder /> Chọn tệp
              </span>
              <input
                type="file"
                accept=".csv,.xlsx,.xls,.pdf"
                onChange={handleImport}
                style={{ display: "none" }}
              />
            </label>
            <span className="import-hint">
              Hỗ trợ CSV, Excel (xlsx/xls) hoặc PDF
            </span>
          </div>
          <p className="import-help">
            File cần có cột: sản phẩm/sku, kho/mã kho, số lượng
          </p>
          {importNote && (
            <div
              className={`import-note ${importNote.includes("Không") || importNote.includes("Lỗi") ? "error" : "success"}`}
            >
              {importNote}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="form-actions">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary"
            disabled={isLoading}
          >
            Hủy
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner-small"></span>
                Đang xử lý...
              </>
            ) : (
              "Xác nhận"
            )}
          </button>
        </div>
      </form>

      {/* Modal thêm sản phẩm mới */}
      <Modal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title="Thêm sản phẩm mới"
        size="lg"
      >
        {isProductModalOpen && (
          <ProductForm
            categories={categories}
            onSubmit={handleCreateProduct}
            onCancel={() => setIsProductModalOpen(false)}
            isLoading={isCreatingProduct}
          />
        )}
      </Modal>
    </>
  );
}
