import React, { useState, useEffect, useCallback, useRef } from "react";
import { inventoryAPI, warehousesAPI, storesAPI } from "../../services/api";
import Modal from "../shared/Modal";
import { Toast, useToast } from "../shared/Toast";
import StockAdjustment from "./StockAdjustment";
import {
  MdSearch,
  MdAdd,
  MdRemove,
  MdTune,
  MdFileUpload,
  MdFileDownload,
  MdExpandMore,
  MdInventory,
  MdFilterList,
  MdRefresh,
  MdMoreHoriz,
  MdHelpOutline,
  MdSettings,
  MdWarning,
} from "react-icons/md";
import * as XLSX from "xlsx";
import "./InventoryOverview.css";

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
  const [stores, setStores] = useState<Warehouse[]>([]); // Reuse Warehouse interface for Store
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 20,
    total: 0,
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [storeFilter, setStoreFilter] = useState("");

  // Date range for period (default: current month)
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];
  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(lastOfMonth);

  // Modals
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');

  // File import
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toast = useToast();

  // Filtered data based on stock filter
  const filteredReportData = reportData.filter((item) => {
    if (stockFilter === 'in_stock') return item.endingQty > 0;
    if (stockFilter === 'out_of_stock') return item.endingQty <= 0;
    return true;
  });

  // Out-of-stock products for alert
  const outOfStockProducts = reportData.filter((item) => item.endingQty <= 0);
  const inStockCount = reportData.filter((item) => item.endingQty > 0).length;

  // Fetch warehouses and stores on mount
  useEffect(() => {
    fetchWarehouses();
    fetchStores();
  }, []);

  // Fetch report when filters change
  useEffect(() => {
    fetchReport();
  }, [warehouseFilter, storeFilter, fromDate, toDate, pagination.page]);

  const fetchWarehouses = async () => {
    try {
      const response = await warehousesAPI.getAll();
      setWarehouses(response.data?.data || response.data || []);
    } catch (error) {
      console.error("Failed to fetch warehouses:", error);
    }
  };

  const fetchStores = async () => {
    try {
      const response = await storesAPI.getAll();
      setStores(response.data?.data || response.data || []);
    } catch (error) {
      console.error("Failed to fetch stores:", error);
      // Set empty array if API fails (stores controller may not exist yet)
      setStores([]);
    }
  };

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const response = await inventoryAPI.getReport({
        warehouseId: warehouseFilter || undefined,
        storeId: storeFilter || undefined,
        fromDate,
        toDate,
        search: searchTerm || undefined,
        page: pagination.page,
        limit: pagination.limit,
      });

      // Response structure: { data: [...], totals: {...}, meta: { page, limit, total } }
      // response.data is the entire response object from backend
      const apiResponse = response.data?.data ? response.data : response.data;

      // Get the report items array
      const reportItems = apiResponse?.data || [];
      setReportData(Array.isArray(reportItems) ? reportItems : []);
      setTotals(apiResponse?.totals || null);

      // Get pagination meta
      if (apiResponse?.meta) {
        console.log("[Frontend] Received meta:", apiResponse.meta);
        setPagination((prev) => ({
          ...prev,
          total: apiResponse.meta.total,
        }));
      }
    } catch (error) {
      console.error("Failed to fetch inventory report:", error);
      toast.error("Không thể tải báo cáo tồn kho");
    } finally {
      setLoading(false);
    }
  }, [
    warehouseFilter,
    storeFilter,
    fromDate,
    toDate,
    searchTerm,
    pagination.page,
    pagination.limit,
  ]);

  const handleAdjustSubmit = async (data: {
    warehouseId: string;
    productId: string;
    quantity: number;
    type: "IMPORT" | "EXPORT" | "ADJUST";
    note?: string;
    storeId?: string;
    unit?: string;
  }) => {
    setIsSubmitting(true);
    try {
      await inventoryAPI.adjustStock(data);
      const typeLabel =
        data.type === "IMPORT"
          ? "Nhập kho"
          : data.type === "EXPORT"
            ? "Xuất kho"
            : "Điều chỉnh";
      toast.success(`${typeLabel} thành công`);
      setIsAdjustOpen(false);
      setIsImportOpen(false);
      setIsExportOpen(false);
      fetchReport();
    } catch (error: any) {
      const message = error.response?.data?.message;
      if (message === "INSUFFICIENT_STOCK") {
        toast.error("Tồn kho không đủ để xuất");
      } else {
        toast.error(message || "Có lỗi xảy ra");
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
      console.log("Raw sheet data (first 10 rows):", rawData.slice(0, 10));

      // Find the main header row containing "Mã hàng", "Tên hàng"
      let headerRowIndex = -1;
      for (let i = 0; i < Math.min(10, rawData.length); i++) {
        const row = rawData[i];
        if (!row || row.length < 2) continue;

        const rowText = row
          .map((cell) => String(cell || "").toLowerCase())
          .join(" ");
        // Look for row with both "mã" and "tên"
        if (rowText.includes("mã") && rowText.includes("tên")) {
          headerRowIndex = i;
          console.log("Found main header row at index:", i, row);
          break;
        }
      }

      if (headerRowIndex === -1) {
        toast.error(
          "Không tìm thấy dòng header. Cần có cột: Mã hàng, Tên hàng",
        );
        return;
      }

      const mainHeaders = rawData[headerRowIndex].map((h: any) =>
        String(h || "")
          .trim()
          .toLowerCase(),
      );
      console.log("Main headers:", mainHeaders);

      // Check if next row is sub-headers (Số lượng, Giá trị)
      let dataStartIndex = headerRowIndex + 1;
      const nextRow = rawData[headerRowIndex + 1];
      if (nextRow) {
        const nextRowText = nextRow
          .map((c: any) => String(c || "").toLowerCase())
          .join(" ");
        if (
          nextRowText.includes("số lượng") ||
          nextRowText.includes("giá trị")
        ) {
          console.log("Found sub-header row:", nextRow);
          dataStartIndex = headerRowIndex + 2;
        }
      }

      // Find column indices based on main headers
      const codeIdx = mainHeaders.findIndex(
        (h) =>
          h?.includes("mã hàng") ||
          h?.includes("mã sp") ||
          h === "mã" ||
          h?.includes("sku"),
      );
      const nameIdx = mainHeaders.findIndex(
        (h) => h?.includes("tên hàng") || h?.includes("tên sp") || h === "tên",
      );
      const unitIdx = mainHeaders.findIndex(
        (h) => h?.includes("đvt") || h?.includes("đơn vị") || h === "unit",
      );
      // Find "Nhập kho" and "Xuất kho" column indices
      const importIdx = mainHeaders.findIndex(
        (h) => h?.includes("nhập kho") || h?.includes("nhập"),
      );
      const exportIdx = mainHeaders.findIndex(
        (h) => h?.includes("xuất kho") || h?.includes("xuất"),
      );

      // Find value column indices (Giá trị / GT)
      const importValueIdx = mainHeaders.findIndex(
        (h) => h?.includes("nhập") && (h?.includes("giá") || h?.includes("gt")),
      );
      const exportValueIdx = mainHeaders.findIndex(
        (h) => h?.includes("xuất") && (h?.includes("giá") || h?.includes("gt")),
      );

      console.log(
        "Column indices - code:",
        codeIdx,
        "name:",
        nameIdx,
        "import:",
        importIdx,
        "export:",
        exportIdx,
        "importValue:",
        importValueIdx,
        "exportValue:",
        exportValueIdx,
      );

      if (codeIdx === -1 && nameIdx === -1) {
        toast.error(
          `Không tìm thấy cột Mã hàng hoặc Tên hàng. Headers: ${mainHeaders.join(", ")}`,
        );
        return;
      }

      // Check if this is a report format (has Nhập kho and Xuất kho columns)
      const isReportFormat = importIdx >= 0 && exportIdx >= 0;

      // Check if this is a simple format (has Số lượng column without Nhập/Xuất kho)
      const qtyIdx = mainHeaders.findIndex(
        (h) =>
          h?.includes("số lượng") ||
          h?.includes("sl") ||
          h?.includes("tồn") ||
          h?.includes("quantity"),
      );
      const isSimpleFormat = qtyIdx >= 0 && !isReportFormat;

      console.log(
        "Format detection - isReportFormat:",
        isReportFormat,
        "isSimpleFormat:",
        isSimpleFormat,
        "qtyIdx:",
        qtyIdx,
      );

      if (!isReportFormat && !isSimpleFormat) {
        toast.error(
          'File không đúng format. Cần có cột "Nhập kho" + "Xuất kho" hoặc cột "Số lượng"',
        );
        return;
      }

      // Get data rows (skip header rows)
      const dataRows = rawData.slice(dataStartIndex);
      console.log("Data rows count:", dataRows.length);

      // Parse data rows and create movements
      const items: any[] = [];

      dataRows
        .filter((row: any[]) => row && row.length > 0)
        .forEach((row: any[]) => {
          const code = codeIdx >= 0 ? String(row[codeIdx] || "").trim() : "";
          const name = nameIdx >= 0 ? String(row[nameIdx] || "").trim() : "";
          const unit = unitIdx >= 0 ? String(row[unitIdx] || "").trim() : "";

          // Skip if no product identifier
          if (!code && !name) return;

          if (isReportFormat) {
            // Parse import quantity and value
            const importQty =
              importIdx >= 0 ? parseInt(row[importIdx]) || 0 : 0;
            const importValue =
              importValueIdx >= 0 ? parseFloat(row[importValueIdx]) || 0 : 0;
            const importUnitCost = importQty > 0 ? importValue / importQty : 0;

            // Parse export quantity and value
            const exportQty =
              exportIdx >= 0 ? parseInt(row[exportIdx]) || 0 : 0;
            const exportValue =
              exportValueIdx >= 0 ? parseFloat(row[exportValueIdx]) || 0 : 0;
            const exportUnitCost = exportQty > 0 ? exportValue / exportQty : 0;

            // Create IMPORT movement if quantity > 0
            if (importQty > 0) {
              items.push({
                productCode: code,
                productName: name,
                warehouseId: warehouseFilter || warehouses[0]?.id || "",
                quantity: importQty,
                type: "IMPORT" as const,
                unitCost: importUnitCost,
                unit,
                note: "Nhập kho từ Excel",
                storeId: storeFilter || undefined,
              });
            }

            // Create EXPORT movement if quantity > 0
            if (exportQty > 0) {
              items.push({
                productCode: code,
                productName: name,
                warehouseId: warehouseFilter || warehouses[0]?.id || "",
                quantity: exportQty,
                type: "EXPORT" as const,
                unitCost: exportUnitCost,
                unit,
                note: "Xuất kho từ Excel",
                storeId: storeFilter || undefined,
              });
            }
          } else if (isSimpleFormat) {
            // Simple format - use quantity as ADJUST (set absolute inventory level)
            const qty =
              qtyIdx >= 0
                ? parseFloat(String(row[qtyIdx]).replace(/,/g, "")) || 0
                : 0;

            // Find value column for unit cost calculation
            const valueIdx = mainHeaders.findIndex(
              (h) =>
                h?.includes("giá trị") ||
                h?.includes("gt") ||
                h?.includes("value") ||
                h?.includes("thành tiền"),
            );
            const value =
              valueIdx >= 0
                ? parseFloat(String(row[valueIdx]).replace(/,/g, "")) || 0
                : 0;
            const unitCost = qty > 0 && value > 0 ? value / qty : 0;

            // Create ADJUST movement to set inventory level
            items.push({
              productCode: code,
              productName: name,
              warehouseId: warehouseFilter || warehouses[0]?.id || "",
              quantity: qty,
              type: "ADJUST" as const,
              unitCost: unitCost,
              unit,
              note: "Điều chỉnh tồn kho từ Excel",
              storeId: storeFilter || undefined,
            });
          }
        });

      console.log("Parsed movements (first 10):", items.slice(0, 10));
      console.log("Total movements:", items.length);

      if (items.length === 0) {
        toast.error("File không có dữ liệu hợp lệ hoặc số lượng = 0");
        return;
      }

      if (!items[0].warehouseId) {
        toast.error("Vui lòng chọn kho trước khi import");
        return;
      }

      // Call bulk import API
      const response = await inventoryAPI.bulkAdjust({ items });
      const result = response.data?.data || response.data;

      console.log("Import result:", result);

      if (result.success) {
        toast.success(
          `Import thành công ${result.successCount} movements (${items.length} tổng cộng)`,
        );
      } else {
        toast.error(
          `Import: ${result.successCount} thành công, ${result.failCount} thất bại`,
        );
      }

      fetchReport();
    } catch (error: any) {
      console.error("File import error:", error);
      const message =
        error.response?.data?.message || "Có lỗi khi import file Excel";
      toast.error(message);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Excel Export
  const handleExport = (format: "excel" | "csv") => {
    setShowExportDropdown(false);

    // Define Headers
    const headerRow1 = [
      "Mã hàng",
      "Tên hàng",
      "ĐVT",
      "Đầu kỳ",
      "",
      "Nhập kho",
      "",
      "Xuất kho",
      "",
      "Cuối kỳ",
      "",
    ];
    const headerRow2 = [
      "",
      "",
      "",
      "Số lượng",
      "Giá trị",
      "Số lượng",
      "Giá trị",
      "Số lượng",
      "Giá trị",
      "Số lượng",
      "Giá trị",
    ];

    // Define Data
    const dataRows = reportData.map((item) => [
      item.productCode,
      item.productName,
      item.unit,
      item.beginningQty,
      item.beginningValue,
      item.importQty,
      item.importValue,
      item.exportQty,
      item.exportValue,
      item.endingQty,
      item.endingValue,
    ]);

    if (totals) {
      dataRows.push([
        "",
        "Tổng cộng",
        "",
        totals.beginningQty,
        totals.beginningValue,
        totals.importQty,
        totals.importValue,
        totals.exportQty,
        totals.exportValue,
        totals.endingQty,
        totals.endingValue,
      ]);
    }

    // Combine all rows
    const wsData = [headerRow1, headerRow2, ...dataRows];

    // Create Worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(wsData);

    // Define Merges
    // s: start, e: end, r: row, c: col (0-indexed)
    worksheet["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } }, // Mã hàng
      { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } }, // Tên hàng
      { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } }, // ĐVT
      { s: { r: 0, c: 3 }, e: { r: 0, c: 4 } }, // Đầu kỳ
      { s: { r: 0, c: 5 }, e: { r: 0, c: 6 } }, // Nhập kho
      { s: { r: 0, c: 7 }, e: { r: 0, c: 8 } }, // Xuất kho
      { s: { r: 0, c: 9 }, e: { r: 0, c: 10 } }, // Cuối kỳ
    ];

    // Set column widths
    worksheet["!cols"] = [
      { wch: 15 }, // Mã hàng
      { wch: 30 }, // Tên hàng
      { wch: 8 }, // ĐVT
      { wch: 12 },
      { wch: 15 }, // Đầu kỳ
      { wch: 12 },
      { wch: 15 }, // Nhập kho
      { wch: 12 },
      { wch: 15 }, // Xuất kho
      { wch: 12 },
      { wch: 15 }, // Cuối kỳ
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Báo cáo tồn kho");

    const filename = `bao_cao_ton_kho_${fromDate}_${toDate}.${format === "excel" ? "xlsx" : "csv"}`;
    XLSX.writeFile(workbook, filename);
    toast.success("Xuất file thành công");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN").format(value);
  };

  const openAdjustModal = (type: "IMPORT" | "EXPORT" | "ADJUST") => {
    if (type === "IMPORT") setIsImportOpen(true);
    else if (type === "EXPORT") setIsExportOpen(true);
    else setIsAdjustOpen(true);
  };

  return (
    <div className="inventory-overview">
      <Toast toasts={toast.toasts} onRemove={toast.removeToast} />
      <input
        type="file"
        ref={fileInputRef}
        accept=".xlsx,.xls,.csv"
        style={{ display: "none" }}
        onChange={handleFileSelect}
      />

      {/* Filter Sidebar */}
      {showFilters && (
        <aside className="inventory-sidebar">
          <div className="filter-header">
            <h3>Báo cáo tồn kho</h3>
            <button
              className="btn-clear-filters"
              onClick={() => {
                setWarehouseFilter("");
                setStoreFilter("");
                setSearchTerm("");
              }}
            >
              Xóa bộ lọc
            </button>
          </div>

          <div className="filter-section">
            <label>Kho hàng</label>
            <select
              value={warehouseFilter}
              onChange={(e) => {
                setWarehouseFilter(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
            >
              <option value="">Tất cả kho</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name}
                </option>
              ))}
            </select>
          </div>

          {/* Công ty filter - hidden by default, show only when stores exist and user wants advanced filter */}
          {stores.length > 0 && (
            <div className="filter-section filter-collapsible">
              <details>
                <summary className="filter-advanced-toggle">
                  Lọc theo công ty
                </summary>
                <select
                  value={storeFilter}
                  onChange={(e) => {
                    setStoreFilter(e.target.value);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  style={{ marginTop: "8px" }}
                >
                  <option value="">Tất cả công ty</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </details>
            </div>
          )}

          <div className="filter-section">
            <label>Thời gian</label>
            <div className="date-range-wrapper">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
              <span>đến</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className="inventory-main">
        {/* Toolbar */}
        <div className="page-header">
          <h2>Tồn kho</h2>
          <div className="search-box">
            <MdSearch className="search-icon" />
            <input
              type="text"
              placeholder="Tìm theo mã, tên hàng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <div className="header-actions">
            <button
              className={`btn-secondary ${showFilters ? "active" : ""}`}
              onClick={() => setShowFilters(!showFilters)}
              title={showFilters ? "Ẩn bộ lọc" : "Hiện bộ lọc"}
            >
              <MdFilterList />
            </button>

            <button
              onClick={() => openAdjustModal("IMPORT")}
              className="btn-outline-primary"
              style={{
                fontWeight: "bold",
                color: "var(--color-primary)",
                borderColor: "var(--color-primary)",
              }}
            >
              <MdAdd /> Nhập kho
            </button>
            <button
              onClick={() => openAdjustModal("EXPORT")}
              className="btn-secondary"
            >
              <MdRemove /> Xuất kho
            </button>
            <button
              onClick={() => openAdjustModal("ADJUST")}
              className="btn-secondary"
            >
              <MdTune /> Điều chỉnh
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary"
            >
              <MdFileUpload /> Import
            </button>

            <div className="export-dropdown" style={{ position: "relative" }}>
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                className="btn-secondary"
              >
                <MdFileDownload /> Xuất file{" "}
                {showExportDropdown ? (
                  <MdExpandMore style={{ transform: "rotate(180deg)" }} />
                ) : (
                  <MdExpandMore />
                )}
              </button>
              {showExportDropdown && (
                <div
                  className="dropdown-menu"
                  style={{
                    right: 0,
                    left: "auto",
                    top: "100%",
                    marginTop: "4px",
                    position: "absolute",
                  }}
                >
                  <div
                    className="dropdown-item"
                    onClick={() => handleExport("excel")}
                  >
                    Excel (.xlsx)
                  </div>
                  <div
                    className="dropdown-item"
                    onClick={() => handleExport("csv")}
                  >
                    CSV (.csv)
                  </div>
                </div>
              )}
            </div>

            <button className="btn-icon">
              <MdMoreHoriz />
            </button>
            <button className="btn-icon" onClick={handleSearch} title="Làm mới">
              <MdRefresh />
            </button>
            <button className="btn-icon">
              <MdSettings />
            </button>
            <button className="btn-icon">
              <MdHelpOutline />
            </button>
          </div>
        </div>

        {/* Stock Filter Tabs */}
        <div className="stock-filter-tabs">
          <button
            className={`stock-filter-tab ${stockFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStockFilter('all')}
          >
            Tất cả ({reportData.length})
          </button>
          <button
            className={`stock-filter-tab ${stockFilter === 'in_stock' ? 'active' : ''}`}
            onClick={() => setStockFilter('in_stock')}
          >
            Còn hàng ({inStockCount})
          </button>
          <button
            className={`stock-filter-tab ${stockFilter === 'out_of_stock' ? 'active' : ''}`}
            onClick={() => setStockFilter('out_of_stock')}
          >
            Hết hàng ({outOfStockProducts.length})
          </button>
        </div>

        {/* Out-of-Stock Alert */}
        {outOfStockProducts.length > 0 && stockFilter !== 'in_stock' && (
          <div className="out-of-stock-alert">
            <div className="alert-icon"><MdWarning /></div>
            <div className="alert-content">
              <strong>⚠ Cảnh báo hết hàng:</strong> Có <strong>{outOfStockProducts.length}</strong> sản phẩm đã hết hàng hoặc tồn kho = 0.
              Vui lòng nhập thêm hàng để đảm bảo kinh doanh không bị gián đoạn.
              <div className="alert-products">
                {outOfStockProducts.slice(0, 5).map((item) => (
                  <span key={item.id} className="alert-product-tag">
                    {item.productCode} - {item.productName}
                  </span>
                ))}
                {outOfStockProducts.length > 5 && (
                  <span className="alert-more">...và {outOfStockProducts.length - 5} sản phẩm khác</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="inventory-table-wrapper">
          {loading ? (
            <div className="loading-state">
              <div className="spinner-large"></div>
              <p>Đang tải dữ liệu...</p>
            </div>
          ) : filteredReportData.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <MdInventory size={64} />
              </div>
              <h3>{stockFilter === 'out_of_stock' ? 'Không có sản phẩm hết hàng' : stockFilter === 'in_stock' ? 'Không có sản phẩm còn hàng' : 'Chưa có dữ liệu tồn kho'}</h3>
              <p>{stockFilter !== 'all' ? 'Thử chuyển sang tab khác' : 'Thêm sản phẩm vào kho bằng cách nhập kho hoặc điều chỉnh'}</p>
            </div>
          ) : (
            <table className="inventory-report-table">
              <thead>
                <tr className="header-row-1">
                  <th rowSpan={2} className="sticky-col first-col">
                    Mã hàng
                  </th>
                  <th rowSpan={2} className="sticky-col second-col">
                    Tên hàng
                  </th>
                  <th rowSpan={2}>ĐVT</th>
                  <th colSpan={2} className="header-group header-beginning">
                    Đầu kỳ
                  </th>
                  <th colSpan={2} className="header-group header-import">
                    Nhập kho
                  </th>
                  <th colSpan={2} className="header-group header-export">
                    Xuất kho
                  </th>
                  <th colSpan={2} className="header-group header-ending">
                    Cuối kỳ
                  </th>
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
                {filteredReportData.map((item) => (
                  <tr key={item.id} className={item.endingQty <= 0 ? 'out-of-stock-row' : ''}>
                    <td className="code-cell">{item.productCode}</td>
                    <td className="name-cell">{item.productName}</td>
                    <td className="unit-cell">{item.unit}</td>
                    <td className="num-col">
                      {formatCurrency(item.beginningQty)}
                    </td>
                    <td className="num-col">
                      {formatCurrency(item.beginningValue)}
                    </td>
                    <td className="num-col import-cell">
                      {formatCurrency(item.importQty)}
                    </td>
                    <td className="num-col import-cell">
                      {formatCurrency(item.importValue)}
                    </td>
                    <td className="num-col export-cell">
                      {formatCurrency(item.exportQty)}
                    </td>
                    <td className="num-col export-cell">
                      {formatCurrency(item.exportValue)}
                    </td>
                    <td className="num-col ending-cell">
                      {formatCurrency(item.endingQty)}
                    </td>
                    <td className="num-col ending-cell">
                      {formatCurrency(item.endingValue)}
                    </td>
                  </tr>
                ))}
                {totals && (
                  <tr className="totals-row">
                    <td colSpan={3}>
                      <strong>Tổng cộng</strong>
                    </td>
                    <td className="num-col">
                      <strong>{formatCurrency(totals.beginningQty)}</strong>
                    </td>
                    <td className="num-col">
                      <strong>{formatCurrency(totals.beginningValue)}</strong>
                    </td>
                    <td className="num-col">
                      <strong>{formatCurrency(totals.importQty)}</strong>
                    </td>
                    <td className="num-col">
                      <strong>{formatCurrency(totals.importValue)}</strong>
                    </td>
                    <td className="num-col">
                      <strong>{formatCurrency(totals.exportQty)}</strong>
                    </td>
                    <td className="num-col">
                      <strong>{formatCurrency(totals.exportValue)}</strong>
                    </td>
                    <td className="num-col">
                      <strong>{formatCurrency(totals.endingQty)}</strong>
                    </td>
                    <td className="num-col">
                      <strong>{formatCurrency(totals.endingValue)}</strong>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination - Always show when there are items */}
        {filteredReportData.length > 0 && (
          <div className="pagination-container">
            <div className="pagination-info-left">
              <span>
                Hiển thị {(pagination.page - 1) * pagination.limit + 1} -{" "}
                {Math.min(
                  pagination.page * pagination.limit,
                  pagination.total || reportData.length,
                )}{" "}
                trên <strong>{pagination.total || reportData.length}</strong>{" "}
                sản phẩm
              </span>
            </div>

            <div className="pagination-controls">
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: 1 }))}
                disabled={pagination.page === 1}
                className="pagination-btn"
                title="Trang đầu"
              >
                «
              </button>
              <button
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                }
                disabled={pagination.page === 1}
                className="pagination-btn"
              >
                Trước
              </button>
              <span className="pagination-page">
                Trang <strong>{pagination.page}</strong> /{" "}
                {Math.max(
                  1,
                  Math.ceil(
                    (pagination.total || reportData.length) / pagination.limit,
                  ),
                )}
              </span>
              <button
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                }
                disabled={
                  pagination.page >=
                  Math.ceil(
                    (pagination.total || reportData.length) / pagination.limit,
                  )
                }
                className="pagination-btn"
              >
                Sau
              </button>
              <button
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    page: Math.ceil(
                      (pagination.total || reportData.length) /
                      pagination.limit,
                    ),
                  }))
                }
                disabled={
                  pagination.page >=
                  Math.ceil(
                    (pagination.total || reportData.length) / pagination.limit,
                  )
                }
                className="pagination-btn"
                title="Trang cuối"
              >
                »
              </button>
            </div>

            <div className="pagination-size">
              <label>Hiển thị:</label>
              <select
                value={pagination.limit}
                onChange={(e) =>
                  setPagination((prev) => ({
                    ...prev,
                    limit: Number(e.target.value),
                    page: 1,
                  }))
                }
                className="page-size-select"
              >
                <option value={15}>15</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>/ trang</span>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <Modal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Nhập kho"
        size="md"
      >
        <StockAdjustment
          warehouses={warehouses}
          stores={stores}
          onSubmit={(data) => handleAdjustSubmit({ ...data, type: "IMPORT" })}
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
          stores={stores}
          onSubmit={(data) => handleAdjustSubmit({ ...data, type: "EXPORT" })}
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
          stores={stores}
          onSubmit={handleAdjustSubmit}
          onCancel={() => setIsAdjustOpen(false)}
          isLoading={isSubmitting}
        />
      </Modal>
    </div>
  );
}
