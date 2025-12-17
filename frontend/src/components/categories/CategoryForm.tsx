import { useState, useEffect } from 'react';
import './CategoryForm.css';

interface Category {
    id?: string;
    name: string;
    code?: string;
    parentId?: string;
    description?: string;
}

interface CategoryFormProps {
    category?: Category | null;
    categories: Category[];
    onSubmit: (data: Category) => Promise<void>;
    onCancel: () => void;
    isLoading?: boolean;
}

export default function CategoryForm({
    category,
    categories,
    onSubmit,
    onCancel,
    isLoading = false,
}: CategoryFormProps) {
    const [formData, setFormData] = useState<Category>({
        name: '',
        code: '',
        parentId: '',
        description: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (category) {
            setFormData({
                id: category.id,
                name: category.name || '',
                code: category.code || '',
                parentId: category.parentId || '',
                description: category.description || '',
            });
        }
    }, [category]);

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Tên danh mục là bắt buộc';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        await onSubmit(formData);
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    // Filter out current category from parent options to prevent self-reference
    const parentOptions = categories.filter((cat) => cat.id !== category?.id);

    return (
        <form onSubmit={handleSubmit} className="category-form">
            <div className="form-group">
                <label htmlFor="name" className="form-label">
                    Tên danh mục <span className="required">*</span>
                </label>
                <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`form-input ${errors.name ? 'error' : ''}`}
                    placeholder="Nhập tên danh mục"
                    autoFocus
                />
                {errors.name && <span className="error-text">{errors.name}</span>}
            </div>

            <div className="form-group">
                <label htmlFor="code" className="form-label">
                    Mã danh mục
                </label>
                <input
                    type="text"
                    id="code"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Nhập mã danh mục (tùy chọn)"
                />
            </div>

            <div className="form-group">
                <label htmlFor="parentId" className="form-label">
                    Danh mục cha
                </label>
                <select
                    id="parentId"
                    name="parentId"
                    value={formData.parentId}
                    onChange={handleChange}
                    className="form-select"
                >
                    <option value="">-- Không có (danh mục gốc) --</option>
                    {parentOptions.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                            {cat.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="form-group">
                <label htmlFor="description" className="form-label">
                    Mô tả
                </label>
                <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="form-textarea"
                    placeholder="Nhập mô tả danh mục (tùy chọn)"
                    rows={3}
                />
            </div>

            <div className="form-actions">
                <button
                    type="button"
                    onClick={onCancel}
                    className="btn btn-secondary"
                    disabled={isLoading}
                >
                    Hủy
                </button>
                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <span className="spinner-small"></span>
                            Đang lưu...
                        </>
                    ) : category ? (
                        'Cập nhật'
                    ) : (
                        'Thêm mới'
                    )}
                </button>
            </div>
        </form>
    );
}
