import { useState, useEffect } from 'react';
import { priceListsAPI, productsAPI } from '../../services/api';
import { Toast, useToast } from '../shared/Toast';
import { MdAdd, MdDelete, MdSave, MdClose } from 'react-icons/md';
import './PriceListsPage.css';

interface PriceList {
    id: string;
    name: string;
    code: string;
    description?: string;
    isDefault: boolean;
    active: boolean;
}

interface Product {
    id: string;
    sku: string;
    name: string;
    defaultPrice: number;
}

export default function PriceListsPage() {
    const [priceLists, setPriceLists] = useState<PriceList[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedPriceList, setSelectedPriceList] = useState<string | null>(null);
    const [productPrices, setProductPrices] = useState<Map<string, number>>(new Map());
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingPriceList, setEditingPriceList] = useState<Partial<PriceList> | null>(null);

    const toast = useToast();

    useEffect(() => {
        fetchPriceLists();
        fetchProducts();
    }, []);

    const fetchPriceLists = async () => {
        try {
            const response = await priceListsAPI.getAll();
            const lists = (response.data.data || response.data).map((pl: any) => ({
                id: pl.id.toString(),
                name: pl.name,
                code: pl.code,
                isDefault: pl.isDefault,
            }));
            setPriceLists(lists);
        } catch (error) {
            toast.error('Không thể tải danh sách bảng giá');
        }
    };

    const fetchProducts = async () => {
        try {
            const response = await productsAPI.getAll({ page: 1, limit: 1000 });
            const data = response.data?.data || [];
            setProducts(data.map((p: any) => ({
                id: p.id.toString(),
                sku: p.sku,
                name: p.name,
                defaultPrice: Number(p.defaultPrice || 0),
            })));
        } catch (error) {
            toast.error('Không thể tải danh sách sản phẩm');
        }
    };

    const loadPriceListProducts = async (priceListId: string) => {
        try {
            const response = await priceListsAPI.getProducts(priceListId);
            const prices = new Map<string, number>();

            const priceData = response.data.data || response.data || [];
            priceData.forEach((pp: any) => {
                prices.set(pp.productId.toString(), Number(pp.price));
            });

            setProductPrices(prices);
            setSelectedPriceList(priceListId);
        } catch (error) {
            toast.error('Không thể tải giá sản phẩm');
        }
    };

    const handleSavePrices = async () => {
        if (!selectedPriceList) return;

        try {
            const prices = Array.from(productPrices.entries()).map(([productId, price]) => ({
                productId,
                price,
            }));

            await priceListsAPI.bulkSetPrices(selectedPriceList, prices);
            toast.success('Đã lưu giá thành công');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Lỗi lưu giá');
        }
    };

    const handleCreatePriceList = async () => {
        if (!editingPriceList?.name || !editingPriceList?.code) {
            toast.error('Vui lòng điền đầy đủ thông tin');
            return;
        }

        try {
            await priceListsAPI.create(editingPriceList);
            toast.success('Tạo bảng giá thành công');
            setShowAddModal(false);
            setEditingPriceList(null);
            fetchPriceLists();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Lỗi tạo bảng giá');
        }
    };

    const handleDeletePriceList = async (id: string) => {
        if (!confirm('Xóa bảng giá này?')) return;

        try {
            await priceListsAPI.delete(id);
            toast.success('Đã xóa bảng giá');
            fetchPriceLists();
            if (selectedPriceList === id) {
                setSelectedPriceList(null);
                setProductPrices(new Map());
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Lỗi xóa bảng giá');
        }
    };

    const updateProductPrice = (productId: string, price: number) => {
        const newPrices = new Map(productPrices);
        if (price > 0) {
            newPrices.set(productId, price);
        } else {
            newPrices.delete(productId);
        }
        setProductPrices(newPrices);
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN').format(value);
    };

    return (
        <div className="price-lists-page">
            <Toast toasts={toast.toasts} onRemove={toast.removeToast} />

            <div className="page-header">
                <h2>Bảng giá</h2>
                <button className="btn-add" onClick={() => {
                    setEditingPriceList({ active: true, isDefault: false });
                    setShowAddModal(true);
                }}>
                    <MdAdd /> Tạo bảng giá
                </button>
            </div>

            <div className="price-lists-content">
                {/* Left: Price Lists */}
                <div className="price-lists-sidebar">
                    <h3>Danh sách bảng giá</h3>
                    <div className="price-list-items">
                        {priceLists.map(pl => (
                            <div
                                key={pl.id}
                                className={`price-list-item ${selectedPriceList === pl.id ? 'active' : ''}`}
                                onClick={() => loadPriceListProducts(pl.id)}
                            >
                                <div className="price-list-info">
                                    <strong>{pl.name}</strong>
                                    <span className="code">{pl.code}</span>
                                    {pl.isDefault && <span className="badge-default">Mặc định</span>}
                                </div>
                                <button
                                    className="btn-delete-small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeletePriceList(pl.id);
                                    }}
                                >
                                    <MdDelete />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Product Prices */}
                <div className="price-list-products">
                    {selectedPriceList ? (
                        <>
                            <div className="products-header">
                                <h3>Giá sản phẩm - {priceLists.find(pl => pl.id === selectedPriceList)?.name}</h3>
                                <button className="btn-save" onClick={handleSavePrices}>
                                    <MdSave /> Lưu tất cả
                                </button>
                            </div>

                            <div className="products-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>SKU</th>
                                            <th>Tên sản phẩm</th>
                                            <th>Giá mặc định</th>
                                            <th>Giá bán</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {products.map(product => (
                                            <tr key={product.id}>
                                                <td>{product.sku}</td>
                                                <td>{product.name}</td>
                                                <td>{formatCurrency(product.defaultPrice)}đ</td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        value={productPrices.get(product.id) || ''}
                                                        onChange={(e) => updateProductPrice(product.id, parseFloat(e.target.value) || 0)}
                                                        placeholder="Nhập giá"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div className="empty-state">
                            <p>Chọn một bảng giá để xem và chỉnh sửa giá sản phẩm</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Tạo bảng giá mới</h3>
                            <button onClick={() => setShowAddModal(false)}><MdClose /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Tên bảng giá *</label>
                                <input
                                    type="text"
                                    value={editingPriceList?.name || ''}
                                    onChange={(e) => setEditingPriceList({ ...editingPriceList, name: e.target.value })}
                                    placeholder="VD: Giá bán lẻ"
                                />
                            </div>
                            <div className="form-group">
                                <label>Mã bảng giá *</label>
                                <input
                                    type="text"
                                    value={editingPriceList?.code || ''}
                                    onChange={(e) => setEditingPriceList({ ...editingPriceList, code: e.target.value.toUpperCase() })}
                                    placeholder="VD: RETAIL"
                                />
                            </div>
                            <div className="form-group">
                                <label>Mô tả</label>
                                <textarea
                                    value={editingPriceList?.description || ''}
                                    onChange={(e) => setEditingPriceList({ ...editingPriceList, description: e.target.value })}
                                    placeholder="Mô tả bảng giá"
                                />
                            </div>
                            <div className="form-group checkbox">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={editingPriceList?.isDefault || false}
                                        onChange={(e) => setEditingPriceList({ ...editingPriceList, isDefault: e.target.checked })}
                                    />
                                    Đặt làm bảng giá mặc định
                                </label>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowAddModal(false)}>Hủy</button>
                            <button className="btn-primary" onClick={handleCreatePriceList}>Tạo</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
