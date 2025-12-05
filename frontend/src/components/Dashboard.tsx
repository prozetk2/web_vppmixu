import { useState, useEffect } from 'react';
import {
    productsAPI,
    categoriesAPI,
    warehousesAPI,
    customersAPI,
    suppliersAPI
} from '../services/api';
import './Dashboard.css';

interface DashboardProps {
    onLogout: () => void;
}

type TabType = 'products' | 'categories' | 'warehouses' | 'customers' | 'suppliers';

export default function Dashboard({ onLogout }: DashboardProps) {
    const [activeTab, setActiveTab] = useState<TabType>('products');
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
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            console.log(`Fetching ${activeTab} data...`);
            let response;
            switch (activeTab) {
                case 'products':
                    response = await productsAPI.getAll();
                    break;
                case 'categories':
                    response = await categoriesAPI.getAll();
                    break;
                case 'warehouses':
                    response = await warehousesAPI.getAll();
                    break;
                case 'customers':
                    response = await customersAPI.getAll();
                    break;
                case 'suppliers':
                    response = await suppliersAPI.getAll();
                    break;
            }
            console.log(`${activeTab} response:`, response?.data);
            // Handle both {data: [...]} and [...] formats
            const result = Array.isArray(response?.data) ? response.data : (response?.data?.data || []);
            setData(result);
        } catch (error: any) {
            console.error(`Failed to fetch ${activeTab} data:`, error);
            console.error('Error details:', error.response?.data || error.message);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'products' as TabType, label: 'Sản phẩm' },
        { id: 'categories' as TabType, label: 'Danh mục' },
        { id: 'warehouses' as TabType, label: 'Kho hàng' },
        { id: 'customers' as TabType, label: 'Khách hàng' },
        { id: 'suppliers' as TabType, label: 'Nhà cung cấp' },
    ];

    const getTableHeaders = () => {
        switch (activeTab) {
            case 'products':
                return ['Mã', 'Tên sản phẩm', 'SKU', 'Giá bán', 'Giá vốn'];
            case 'categories':
                return ['Mã', 'Tên danh mục', 'Mã danh mục', 'Mô tả'];
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
            case 'products':
                return [
                    item.id,
                    item.name,
                    item.sku || '—',
                    item.defaultPrice ? `${item.defaultPrice.toLocaleString()}đ` : '—',
                    item.defaultCost ? `${item.defaultCost.toLocaleString()}đ` : '—',
                ];
            case 'categories':
                return [
                    item.id,
                    item.name,
                    item.code || '—',
                    item.description || '—',
                ];
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

    const activeTabInfo = tabs.find(t => t.id === activeTab);

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
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </nav>

                <div className="container">
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
                </div>
            </main>
        </div>
    );
}
