import { useEffect, useState } from 'react';
import { productsAPI, categoriesAPI, warehousesAPI, customersAPI, suppliersAPI } from '../services/api';

interface DashboardProps {
    onLogout: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
    const [activeTab, setActiveTab] = useState('products');
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
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
                default:
                    response = { data: { data: [] } };
            }
            setData(response.data.data || response.data || []);
        } catch (err) {
            console.error('Error loading data:', err);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'products', label: 'Sản phẩm', icon: '📦' },
        { id: 'categories', label: 'Danh mục', icon: '📂' },
        { id: 'warehouses', label: 'Kho', icon: '🏪' },
        { id: 'customers', label: 'Khách hàng', icon: '👥' },
        { id: 'suppliers', label: 'Nhà cung cấp', icon: '🏭' },
    ];

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-white shadow-md">
                <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800">
                        Quản lý kho & công nợ
                    </h1>
                    <button
                        onClick={onLogout}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                    >
                        Đăng xuất
                    </button>
                </div>
            </header>

            {/* Navigation Tabs */}
            <div className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex space-x-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-6 py-3 font-medium transition-colors ${activeTab === tab.id
                                        ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                                    }`}
                            >
                                <span className="mr-2">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <main className="max-w-7xl mx-auto px-4 py-6">
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4 capitalize">
                        {tabs.find((t) => t.id === activeTab)?.label}
                    </h2>

                    {loading ? (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            <p className="mt-4 text-gray-600">Đang tải...</p>
                        </div>
                    ) : data.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <p className="text-lg">Không có dữ liệu</p>
                            <p className="text-sm mt-2">Hãy thêm mới để bắt đầu</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            ID
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Tên
                                        </th>
                                        {activeTab === 'products' && (
                                            <>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    SKU
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Giá
                                                </th>
                                            </>
                                        )}
                                        {(activeTab === 'customers' || activeTab === 'suppliers') && (
                                            <>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Email
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    SĐT
                                                </th>
                                            </>
                                        )}
                                        {activeTab === 'warehouses' && (
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Địa chỉ
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {data.map((item: any) => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {item.id}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {item.name}
                                            </td>
                                            {activeTab === 'products' && (
                                                <>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {item.sku || '-'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {item.defaultPrice ? `${Number(item.defaultPrice).toLocaleString()} ₫` : '-'}
                                                    </td>
                                                </>
                                            )}
                                            {(activeTab === 'customers' || activeTab === 'suppliers') && (
                                                <>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {item.email || '-'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {item.phone || '-'}
                                                    </td>
                                                </>
                                            )}
                                            {activeTab === 'warehouses' && (
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {item.address || '-'}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
