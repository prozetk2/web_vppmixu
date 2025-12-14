import { useState } from 'react';
import './ImportModal.css';

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (file: File) => Promise<any>;
    moduleName: string;
}

export default function ImportModal({ isOpen, onClose, onImport, moduleName }: ImportModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null);
            setError('');
        }
    };

    const handleImport = async () => {
        if (!file) {
            setError('Vui lòng chọn file');
            return;
        }

        setLoading(true);
        setError('');
        setResult(null);

        try {
            const response = await onImport(file);
            setResult(response);
            if (response.success) {
                setTimeout(() => {
                    onClose();
                    setFile(null);
                    setResult(null);
                }, 2000);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Import thất bại');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Import {moduleName}</h2>
                    <button className="btn-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    <div className="file-upload">
                        <input
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleFileChange}
                            id="file-input"
                            className="file-input"
                        />
                        <label htmlFor="file-input" className="file-label">
                            {file ? file.name : 'Chọn file Excel'}
                        </label>
                    </div>

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    {result && (
                        <div className={`result-message ${result.success ? 'success' : 'error'}`}>
                            {result.success ? (
                                <>
                                    <p>✓ Import thành công!</p>
                                    <p>Đã import {result.imported}/{result.total} bản ghi</p>
                                    {result.errors && result.errors.length > 0 && (
                                        <div className="import-errors">
                                            <p>Lỗi:</p>
                                            <ul>
                                                {result.errors.slice(0, 5).map((err: string, i: number) => (
                                                    <li key={i}>{err}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <p>✗ Import thất bại</p>
                                    {result.errors && (
                                        <ul>
                                            {result.errors.slice(0, 5).map((err: string, i: number) => (
                                                <li key={i}>{err}</li>
                                            ))}
                                        </ul>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onClose} disabled={loading}>
                        Hủy
                    </button>
                    <button className="btn-primary" onClick={handleImport} disabled={!file || loading}>
                        {loading ? 'Đang import...' : 'Import'}
                    </button>
                </div>
            </div>
        </div>
    );
}
