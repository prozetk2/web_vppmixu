import { useState, useEffect } from 'react';
import { reportsAPI } from '../../services/api';
import {
    MdBarChart,
    MdAttachMoney,
    MdInventory,
    MdPeople,
    MdLocalShipping,
    MdSearch,
} from 'react-icons/md';
import './ReportsPage.css';

type ReportTab = 'revenue' | 'inventory' | 'customer-debts' | 'supplier-debts';

interface RevenueData {
    summary: {
        totalRevenue: number;
        totalDiscount: number;
        returnAmount: number;
        netRevenue: number;
        orderCount: number;
        returnCount: number;
        averageOrderValue: number;
    };
    chartData: { date: string; value: number }[];
    details: any[];
}

interface InventoryValueData {
    summary: {
        totalQuantity: number;
        totalValue: number;
        itemCount: number;
    };
    byCategory: { name: string; quantity: number; value: number }[];
    byWarehouse: { name: string; quantity: number; value: number }[];
    items: any[];
}

interface DebtData {
    summary: {
        totalDebt: number;
        customerCount?: number;
        supplierCount?: number;
        aging?: {
            current: number;
            overdue30: number;
            overdue60: number;
            overdue90: number;
        };
    };
    items: any[];
}

export default function ReportsPage() {
    const [activeTab, setActiveTab] = useState<ReportTab>('revenue');
    const [loading, setLoading] = useState(true);
    const [fromDate, setFromDate] = useState(() => {
        const d = new Date();
        d.setDate(1);
        return d.toISOString().split('T')[0];
    });
    const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);

    // Data states
    const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
    const [inventoryData, setInventoryData] = useState<InventoryValueData | null>(null);
    const [customerDebts, setCustomerDebts] = useState<DebtData | null>(null);
    const [supplierDebts, setSupplierDebts] = useState<DebtData | null>(null);

    useEffect(() => {
        fetchReport();
    }, [activeTab]);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const params = { fromDate, toDate };

            switch (activeTab) {
                case 'revenue':
                    const revRes = await reportsAPI.getRevenue(params);
                    setRevenueData(revRes.data);
                    break;
                case 'inventory':
                    const invRes = await reportsAPI.getInventoryValue({});
                    setInventoryData(invRes.data);
                    break;
                case 'customer-debts':
                    const custRes = await reportsAPI.getCustomerDebts({});
                    setCustomerDebts(custRes.data);
                    break;
                case 'supplier-debts':
                    const suppRes = await reportsAPI.getSupplierDebts({});
                    setSupplierDebts(suppRes.data);
                    break;
            }
        } catch (error) {
            console.error('Failed to fetch report:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN').format(value);
    };

    const formatShortCurrency = (value: number) => {
        if (value >= 1000000000) return (value / 1000000000).toFixed(1) + ' tỷ';
        if (value >= 1000000) return (value / 1000000).toFixed(1) + ' tr';
        if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
        return value.toString();
    };

    const tabs = [
        { id: 'revenue' as ReportTab, label: 'Doanh thu', icon: MdAttachMoney },
        { id: 'inventory' as ReportTab, label: 'Giá trị tồn kho', icon: MdInventory },
        { id: 'customer-debts' as ReportTab, label: 'Công nợ KH', icon: MdPeople },
        { id: 'supplier-debts' as ReportTab, label: 'Công nợ NCC', icon: MdLocalShipping },
    ];

    const renderContent = () => {
        if (loading) {
            return (
                <div className="report-loading">
                    <div className="spinner"></div>
                    <p>Đang tải báo cáo...</p>
                </div>
            );
        }

        switch (activeTab) {
            case 'revenue':
                return renderRevenueReport();
            case 'inventory':
                return renderInventoryReport();
            case 'customer-debts':
                return renderCustomerDebtsReport();
            case 'supplier-debts':
                return renderSupplierDebtsReport();
            default:
                return null;
        }
    };

    const renderRevenueReport = () => {
        if (!revenueData) return <div className="report-empty"><MdBarChart className="icon" /><p>Chưa có dữ liệu</p></div>;

        const maxValue = Math.max(...revenueData.chartData.map(d => d.value), 1);

        return (
            <>
                {/* Summary */}
                <div className="report-summary">
                    <div className="summary-card">
                        <div className="label">Tổng doanh thu</div>
                        <div className="value">{formatCurrency(revenueData.summary.totalRevenue)}</div>
                    </div>
                    <div className="summary-card">
                        <div className="label">Giảm giá</div>
                        <div className="value negative">-{formatCurrency(revenueData.summary.totalDiscount)}</div>
                    </div>
                    <div className="summary-card">
                        <div className="label">Trả hàng</div>
                        <div className="value negative">-{formatCurrency(revenueData.summary.returnAmount)}</div>
                    </div>
                    <div className="summary-card">
                        <div className="label">Doanh thu thuần</div>
                        <div className="value positive">{formatCurrency(revenueData.summary.netRevenue)}</div>
                    </div>
                    <div className="summary-card">
                        <div className="label">Số đơn hàng</div>
                        <div className="value">{revenueData.summary.orderCount}</div>
                        <div className="sub-value">{revenueData.summary.returnCount} đơn trả</div>
                    </div>
                    <div className="summary-card">
                        <div className="label">Giá trị trung bình</div>
                        <div className="value">{formatCurrency(revenueData.summary.averageOrderValue)}</div>
                    </div>
                </div>

                {/* Chart */}
                <div className="report-chart">
                    <h3>Biểu đồ doanh thu theo ngày</h3>
                    {revenueData.chartData.length === 0 ? (
                        <div className="report-empty"><p>Không có dữ liệu trong khoảng thời gian này</p></div>
                    ) : (
                        <div className="chart-container">
                            {revenueData.chartData.slice(-14).map((item, idx) => (
                                <div key={idx} className="chart-bar">
                                    <div className="bar-value">{formatShortCurrency(item.value)}</div>
                                    <div
                                        className="bar"
                                        style={{ height: `${(item.value / maxValue) * 150}px` }}
                                    />
                                    <div className="bar-label">{item.date.split('-').slice(1).join('/')}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Details Table */}
                <div className="report-table">
                    <h3>Chi tiết đơn hàng ({revenueData.details.length})</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Mã đơn</th>
                                <th>Khách hàng</th>
                                <th>Trạng thái</th>
                                <th className="text-right">Giá trị</th>
                                <th>Ngày tạo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {revenueData.details.slice(0, 20).map((order: any) => (
                                <tr key={order.id}>
                                    <td>{order.orderNumber || order.id}</td>
                                    <td>{order.customerName}</td>
                                    <td>{order.status}</td>
                                    <td className="text-right">{formatCurrency(order.totalAmount)}</td>
                                    <td>{new Date(order.createdAt).toLocaleDateString('vi-VN')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </>
        );
    };

    const renderInventoryReport = () => {
        if (!inventoryData) return <div className="report-empty"><MdInventory className="icon" /><p>Chưa có dữ liệu</p></div>;

        const maxCatValue = Math.max(...inventoryData.byCategory.map(c => c.value), 1);

        return (
            <>
                {/* Summary */}
                <div className="report-summary">
                    <div className="summary-card">
                        <div className="label">Tổng giá trị tồn kho</div>
                        <div className="value positive">{formatCurrency(inventoryData.summary.totalValue)}</div>
                    </div>
                    <div className="summary-card">
                        <div className="label">Tổng số lượng</div>
                        <div className="value">{formatCurrency(inventoryData.summary.totalQuantity)}</div>
                    </div>
                    <div className="summary-card">
                        <div className="label">Số sản phẩm</div>
                        <div className="value">{inventoryData.summary.itemCount}</div>
                    </div>
                </div>

                {/* By Category */}
                <div className="report-chart">
                    <h3>Giá trị theo danh mục</h3>
                    <div className="horizontal-bars">
                        {inventoryData.byCategory.slice(0, 10).map((cat, idx) => (
                            <div key={idx} className="horizontal-bar-row">
                                <div className="rank">{idx + 1}</div>
                                <div className="name">{cat.name}</div>
                                <div className="bar-wrapper">
                                    <div
                                        className="bar-fill"
                                        style={{ width: `${(cat.value / maxCatValue) * 100}%` }}
                                    />
                                </div>
                                <div className="value">{formatShortCurrency(cat.value)}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* By Warehouse */}
                <div className="report-chart">
                    <h3>Giá trị theo kho</h3>
                    <div className="horizontal-bars">
                        {inventoryData.byWarehouse.map((wh, idx) => (
                            <div key={idx} className="horizontal-bar-row">
                                <div className="rank">{idx + 1}</div>
                                <div className="name">{wh.name}</div>
                                <div className="bar-wrapper">
                                    <div
                                        className="bar-fill"
                                        style={{ width: `${(wh.value / inventoryData.summary.totalValue) * 100}%` }}
                                    />
                                </div>
                                <div className="value">{formatShortCurrency(wh.value)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </>
        );
    };

    const renderCustomerDebtsReport = () => {
        if (!customerDebts) return <div className="report-empty"><MdPeople className="icon" /><p>Chưa có dữ liệu</p></div>;

        return (
            <>
                {/* Summary */}
                <div className="report-summary">
                    <div className="summary-card">
                        <div className="label">Tổng công nợ</div>
                        <div className="value negative">{formatCurrency(customerDebts.summary.totalDebt)}</div>
                    </div>
                    <div className="summary-card">
                        <div className="label">Số khách hàng</div>
                        <div className="value">{customerDebts.summary.customerCount}</div>
                    </div>
                </div>

                {/* Aging */}
                {customerDebts.summary.aging && (
                    <div className="aging-grid">
                        <div className="aging-card current">
                            <div className="label">Trong hạn (0-30 ngày)</div>
                            <div className="value">{formatCurrency(customerDebts.summary.aging.current)}</div>
                        </div>
                        <div className="aging-card overdue30">
                            <div className="label">Quá hạn 31-60 ngày</div>
                            <div className="value">{formatCurrency(customerDebts.summary.aging.overdue30)}</div>
                        </div>
                        <div className="aging-card overdue60">
                            <div className="label">Quá hạn 61-90 ngày</div>
                            <div className="value">{formatCurrency(customerDebts.summary.aging.overdue60)}</div>
                        </div>
                        <div className="aging-card overdue90">
                            <div className="label">Quá hạn 90+ ngày</div>
                            <div className="value">{formatCurrency(customerDebts.summary.aging.overdue90)}</div>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="report-table">
                    <h3>Danh sách công nợ ({customerDebts.items.length})</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Mã KH</th>
                                <th>Tên khách hàng</th>
                                <th>SĐT</th>
                                <th className="text-right">Công nợ</th>
                                <th>Số ngày nợ</th>
                                <th className="text-right">Tổng mua</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customerDebts.items.map((item: any) => (
                                <tr key={item.id}>
                                    <td>{item.code || item.id}</td>
                                    <td>{item.name}</td>
                                    <td>{item.phone || '—'}</td>
                                    <td className="text-right negative">{formatCurrency(item.currentDebt)}</td>
                                    <td>{item.debtDays || 0} ngày</td>
                                    <td className="text-right">{formatCurrency(item.totalSales)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </>
        );
    };

    const renderSupplierDebtsReport = () => {
        if (!supplierDebts) return <div className="report-empty"><MdLocalShipping className="icon" /><p>Chưa có dữ liệu</p></div>;

        return (
            <>
                {/* Summary */}
                <div className="report-summary">
                    <div className="summary-card">
                        <div className="label">Tổng công nợ NCC</div>
                        <div className="value negative">{formatCurrency(supplierDebts.summary.totalDebt)}</div>
                    </div>
                    <div className="summary-card">
                        <div className="label">Số nhà cung cấp</div>
                        <div className="value">{supplierDebts.summary.supplierCount}</div>
                    </div>
                </div>

                {/* Table */}
                <div className="report-table">
                    <h3>Danh sách công nợ NCC ({supplierDebts.items.length})</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Mã NCC</th>
                                <th>Tên nhà cung cấp</th>
                                <th>SĐT</th>
                                <th className="text-right">Công nợ</th>
                                <th className="text-right">Tổng mua</th>
                            </tr>
                        </thead>
                        <tbody>
                            {supplierDebts.items.map((item: any) => (
                                <tr key={item.id}>
                                    <td>{item.code || item.id}</td>
                                    <td>{item.name}</td>
                                    <td>{item.phone || '—'}</td>
                                    <td className="text-right negative">{formatCurrency(item.currentDebt)}</td>
                                    <td className="text-right">{formatCurrency(item.totalPurchase)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </>
        );
    };

    return (
        <div className="reports-page">
            <div className="reports-header">
                <h2>Báo cáo</h2>
            </div>

            {/* Tabs */}
            <div className="reports-tabs">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        className={`reports-tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <tab.icon style={{ marginRight: 6 }} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Filters */}
            {(activeTab === 'revenue') && (
                <div className="report-filters">
                    <div className="filter-group">
                        <label>Từ ngày:</label>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                        />
                    </div>
                    <div className="filter-group">
                        <label>Đến ngày:</label>
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                        />
                    </div>
                    <button className="btn-filter" onClick={fetchReport}>
                        <MdSearch /> Xem báo cáo
                    </button>
                </div>
            )}

            {/* Content */}
            {renderContent()}
        </div>
    );
}
