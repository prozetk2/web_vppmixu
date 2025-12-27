import { useState, useEffect } from 'react';
import { dashboardAPI, reportsAPI } from '../../services/api';
import { MdAttachMoney, MdUndo, MdTrendingUp, MdShoppingCart, MdBarChart, MdList, MdDescription, MdInventory, MdPeople, MdArrowUpward, MdArrowDownward, MdAssessment, MdSearch, MdDownload } from 'react-icons/md';
import './DashboardOverview.css';

interface Stats {
    revenue: number;
    discounts: number;
    returns: number;
    netRevenue: number;
    costAmount: number;
    grossProfit: number;
    profitMargin: number;
    changePercent: number;
    orderCount: number;
    returnCount: number;
}

interface ChartData {
    date: string;
    label: string;
    value: number;
}

interface TopProduct {
    id: string;
    name: string;
    totalValue: number;
    quantity: number;
}

interface TopCustomer {
    id: string;
    name: string;
    totalValue: number;
    orderCount: number;
}

interface Activity {
    id: string;
    type: string;
    description: string;
    value: number;
    createdAt: string;
    timeAgo: string;
}

export default function DashboardOverview() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<Stats | null>(null);
    const [chartData, setChartData] = useState<ChartData[]>([]);
    const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
    const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
    const [activities, setActivities] = useState<Activity[]>([]);

    // View toggle: 'overview' | 'reports'
    const [activeView, setActiveView] = useState<'overview' | 'reports'>('overview');

    // Separate filter states
    const [chartDateRange, setChartDateRange] = useState('7days');
    const [productDateRange, setProductDateRange] = useState('thisMonth');
    const [customerDateRange, setCustomerDateRange] = useState('thisMonth');

    // Reports state
    const [reportsLoading, setReportsLoading] = useState(false);
    const [revenueData, setRevenueData] = useState<any>(null);
    const [inventoryData, setInventoryData] = useState<any>(null);
    const [reportFromDate, setReportFromDate] = useState(() => {
        const d = new Date();
        d.setDate(1);
        return d.toISOString().split('T')[0];
    });
    const [reportToDate, setReportToDate] = useState(() => new Date().toISOString().split('T')[0]);

    // Helper to calculate date range
    const getDateRange = (range: string): { fromDate: string; toDate: string } => {
        const now = new Date();
        let fromDate: Date;
        let toDate = new Date(now);

        switch (range) {
            case 'today':
                fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'yesterday':
                fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
                toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
                break;
            case '7days':
                fromDate = new Date(now);
                fromDate.setDate(fromDate.getDate() - 6);
                break;
            case 'thisMonth':
                fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'lastMonth':
                fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                toDate = new Date(now.getFullYear(), now.getMonth(), 0);
                break;
            default:
                fromDate = new Date(now);
                fromDate.setDate(fromDate.getDate() - 6);
        }

        return {
            fromDate: fromDate.toISOString().split('T')[0],
            toDate: toDate.toISOString().split('T')[0],
        };
    };

    useEffect(() => {
        fetchDashboardData();
    }, [chartDateRange, productDateRange, customerDateRange]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const chartDates = getDateRange(chartDateRange);
            const productDates = getDateRange(productDateRange);
            const customerDates = getDateRange(customerDateRange);

            const [statsRes, chartRes, productsRes, customersRes, activitiesRes] = await Promise.all([
                dashboardAPI.getStats({}),
                dashboardAPI.getRevenueChart(chartDates),
                dashboardAPI.getTopProducts(productDates),
                dashboardAPI.getTopCustomers(customerDates),
                dashboardAPI.getRecentActivities(),
            ]);

            // Handle nested data structure from API (res.data contains {data: actualData})
            const statsData = statsRes.data?.data || statsRes.data;
            const chartRawData = chartRes.data?.data || chartRes.data;
            const productsRawData = productsRes.data?.data || productsRes.data;
            const customersRawData = customersRes.data?.data || customersRes.data;
            const activitiesRawData = activitiesRes.data?.data || activitiesRes.data;

            console.log('Dashboard Stats Response:', statsRes);
            console.log('Stats Data (parsed):', statsData);
            setStats(statsData);
            // Ensure arrays with safe defaults
            setChartData(Array.isArray(chartRawData) ? chartRawData : []);
            setTopProducts(Array.isArray(productsRawData) ? productsRawData : []);
            setTopCustomers(Array.isArray(customersRawData) ? customersRawData : []);
            setActivities(Array.isArray(activitiesRawData) ? activitiesRawData : []);
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        if (value >= 1000000) {
            return (value / 1000000).toFixed(1) + ' tr';
        }
        if (value >= 1000) {
            return (value / 1000).toFixed(0) + ' K';
        }
        return value.toLocaleString();
    };

    const formatFullCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN').format(value);
    };

    // Safe getters with fallbacks for empty arrays
    const getMaxChartValue = () => chartData.length > 0 ? Math.max(...chartData.map((d) => d.value), 1) : 1;
    const getMaxProductValue = () => topProducts.length > 0 ? Math.max(...topProducts.map((p) => p.totalValue), 1) : 1;
    const getMaxCustomerValue = () => topCustomers.length > 0 ? Math.max(...topCustomers.map((c) => c.totalValue), 1) : 1;
    const chartTotal = chartData.length > 0 ? chartData.reduce((sum, d) => sum + d.value, 0) : 0;

    const fetchReportData = async () => {
        setReportsLoading(true);
        try {
            const [revRes, invRes] = await Promise.all([
                reportsAPI.getRevenue({ fromDate: reportFromDate, toDate: reportToDate }),
                reportsAPI.getInventoryValue({}),
            ]);
            // Handle nested data structure from API (res.data contains {data: actualData})
            const revenueRawData = revRes.data?.data || revRes.data;
            const inventoryRawData = invRes.data?.data || invRes.data;
            console.log('Revenue Data:', revenueRawData);
            console.log('Inventory Data:', inventoryRawData);
            setRevenueData(revenueRawData);
            setInventoryData(inventoryRawData);
        } catch (error) {
            console.error('Failed to fetch report data:', error);
        } finally {
            setReportsLoading(false);
        }
    };

    // Download CSV utility
    const downloadCSV = (data: any[], filename: string) => {
        if (!data || !Array.isArray(data) || data.length === 0) {
            alert('Không có dữ liệu để xuất. Vui lòng kiểm tra backend đã được khởi động.');
            return;
        }

        // Check if first row has valid data
        if (!data[0] || typeof data[0] !== 'object') {
            alert('Dữ liệu không hợp lệ');
            return;
        }

        const headers = Object.keys(data[0]);
        if (headers.length === 0) {
            alert('Không tìm thấy cột dữ liệu');
            return;
        }

        const csvRows = [
            headers.join(','),
            ...data.map(row =>
                headers.map(h => {
                    const val = row[h] !== undefined && row[h] !== null ? String(row[h]) : '';
                    // Escape quotes and wrap in quotes if contains comma
                    const escaped = val.replace(/"/g, '""');
                    return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')
                        ? `"${escaped}"`
                        : escaped;
                }).join(',')
            )
        ];
        const csvString = '\uFEFF' + csvRows.join('\n'); // BOM for UTF-8
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    };

    const handleExportRevenue = async () => {
        try {
            const res = await reportsAPI.exportRevenue({ fromDate: reportFromDate, toDate: reportToDate });
            // Handle nested data structure
            const exportData = res.data?.data || res.data;
            if (!exportData) {
                alert('Không nhận được dữ liệu từ server. Vui lòng kiểm tra backend đã chạy.');
                return;
            }
            console.log('Export Revenue Data:', exportData);
            downloadCSV(exportData, `bao_cao_doanh_thu_${reportFromDate}_${reportToDate}.csv`);
        } catch (error: any) {
            console.error('Failed to export revenue:', error);
            const message = error.response?.status === 401
                ? 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.'
                : error.response?.status === 404
                    ? 'Endpoint chưa được triển khai. Vui lòng khởi động lại backend.'
                    : 'Lỗi khi xuất báo cáo doanh thu';
            alert(message);
        }
    };

    const handleExportInventory = async () => {
        try {
            const res = await reportsAPI.exportInventoryValue({});
            // Handle nested data structure
            const exportData = res.data?.data || res.data;
            if (!exportData) {
                alert('Không nhận được dữ liệu từ server. Vui lòng kiểm tra backend đã chạy.');
                return;
            }
            console.log('Export Inventory Data:', exportData);
            downloadCSV(exportData, `gia_tri_ton_kho_${new Date().toISOString().slice(0, 10)}.csv`);
        } catch (error: any) {
            console.error('Failed to export inventory:', error);
            const message = error.response?.status === 401
                ? 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.'
                : error.response?.status === 404
                    ? 'Endpoint chưa được triển khai. Vui lòng khởi động lại backend.'
                    : 'Lỗi khi xuất báo cáo tồn kho';
            alert(message);
        }
    };

    useEffect(() => {
        if (activeView === 'reports' && !revenueData) {
            fetchReportData();
        }
    }, [activeView]);

    if (loading) {
        return (
            <div className="dashboard-overview">
                <div className="loading-state">
                    <div className="spinner-large"></div>
                    <p>Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-overview">
            {/* View Toggle Tabs */}
            <div className="view-toggle">
                <button
                    className={`view-tab ${activeView === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveView('overview')}
                >
                    <MdBarChart /> Tổng quan
                </button>
                <button
                    className={`view-tab ${activeView === 'reports' ? 'active' : ''}`}
                    onClick={() => setActiveView('reports')}
                >
                    <MdAssessment /> Báo cáo
                </button>
            </div>

            {activeView === 'reports' ? (
                /* Reports View */
                <div className="reports-section">
                    {/* Reports Filters */}
                    <div className="report-filters">
                        <div className="filter-group">
                            <label>Từ ngày:</label>
                            <input
                                type="date"
                                value={reportFromDate}
                                onChange={(e) => setReportFromDate(e.target.value)}
                            />
                        </div>
                        <div className="filter-group">
                            <label>Đến ngày:</label>
                            <input
                                type="date"
                                value={reportToDate}
                                onChange={(e) => setReportToDate(e.target.value)}
                            />
                        </div>
                        <button className="btn-filter" onClick={fetchReportData}>
                            <MdSearch /> Xem báo cáo
                        </button>
                        <button className="btn-export" onClick={handleExportRevenue} title="Xuất báo cáo doanh thu">
                            <MdDownload /> Xuất Excel
                        </button>
                    </div>

                    {reportsLoading ? (
                        <div className="loading-state">
                            <div className="spinner-large"></div>
                            <p>Đang tải báo cáo...</p>
                        </div>
                    ) : (
                        <>
                            {/* Revenue Summary */}
                            {revenueData && (
                                <div className="chart-card">
                                    <div className="chart-header">
                                        <h3 className="chart-title">Báo cáo doanh thu</h3>
                                    </div>
                                    <div className="summary-cards">
                                        <div className="summary-card">
                                            <div className="card-icon revenue"><MdAttachMoney /></div>
                                            <div className="card-content">
                                                <div className="card-label">Tổng doanh thu</div>
                                                <div className="card-value">{formatFullCurrency(revenueData.summary?.totalRevenue || 0)}</div>
                                            </div>
                                        </div>
                                        <div className="summary-card">
                                            <div className="card-icon net"><MdTrendingUp /></div>
                                            <div className="card-content">
                                                <div className="card-label">Doanh thu thuần</div>
                                                <div className="card-value">{formatFullCurrency(revenueData.summary?.netRevenue || 0)}</div>
                                            </div>
                                        </div>
                                        <div className="summary-card">
                                            <div className="card-icon orders"><MdShoppingCart /></div>
                                            <div className="card-content">
                                                <div className="card-label">Số đơn hàng</div>
                                                <div className="card-value">{revenueData.summary?.orderCount || 0}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Inventory Summary */}
                            {inventoryData && (
                                <div className="chart-card">
                                    <div className="chart-header">
                                        <h3 className="chart-title">Giá trị tồn kho</h3>
                                        <button className="btn-export-sm" onClick={handleExportInventory} title="Xuất báo cáo tồn kho">
                                            <MdDownload /> Xuất
                                        </button>
                                    </div>
                                    <div className="summary-cards">
                                        <div className="summary-card">
                                            <div className="card-icon revenue"><MdInventory /></div>
                                            <div className="card-content">
                                                <div className="card-label">Tổng giá trị</div>
                                                <div className="card-value">{formatFullCurrency(inventoryData.summary?.totalValue || 0)}</div>
                                            </div>
                                        </div>
                                        <div className="summary-card">
                                            <div className="card-icon orders"><MdInventory /></div>
                                            <div className="card-content">
                                                <div className="card-label">Tổng số lượng</div>
                                                <div className="card-value">{formatFullCurrency(inventoryData.summary?.totalQuantity || 0)}</div>
                                            </div>
                                        </div>
                                        <div className="summary-card">
                                            <div className="card-icon net"><MdList /></div>
                                            <div className="card-content">
                                                <div className="card-label">Số sản phẩm</div>
                                                <div className="card-value">{inventoryData.summary?.itemCount || 0}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            ) : (
                /* Overview View */
                <>
                    {/* Summary Section */}
                    <div className="summary-section">
                        <h2>Kết quả bán hàng hôm nay</h2>
                        <div className="summary-cards">
                            <div className="summary-card">
                                <div className="card-icon revenue"><MdAttachMoney /></div>
                                <div className="card-content">
                                    <div className="card-label">Doanh thu</div>
                                    <div className="card-value">{formatFullCurrency(stats?.revenue || 0)}</div>
                                </div>
                            </div>
                            <div className="summary-card">
                                <div className="card-icon returns"><MdUndo /></div>
                                <div className="card-content">
                                    <div className="card-label">Trả hàng</div>
                                    <div className="card-value">{formatFullCurrency(stats?.returns || 0)}</div>
                                </div>
                            </div>
                            <div className="summary-card">
                                <div className="card-icon net"><MdTrendingUp /></div>
                                <div className="card-content">
                                    <div className="card-label">Doanh thu thuần</div>
                                    <div className="card-value">{formatFullCurrency(stats?.netRevenue || 0)}</div>
                                    {stats && (
                                        <div className={`card - change ${stats.changePercent >= 0 ? 'positive' : 'negative'} `}>
                                            {stats.changePercent >= 0 ? <MdArrowUpward /> : <MdArrowDownward />} {Math.abs(stats.changePercent).toFixed(2)}%
                                            <span> so với hôm qua</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="summary-card">
                                <div className="card-icon orders"><MdShoppingCart /></div>
                                <div className="card-content">
                                    <div className="card-label">Đơn hàng</div>
                                    <div className="card-value">{stats?.orderCount || 0}</div>
                                </div>
                            </div>
                            <div className="summary-card">
                                <div className="card-icon profit"><MdTrendingUp /></div>
                                <div className="card-content">
                                    <div className="card-label">Lợi nhuận gộp</div>
                                    <div className="card-value">{formatFullCurrency(stats?.grossProfit || 0)}</div>
                                </div>
                            </div>
                            <div className="summary-card">
                                <div className="card-icon margin"><MdBarChart /></div>
                                <div className="card-content">
                                    <div className="card-label">Tỷ suất LN</div>
                                    <div className="card-value">{stats?.profitMargin?.toFixed(1) || 0}%</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className="charts-section">
                        {/* Revenue Chart */}
                        <div className="chart-card">
                            <div className="chart-header">
                                <div>
                                    <h3 className="chart-title">Doanh thu thuần</h3>
                                    <div className="chart-total">
                                        {formatFullCurrency(chartTotal)}
                                    </div>
                                </div>
                                <div className="date-filter">
                                    <select
                                        value={chartDateRange}
                                        onChange={(e) => setChartDateRange(e.target.value)}
                                        className="date-select"
                                    >
                                        <option value="today">Hôm nay</option>
                                        <option value="yesterday">Hôm qua</option>
                                        <option value="7days">7 ngày qua</option>
                                        <option value="thisMonth">Tháng này</option>
                                        <option value="lastMonth">Tháng trước</option>
                                    </select>
                                </div>
                            </div>
                            <div className="chart-tabs">
                                <button className="chart-tab active">Theo ngày</button>
                                <button className="chart-tab">Theo giờ</button>
                                <button className="chart-tab">Theo thứ</button>
                            </div>
                            {chartData.length === 0 ? (
                                <div className="empty-chart">
                                    <div className="empty-chart-icon"><MdBarChart size={48} /></div>
                                    <p>Chưa có dữ liệu</p>
                                </div>
                            ) : (
                                <div className="revenue-chart">
                                    {chartData.map((item, idx) => (
                                        <div key={idx} className="bar-container">
                                            <div className="bar-value">{formatCurrency(item.value)}</div>
                                            <div
                                                className="bar"
                                                style={{
                                                    height: `${(item.value / getMaxChartValue()) * 250} px`,
                                                }}
                                                title={`${item.date}: ${formatFullCurrency(item.value)} `}
                                            />
                                            <div className="bar-label">{item.label}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Activities */}
                        <div className="activities-section">
                            <div className="chart-header">
                                <h3 className="chart-title">Hoạt động gần đây</h3>
                            </div>
                            {activities.length === 0 ? (
                                <div className="empty-chart">
                                    <div className="empty-chart-icon"><MdList size={48} /></div>
                                    <p>Chưa có hoạt động</p>
                                </div>
                            ) : (
                                <div className="activities-list">
                                    {activities.map((activity) => (
                                        <div key={activity.id} className="activity-item">
                                            <div className="activity-icon"><MdDescription /></div>
                                            <div className="activity-content">
                                                <div className="activity-description">
                                                    {activity.description} với giá trị{' '}
                                                    <span className="activity-value">{formatFullCurrency(activity.value)}</span>
                                                </div>
                                                <div className="activity-time">{activity.timeAgo}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Top Products & Customers */}
                    <div className="horizontal-charts">
                        {/* Top Products */}
                        <div className="chart-card">
                            <div className="chart-header">
                                <h3 className="chart-title">Top 10 hàng bán chạy</h3>
                                <div className="chart-filters">
                                    <select className="date-select">
                                        <option value="revenue">Theo doanh thu thuần</option>
                                        <option value="quantity">Theo số lượng</option>
                                    </select>
                                    <select
                                        value={productDateRange}
                                        onChange={(e) => setProductDateRange(e.target.value)}
                                        className="date-select"
                                    >
                                        <option value="today">Hôm nay</option>
                                        <option value="yesterday">Hôm qua</option>
                                        <option value="7days">7 ngày qua</option>
                                        <option value="thisMonth">Tháng này</option>
                                        <option value="lastMonth">Tháng trước</option>
                                    </select>
                                </div>
                            </div>
                            {topProducts.length === 0 ? (
                                <div className="empty-chart">
                                    <div className="empty-chart-icon"><MdInventory size={48} /></div>
                                    <p>Chưa có dữ liệu</p>
                                </div>
                            ) : (
                                <div className="horizontal-bar-list">
                                    {topProducts.map((product, idx) => (
                                        <div key={product.id} className="horizontal-bar-item">
                                            <div className="horizontal-bar-rank">{idx + 1}</div>
                                            <div className="horizontal-bar-info">
                                                <div className="horizontal-bar-name">{product.name}</div>
                                                <div className="horizontal-bar-wrapper">
                                                    <div
                                                        className="horizontal-bar-fill"
                                                        style={{
                                                            width: `${(product.totalValue / getMaxProductValue()) * 100}% `,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="horizontal-bar-value">{formatCurrency(product.totalValue)}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Top Customers */}
                        <div className="chart-card">
                            <div className="chart-header">
                                <h3 className="chart-title">Top 10 khách mua nhiều nhất</h3>
                                <select
                                    value={customerDateRange}
                                    onChange={(e) => setCustomerDateRange(e.target.value)}
                                    className="date-select"
                                >
                                    <option value="today">Hôm nay</option>
                                    <option value="yesterday">Hôm qua</option>
                                    <option value="7days">7 ngày qua</option>
                                    <option value="thisMonth">Tháng này</option>
                                    <option value="lastMonth">Tháng trước</option>
                                </select>
                            </div>
                            {topCustomers.length === 0 ? (
                                <div className="empty-chart">
                                    <div className="empty-chart-icon"><MdPeople size={48} /></div>
                                    <p>Chưa có dữ liệu</p>
                                </div>
                            ) : (
                                <div className="horizontal-bar-list">
                                    {topCustomers.map((customer, idx) => (
                                        <div key={customer.id} className="horizontal-bar-item">
                                            <div className="horizontal-bar-rank">{idx + 1}</div>
                                            <div className="horizontal-bar-info">
                                                <div className="horizontal-bar-name">{customer.name}</div>
                                                <div className="horizontal-bar-wrapper">
                                                    <div
                                                        className="horizontal-bar-fill customer"
                                                        style={{
                                                            width: `${(customer.totalValue / getMaxCustomerValue()) * 100}% `,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="horizontal-bar-value customer">
                                                {formatCurrency(customer.totalValue)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
