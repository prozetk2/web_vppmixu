import { useState, useEffect } from 'react';
import { settingsAPI } from '../../services/api';
import {
    MdBusiness,
    MdReceipt,
    MdInventory,
    MdSave,
} from 'react-icons/md';
import './SettingsPage.css';

interface Settings {
    companyName: string;
    companyAddress: string;
    companyPhone: string;
    companyEmail: string;
    taxNumber: string;
    taxRate: number;
    invoicePrefix: string;
    lowStockThreshold: number;
    autoPrintInvoice: boolean;
    currency: string;
    logo: string;
}

const DEFAULT_SETTINGS: Settings = {
    companyName: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    taxNumber: '',
    taxRate: 10,
    invoicePrefix: 'HD',
    lowStockThreshold: 10,
    autoPrintInvoice: false,
    currency: 'VND',
    logo: '',
};

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const response = await settingsAPI.get();
            setSettings({ ...DEFAULT_SETTINGS, ...response.data });
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field: keyof Settings, value: any) => {
        setSettings(prev => ({ ...prev, [field]: value }));
        setMessage(null);
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const response = await settingsAPI.update(settings);
            setSettings({ ...DEFAULT_SETTINGS, ...response.data });
            setMessage({ type: 'success', text: 'Đã lưu cài đặt thành công!' });
        } catch (error) {
            console.error('Failed to save settings:', error);
            setMessage({ type: 'error', text: 'Lỗi khi lưu cài đặt. Vui lòng thử lại.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="settings-page">
                <div className="settings-loading">
                    <div className="spinner"></div>
                    <p>Đang tải cài đặt...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="settings-page">
            <div className="settings-header">
                <h2>Cài đặt hệ thống</h2>
            </div>

            {message && (
                <div className={`settings-message ${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="settings-content">
                {/* Company Info */}
                <div className="settings-section">
                    <h3><MdBusiness /> Thông tin công ty</h3>
                    <div className="settings-form">
                        <div className="form-group">
                            <label>Tên công ty</label>
                            <input
                                type="text"
                                value={settings.companyName}
                                onChange={(e) => handleChange('companyName', e.target.value)}
                                placeholder="Nhập tên công ty"
                            />
                        </div>
                        <div className="form-group">
                            <label>Địa chỉ</label>
                            <textarea
                                value={settings.companyAddress}
                                onChange={(e) => handleChange('companyAddress', e.target.value)}
                                placeholder="Nhập địa chỉ công ty"
                            />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Số điện thoại</label>
                                <input
                                    type="text"
                                    value={settings.companyPhone}
                                    onChange={(e) => handleChange('companyPhone', e.target.value)}
                                    placeholder="0123 456 789"
                                />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    value={settings.companyEmail}
                                    onChange={(e) => handleChange('companyEmail', e.target.value)}
                                    placeholder="info@company.com"
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Mã số thuế</label>
                            <input
                                type="text"
                                value={settings.taxNumber}
                                onChange={(e) => handleChange('taxNumber', e.target.value)}
                                placeholder="Nhập MST"
                            />
                        </div>
                    </div>
                </div>

                {/* Invoice Settings */}
                <div className="settings-section">
                    <h3><MdReceipt /> Cài đặt hóa đơn</h3>
                    <div className="settings-form">
                        <div className="form-row">
                            <div className="form-group">
                                <label>Tiền tố hóa đơn</label>
                                <input
                                    type="text"
                                    value={settings.invoicePrefix}
                                    onChange={(e) => handleChange('invoicePrefix', e.target.value)}
                                    placeholder="HD"
                                />
                            </div>
                            <div className="form-group">
                                <label>Thuế VAT (%)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={settings.taxRate}
                                    onChange={(e) => handleChange('taxRate', Number(e.target.value))}
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Đơn vị tiền tệ</label>
                            <select
                                value={settings.currency}
                                onChange={(e) => handleChange('currency', e.target.value)}
                            >
                                <option value="VND">VND - Việt Nam Đồng</option>
                                <option value="USD">USD - US Dollar</option>
                            </select>
                        </div>
                        <div className="form-checkbox">
                            <input
                                type="checkbox"
                                id="autoPrint"
                                checked={settings.autoPrintInvoice}
                                onChange={(e) => handleChange('autoPrintInvoice', e.target.checked)}
                            />
                            <label htmlFor="autoPrint">Tự động in hóa đơn sau khi thanh toán</label>
                        </div>
                    </div>
                </div>

                {/* Inventory Settings */}
                <div className="settings-section">
                    <h3><MdInventory /> Cài đặt tồn kho</h3>
                    <div className="settings-form">
                        <div className="form-group">
                            <label>Ngưỡng cảnh báo tồn kho thấp</label>
                            <input
                                type="number"
                                min="0"
                                value={settings.lowStockThreshold}
                                onChange={(e) => handleChange('lowStockThreshold', Number(e.target.value))}
                            />
                            <small style={{ color: '#64748b', fontSize: '0.8rem' }}>
                                Sản phẩm có số lượng dưới ngưỡng này sẽ được cảnh báo
                            </small>
                        </div>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                    className="btn-save"
                    onClick={handleSave}
                    disabled={saving}
                >
                    <MdSave />
                    {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
                </button>
            </div>
        </div>
    );
}
