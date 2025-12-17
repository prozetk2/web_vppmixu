import { useState, useEffect } from 'react';
import {
    customersAPI,
    suppliersAPI
} from '../services/api';
import ProductList from './products/ProductList';
import CategoryList from './categories/CategoryList';
import InventoryOverview from './inventory/InventoryOverview';
import DashboardOverview from './dashboard/DashboardOverview';
import WarehouseList from './warehouses/WarehouseList';
import POSPage from './sales/POSPage';
import SalesList from './sales/SalesList';
import PurchaseList from './purchases/PurchaseList';
import CustomerList from './customers/CustomerList';
import './Dashboard.css';

interface DashboardProps {
    onLogout: () => void;
}

type TabType = 'overview' | 'pos' | 'purchases' | 'sales' | 'products' | 'categories' | 'inventory' | 'warehouses' | 'customers' | 'suppliers';

export default function Dashboard({ onLogout }: DashboardProps) {
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setUser({ username: payload.username });
            } catch (error) {
                setUser({ username: 'User' });
            }
        }
    }, []);

    useEffect(() => {
        // Only fetch for non-specialized tabs
        if (!['overview', 'products', 'categories', 'inventory', 'warehouses', 'pos', 'sales'].includes(activeTab)) {
            fetchData();
        }
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            let response;
            switch (activeTab) {
                case 'customers':
                    response = await customersAPI.getAll();
                    break;
                case 'suppliers':
                    response = await suppliersAPI.getAll();
                    break;
            }
            setData(response?.data?.data || response?.data || []);
        } catch (error) {
            console.error('Failed to fetch data:', error);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'overview' as TabType, label: 'Tổng quan', icon: '🏠' },
        { id: 'pos' as TabType, label: 'Bán hàng', icon: '💰' },
        { id: 'purchases' as TabType, label: 'Nhập hàng', icon: '📥' },
        { id: 'sales' as TabType, label: 'Hóa đơn', icon: '📄' },
        { id: 'products' as TabType, label: 'Sản phẩm', icon: '📦' },
        { id: 'categories' as TabType, label: 'Danh mục', icon: '📁' },
        { id: 'inventory' as TabType, label: 'Tồn kho', icon: '📊' },
        { id: 'warehouses' as TabType, label: 'Kho hàng', icon: '🏭' },
        { id: 'customers' as TabType, label: 'Khách hàng', icon: '👥' },
        { id: 'suppliers' as TabType, label: 'Nhà cung cấp', icon: '🚚' },
    ];

    const getTableHeaders = () => {
        switch (activeTab) {
            case 'warehouses':
                return ['Mã', 'Tên kho', 'Mã kho', 'Địa chỉ'];
            case 'customers':
                return ['Mã', 'Tên khách hàng', 'Email', 'Điện thoại', 'Địa chỉ'];
            case 'suppliers':
                return ['Mã', 'Tên nhà cung cấp', 'Email', 'Điện thoại', 'Địa chỉ'];
            default:
                return [];
        }
    };

    const renderTableRow = (item: any) => {
        switch (activeTab) {
            case 'warehouses':
                return [
                    item.id,
                    item.name,
                    item.code || '—',
                    item.address || '—',
                ];
            case 'customers':
            case 'suppliers':
                return [
                    item.id,
                    item.name,
                    item.email || '—',
                    item.phone || '—',
                    item.address || '—',
                ];
            default:
                return [];
        }
    };

    const renderContent = () => {
        // Use specialized components for different tabs
        if (activeTab === 'overview') {
            return <DashboardOverview />;
        }

        if (activeTab === 'products') {
            return <ProductList />;
        }

        if (activeTab === 'categories') {
            return <CategoryList />;
        }

        if (activeTab === 'inventory') {
            return <InventoryOverview />;
        }

        if (activeTab === 'pos') {
            return <POSPage />;
        }

        if (activeTab === 'sales') {
            return <SalesList />;
        }

        if (activeTab === 'purchases') {
            return <PurchaseList />;
        }

        if (activeTab === 'warehouses') {
            return <WarehouseList />;
        }

        if (activeTab === 'customers') {
            return <CustomerList />;
        }

        // Render generic table for other tabs
        const activeTabInfo = tabs.find(t => t.id === activeTab);

        return (
            <div className="content-card">
                <div className="card-header">
                    <h2 className="card-title">{activeTabInfo?.label}</h2>
                    <span className="card-count">{data.length} bản ghi</span>
                </div>

                {loading ? (
                    <div className="loading-state">
                        <div className="spinner-large"></div>
                        <p>Đang tải dữ liệu...</p>
                    </div>
                ) : data.length === 0 ? (
                    <div className="empty-state">
                        <h3>Chưa có dữ liệu</h3>
                        <p>Bắt đầu thêm {activeTabInfo?.label.toLowerCase()} đầu tiên</p>
                    </div>
                ) : (
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    {getTableHeaders().map((header, index) => (
                                        <th key={index}>{header}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((item) => (
                                    <tr key={item.id}>
                                        {renderTableRow(item).map((cell, cellIndex) => (
                                            <td key={cellIndex}>{cell}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div className="container header-content">
                    <div className="header-left">
                        <div className="logo">
                            <span className="logo-text">WMS</span>
                        </div>
                        <h1 className="header-title">Hệ thống quản lý kho hàng</h1>
                    </div>
                    <div className="header-right">
                        <div className="user-info">
                            <div className="user-avatar">
                                {user?.username?.charAt(0).toUpperCase()}
                            </div>
                            <span className="user-name">{user?.username}</span>
                        </div>
                        <button onClick={onLogout} className="btn-logout" title="Đăng xuất">
                            Thoát
                        </button>
                    </div>
                </div>
            </header>

            <main className="dashboard-main">
                <nav className="tabs-nav">
                    <div className="container">
                        <div className="tabs-wrapper">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                                >
                                    <span className="tab-icon">{tab.icon}</span>
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </nav>

                <div className="container">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
}
