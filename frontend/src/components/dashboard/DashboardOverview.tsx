import { useState, useEffect } from 'react';
import { dashboardAPI } from '../../services/api';
import './DashboardOverview.css';

interface Stats {
    revenue: number;
    returns: number;
    netRevenue: number;
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

    // Separate filter states
    const [chartDateRange, setChartDateRange] = useState('7days');
    const [productDateRange, setProductDateRange] = useState('thisMonth');
    const [customerDateRange, setCustomerDateRange] = useState('thisMonth');

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

            setStats(statsRes.data);
            // Ensure arrays with safe defaults
            setChartData(Array.isArray(chartRes.data) ? chartRes.data : []);
            setTopProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
            setTopCustomers(Array.isArray(customersRes.data) ? customersRes.data : []);
            setActivities(Array.isArray(activitiesRes.data) ? activitiesRes.data : []);
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
            {/* Summary Section */}
            <div className="summary-section">
                <h2>Kết quả bán hàng hôm nay</h2>
                <div className="summary-cards">
                    <div className="summary-card">
                        <div className="card-icon revenue">💰</div>
                        <div className="card-content">
                            <div className="card-label">Doanh thu</div>
                            <div className="card-value">{formatFullCurrency(stats?.revenue || 0)}</div>
                        </div>
                    </div>
                    <div className="summary-card">
                        <div className="card-icon returns">↩️</div>
                        <div className="card-content">
                            <div className="card-label">Trả hàng</div>
                            <div className="card-value">{formatFullCurrency(stats?.returns || 0)}</div>
                        </div>
                    </div>
                    <div className="summary-card">
                        <div className="card-icon net">📈</div>
                        <div className="card-content">
                            <div className="card-label">Doanh thu thuần</div>
                            <div className="card-value">{formatFullCurrency(stats?.netRevenue || 0)}</div>
                            {stats && (
                                <div className={`card-change ${stats.changePercent >= 0 ? 'positive' : 'negative'}`}>
                                    {stats.changePercent >= 0 ? '↑' : '↓'} {Math.abs(stats.changePercent).toFixed(2)}%
                                    <span> so với hôm qua</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="summary-card">
                        <div className="card-icon orders">🛒</div>
                        <div className="card-content">
                            <div className="card-label">Đơn hàng</div>
                            <div className="card-value">{stats?.orderCount || 0}</div>
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
                            <div className="empty-chart-icon">📊</div>
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
                                            height: `${(item.value / getMaxChartValue()) * 250}px`,
                                        }}
                                        title={`${item.date}: ${formatFullCurrency(item.value)}`}
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
                            <div className="empty-chart-icon">📋</div>
                            <p>Chưa có hoạt động</p>
                        </div>
                    ) : (
                        <div className="activities-list">
                            {activities.map((activity) => (
                                <div key={activity.id} className="activity-item">
                                    <div className="activity-icon">📄</div>
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
                            <div className="empty-chart-icon">📦</div>
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
                                                    width: `${(product.totalValue / getMaxProductValue()) * 100}%`,
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
                            <div className="empty-chart-icon">👥</div>
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
                                                    width: `${(customer.totalValue / getMaxCustomerValue()) * 100}%`,
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
        </div>
    );
}
