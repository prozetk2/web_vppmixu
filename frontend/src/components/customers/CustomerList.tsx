import { useState, useEffect, useRef } from 'react';
import { customersAPI } from '../../services/api';
import Modal from '../shared/Modal';
import { Toast, useToast } from '../shared/Toast';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import { MdPeople, MdHourglassEmpty, MdDownload, MdAttachMoney, MdDescription } from 'react-icons/md';
import './CustomerList.css';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface Customer {
    id: string;
    code?: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    taxNumber?: string;
}

interface DebtData {
    totalOrders: number;
    totalPaid: number;
    totalDebt: number;
    orderCount: number;
    orders: {
        id: string;
        orderNumber: string;
        totalAmount: number;
        paidAmount: number;
        status: string;
        createdAt: string;
    }[];
}

interface FormData {
    code: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    taxNumber: string;
}

export default function CustomerList() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [debtData, setDebtData] = useState<DebtData | null>(null);
    const [formData, setFormData] = useState<FormData>({
        code: '',
        name: '',
        email: '',
        phone: '',
        address: '',
        taxNumber: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [importNote, setImportNote] = useState('');
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const toast = useToast();

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const response = await customersAPI.getAll();
            setCustomers((response.data?.data || response.data || []).map((c: any) => ({
                ...c,
                id: c.id.toString(),
            })));
        } catch (error) {
            console.error('Failed to fetch customers:', error);
            toast.error('Không thể tải danh sách khách hàng');
        } finally {
            setLoading(false);
        }
    };

    const openAddModal = () => {
        setEditingCustomer(null);
        setFormData({ code: '', name: '', email: '', phone: '', address: '', taxNumber: '' });
        setErrors({});
        setIsFormOpen(true);
    };

    const openEditModal = (customer: Customer) => {
        setEditingCustomer(customer);
        setFormData({
            code: customer.code || '',
            name: customer.name,
            email: customer.email || '',
            phone: customer.phone || '',
            address: customer.address || '',
            taxNumber: customer.taxNumber || '',
        });
        setErrors({});
        setIsFormOpen(true);
    };

    const closeFormModal = () => {
        setIsFormOpen(false);
        setEditingCustomer(null);
    };

    const openDetail = async (customer: Customer) => {
        setSelectedCustomer(customer);
        setDebtData(null);
        setIsDetailOpen(true);

        try {
            const response = await customersAPI.getDebts(customer.id);
            setDebtData(response.data);
        } catch (error) {
            console.error('Failed to fetch debts:', error);
        }
    };

    const closeDetail = () => {
        setIsDetailOpen(false);
        setSelectedCustomer(null);
        setDebtData(null);
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) newErrors.name = 'Tên khách hàng là bắt buộc';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setSubmitting(true);
        try {
            if (editingCustomer) {
                await customersAPI.update(editingCustomer.id, formData);
                toast.success('Cập nhật khách hàng thành công');
            } else {
                await customersAPI.create(formData);
                toast.success('Thêm khách hàng thành công');
            }
            closeFormModal();
            fetchCustomers();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (customer: Customer) => {
        if (!confirm(`Xóa khách hàng "${customer.name}"?`)) return;
        try {
            await customersAPI.delete(customer.id);
            toast.success('Xóa khách hàng thành công');
            fetchCustomers();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Không thể xóa khách hàng');
        }
    };

    const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN').format(value);
    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('vi-VN');

    // === IMPORT FUNCTIONALITY ===
    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        setImportNote('');

        try {
            let parsedCustomers: Partial<FormData>[] = [];

            if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                parsedCustomers = await parseExcel(file);
            } else if (file.name.endsWith('.pdf')) {
                parsedCustomers = await parsePDF(file);
            } else if (file.name.endsWith('.csv')) {
                parsedCustomers = await parseCSV(file);
            } else {
                throw new Error('Định dạng file không được hỗ trợ');
            }

            if (parsedCustomers.length === 0) {
                setImportNote('❌ Không tìm thấy dữ liệu khách hàng trong file');
                return;
            }

            // Bulk create customers
            let successCount = 0;
            let failCount = 0;

            for (const customer of parsedCustomers) {
                if (!customer.name) continue;
                try {
                    await customersAPI.create({
                        code: customer.code || '',
                        name: customer.name,
                        email: customer.email || '',
                        phone: customer.phone || '',
                        address: customer.address || '',
                        taxNumber: customer.taxNumber || '',
                    });
                    successCount++;
                } catch {
                    failCount++;
                }
            }

            setImportNote(`✅ Import thành công ${successCount} khách hàng${failCount > 0 ? ` (${failCount} lỗi)` : ''}`);
            toast.success(`Import thành công ${successCount} khách hàng`);
            fetchCustomers();
        } catch (error: any) {
            setImportNote(`❌ Lỗi: ${error.message}`);
            toast.error(error.message);
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const parseExcel = async (file: File): Promise<Partial<FormData>[]> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

                    // Find header row (look for 'tên' or 'name')
                    let headerIdx = 0;
                    for (let i = 0; i < Math.min(5, jsonData.length); i++) {
                        const row = jsonData[i]?.map((c) => String(c || '').toLowerCase()) || [];
                        if (row.some((c) => c.includes('tên') || c.includes('name') || c.includes('khách'))) {
                            headerIdx = i;
                            break;
                        }
                    }

                    const headers = jsonData[headerIdx]?.map((h) => String(h || '').toLowerCase()) || [];
                    const customers: Partial<FormData>[] = [];

                    for (let i = headerIdx + 1; i < jsonData.length; i++) {
                        const row = jsonData[i];
                        if (!row || row.every((c) => !c)) continue;

                        const customer: Partial<FormData> = {};
                        headers.forEach((h, idx) => {
                            const val = String(row[idx] || '').trim();
                            if (!val) return; // Skip empty values

                            // Mã khách hàng
                            if (h.includes('mã') && (h.includes('kh') || h.includes('khách')) || h.includes('code')) {
                                customer.code = val;
                            }
                            // Tên khách hàng - nhiều pattern
                            else if (
                                h.includes('tên kh') ||
                                h.includes('tên khách') ||
                                h.includes('họ tên') ||
                                h.includes('name') ||
                                (h.includes('tên') && !h.includes('công ty'))
                            ) {
                                customer.name = val;
                            }
                            // Email
                            else if (h.includes('email') || h.includes('e-mail')) {
                                customer.email = val;
                            }
                            // Điện thoại - nhiều pattern
                            else if (
                                h.includes('điện thoại') ||
                                h.includes('đt') ||
                                h.includes('phone') ||
                                h.includes('sđt') ||
                                h.includes('di động') ||
                                h.includes('mobile')
                            ) {
                                customer.phone = val;
                            }
                            // Địa chỉ
                            else if (h.includes('địa chỉ') || h.includes('address') || h.includes('dia chi')) {
                                customer.address = val;
                            }
                            // Mã số thuế
                            else if (
                                h.includes('mã số thuế') ||
                                h.includes('mst') ||
                                h.includes('thuế') ||
                                h.includes('tax')
                            ) {
                                customer.taxNumber = val;
                            }
                        });

                        if (customer.name) customers.push(customer);
                    }

                    resolve(customers);
                } catch (err) {
                    reject(new Error('Không thể đọc file Excel'));
                }
            };
            reader.onerror = () => reject(new Error('Lỗi đọc file'));
            reader.readAsArrayBuffer(file);
        });
    };

    const parseCSV = async (file: File): Promise<Partial<FormData>[]> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = e.target?.result as string;
                    const lines = text.split('\n').filter((l) => l.trim());
                    if (lines.length < 2) {
                        resolve([]);
                        return;
                    }

                    const headers = lines[0].split(',').map((h) => h.toLowerCase().trim());
                    const customers: Partial<FormData>[] = [];

                    for (let i = 1; i < lines.length; i++) {
                        const values = lines[i].split(',');
                        const customer: Partial<FormData> = {};

                        headers.forEach((h, idx) => {
                            const val = (values[idx] || '').trim().replace(/^"|"$/g, '');
                            if (h.includes('mã') || h.includes('code')) customer.code = val;
                            else if (h.includes('tên') || h.includes('name')) customer.name = val;
                            else if (h.includes('email')) customer.email = val;
                            else if (h.includes('phone') || h.includes('đt')) customer.phone = val;
                            else if (h.includes('địa') || h.includes('address')) customer.address = val;
                            else if (h.includes('mst') || h.includes('thuế')) customer.taxNumber = val;
                        });

                        if (customer.name) customers.push(customer);
                    }

                    resolve(customers);
                } catch {
                    reject(new Error('Không thể đọc file CSV'));
                }
            };
            reader.onerror = () => reject(new Error('Lỗi đọc file'));
            reader.readAsText(file);
        });
    };

    const parsePDF = async (file: File): Promise<Partial<FormData>[]> => {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
            }

            // Parse text - look for patterns
            const customers: Partial<FormData>[] = [];
            const lines = fullText.split('\n').filter((l) => l.trim());

            for (const line of lines) {
                // Try to extract customer info from each line
                const phoneMatch = line.match(/(0[0-9]{9,10})/g);
                const emailMatch = line.match(/[\w.-]+@[\w.-]+\.[a-z]{2,}/gi);

                // If line has phone or email, it might be a customer
                if (phoneMatch || emailMatch) {
                    customers.push({
                        name: line.replace(phoneMatch?.[0] || '', '').replace(emailMatch?.[0] || '', '').trim().slice(0, 100),
                        phone: phoneMatch?.[0] || '',
                        email: emailMatch?.[0] || '',
                    });
                }
            }

            return customers;
        } catch {
            throw new Error('Không thể đọc file PDF');
        }
    };

    return (
        <div className="customer-page">
            <Toast toasts={toast.toasts} onRemove={toast.removeToast} />

            <div className="customer-header">
                <h2><MdPeople /> Quản lý khách hàng</h2>
                <div className="header-actions">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept=".xlsx,.xls,.csv,.pdf"
                        style={{ display: 'none' }}
                    />
                    <button onClick={handleImportClick} className="btn-import" disabled={importing}>
                        {importing ? <><MdHourglassEmpty /> Đang import...</> : <><MdDownload /> Import</>}
                    </button>
                    <button onClick={openAddModal} className="btn-add">
                        ➕ Thêm KH
                    </button>
                </div>
            </div>

            {importNote && (
                <div className={`import-note ${importNote.startsWith('✅') ? 'success' : 'error'}`}>
                    {importNote}
                </div>
            )}

            <div className="customer-table-wrapper">
                {loading ? (
                    <div className="customer-loading">Đang tải...</div>
                ) : customers.length === 0 ? (
                    <div className="customer-empty">
                        <div className="customer-empty-icon"><MdPeople size={64} /></div>
                        <p>Chưa có khách hàng</p>
                    </div>
                ) : (
                    <table className="customer-table">
                        <thead>
                            <tr>
                                <th>Mã KH</th>
                                <th>Tên khách hàng</th>
                                <th>Điện thoại</th>
                                <th>Email</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map((c) => (
                                <tr key={c.id}>
                                    <td className="customer-code">{c.code || '—'}</td>
                                    <td>
                                        <span className="customer-name" onClick={() => openDetail(c)}>
                                            {c.name}
                                        </span>
                                    </td>
                                    <td className="customer-contact">{c.phone || '—'}</td>
                                    <td className="customer-contact">{c.email || '—'}</td>
                                    <td>
                                        <div className="actions-cell">
                                            <button onClick={() => openEditModal(c)} className="btn-edit">
                                                Sửa
                                            </button>
                                            <button onClick={() => handleDelete(c)} className="btn-delete">
                                                Xóa
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isFormOpen}
                onClose={closeFormModal}
                title={editingCustomer ? 'Sửa khách hàng' : 'Thêm khách hàng'}
                size="sm"
            >
                <form onSubmit={handleSubmit} className="customer-form">
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Mã KH</label>
                            <input
                                type="text"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                className="form-input"
                                placeholder="VD: KH001"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">
                                Tên khách hàng <span className="required">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className={`form-input ${errors.name ? 'error' : ''}`}
                                placeholder="Tên đầy đủ"
                                autoFocus
                            />
                            {errors.name && <span className="error-text">{errors.name}</span>}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Điện thoại</label>
                            <input
                                type="text"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="form-input"
                                placeholder="0xxx xxx xxx"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="form-input"
                                placeholder="email@example.com"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Địa chỉ</label>
                        <input
                            type="text"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            className="form-input"
                            placeholder="Địa chỉ đầy đủ"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Mã số thuế</label>
                        <input
                            type="text"
                            value={formData.taxNumber}
                            onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                            className="form-input"
                            placeholder="MST (nếu có)"
                        />
                    </div>

                    <div className="form-actions">
                        <button type="button" onClick={closeFormModal} className="btn btn-secondary">
                            Hủy
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={submitting}>
                            {submitting ? 'Đang xử lý...' : editingCustomer ? 'Cập nhật' : 'Thêm mới'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Detail Modal */}
            <Modal
                isOpen={isDetailOpen}
                onClose={closeDetail}
                title={`Chi tiết: ${selectedCustomer?.name || ''}`}
            >
                {selectedCustomer && (
                    <div className="customer-detail">
                        <div className="detail-info">
                            <div className="info-item">
                                <span className="info-label">Mã KH</span>
                                <span className="info-value">{selectedCustomer.code || '—'}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Điện thoại</span>
                                <span className="info-value">{selectedCustomer.phone || '—'}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Email</span>
                                <span className="info-value">{selectedCustomer.email || '—'}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Địa chỉ</span>
                                <span className="info-value">{selectedCustomer.address || '—'}</span>
                            </div>
                        </div>

                        <div className="debt-summary">
                            <h4><MdAttachMoney /> Công nợ</h4>
                            {debtData ? (
                                <div className="debt-stats">
                                    <div className="debt-stat">
                                        <div className="debt-stat-value">
                                            {formatCurrency(debtData.totalOrders)}đ
                                        </div>
                                        <div className="debt-stat-label">Tổng đơn hàng</div>
                                    </div>
                                    <div className="debt-stat">
                                        <div className="debt-stat-value">
                                            {formatCurrency(debtData.totalPaid)}đ
                                        </div>
                                        <div className="debt-stat-label">Đã thanh toán</div>
                                    </div>
                                    <div className="debt-stat">
                                        <div className={`debt-stat-value ${debtData.totalDebt > 0 ? 'positive' : 'zero'}`}>
                                            {formatCurrency(debtData.totalDebt)}đ
                                        </div>
                                        <div className="debt-stat-label">Còn nợ</div>
                                    </div>
                                </div>
                            ) : (
                                <p>Đang tải...</p>
                            )}
                        </div>

                        {debtData && debtData.orders.length > 0 && (
                            <div className="orders-section">
                                <h4><MdDescription /> Lịch sử đơn hàng ({debtData.orderCount})</h4>
                                <table className="orders-table">
                                    <thead>
                                        <tr>
                                            <th>Mã đơn</th>
                                            <th>Tổng tiền</th>
                                            <th>Đã TT</th>
                                            <th>Trạng thái</th>
                                            <th>Ngày</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {debtData.orders.slice(0, 10).map((order) => (
                                            <tr key={order.id}>
                                                <td>{order.orderNumber}</td>
                                                <td>{formatCurrency(order.totalAmount)}đ</td>
                                                <td>{formatCurrency(order.paidAmount)}đ</td>
                                                <td>
                                                    <span className={`order-status ${order.status}`}>
                                                        {order.status === 'COMPLETED' ? 'Hoàn thành' : order.status}
                                                    </span>
                                                </td>
                                                <td>{formatDate(order.createdAt)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="detail-actions">
                            <button onClick={closeDetail} className="btn btn-secondary">
                                Đóng
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
