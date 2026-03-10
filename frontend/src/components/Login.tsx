import { useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { authAPI } from '../services/api';
import './Login.css';

interface LoginProps {
    onLoginSuccess: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await authAPI.login(username, password);
            const token = response.data?.data?.access_token || response.data?.access_token;
            if (!token) {
                throw new Error('Không lấy được token đăng nhập');
            }
            localStorage.setItem('token', token);
            onLoginSuccess();
        } catch (err: any) {
            const apiMessage =
                err.response?.data?.error?.message ||
                err.response?.data?.message ||
                err.message;
            setError(apiMessage || 'Tên đăng nhập hoặc mật khẩu không đúng');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            {/* Animated background particles */}
            <div className="login-bg-effects">
                <div className="bg-orb bg-orb-1"></div>
                <div className="bg-orb bg-orb-2"></div>
                <div className="bg-orb bg-orb-3"></div>
                <div className="bg-grid"></div>
            </div>

            <div className="login-container">
                {/* Left Panel - Branding */}
                <div className="login-branding">
                    <div className="branding-content">
                        <div className="vai-logo">
                            <img src="/mixu_logo.png" alt="MIXU Office Supplies" className="mixu-logo-img" />
                        </div>
                        <div className="branding-tagline">
                            <h2>Hệ thống quản lý</h2>
                            <h3>Bán hàng & Kho hàng</h3>
                            <p className="branding-desc">
                                Giải pháp quản lý toàn diện cho doanh nghiệp
                            </p>
                        </div>
                        <div className="branding-footer">
                            <div className="branding-stats">
                                <div className="stat-item">
                                    <span className="stat-value">24/7</span>
                                    <span className="stat-label">Hoạt động</span>
                                </div>
                                <div className="stat-divider"></div>
                                <div className="stat-item">
                                    <span className="stat-value">100%</span>
                                    <span className="stat-label">Bảo mật</span>
                                </div>
                                <div className="stat-divider"></div>
                                <div className="stat-item">
                                    <span className="stat-value">∞</span>
                                    <span className="stat-label">Tiềm năng</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel - Login Form */}
                <div className="login-form-panel">
                    <div className="login-form-wrapper">
                        <div className="login-header">
                            <div className="login-welcome">
                                <span className="welcome-dot"></span>
                                <span>Chào mừng trở lại</span>
                            </div>
                            <h1 className="login-title">Đăng nhập</h1>
                            <p className="login-subtitle">Nhập thông tin để truy cập hệ thống</p>
                        </div>

                        <form onSubmit={handleSubmit} className="login-form">
                            <div className="form-group">
                                <label htmlFor="username" className="form-label">
                                    Tên đăng nhập
                                </label>
                                <div className="input-wrapper">
                                    <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                        <circle cx="12" cy="7" r="4" />
                                    </svg>
                                    <input
                                        id="username"
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="form-input"
                                        placeholder="Nhập tên đăng nhập"
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="password" className="form-label">
                                    Mật khẩu
                                </label>
                                <div className="input-wrapper">
                                    <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="form-input"
                                        placeholder="Nhập mật khẩu"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="toggle-password-btn"
                                        onClick={() => setShowPassword(!showPassword)}
                                        tabIndex={-1}
                                        title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                                    >
                                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="error-message">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="error-icon">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="15" y1="9" x2="9" y2="15" />
                                        <line x1="9" y1="9" x2="15" y2="15" />
                                    </svg>
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="login-btn"
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner"></span>
                                        Đang đăng nhập...
                                    </>
                                ) : (
                                    <>
                                        Đăng nhập
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="btn-arrow">
                                            <line x1="5" y1="12" x2="19" y2="12" />
                                            <polyline points="12 5 19 12 12 19" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="login-footer">
                            <p>Powered by <strong>VAI-Studio</strong></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
