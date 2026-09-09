'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginCashier } from '@/app/actions/admin-actions'

export default function AdminLoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await loginCashier(formData.email, formData.password)

      if (result.error) {
        setError(result.error)
      } else if (result.success && result.cashier) {
        localStorage.setItem('cashier', JSON.stringify(result.cashier))
        router.push('/admin/dashboard')
      }
    } catch {
      setError('حدث خطأ غير متوقع، حاول مرة أخرى')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body { font-family: 'Tajawal', sans-serif; }

        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0a0e1a;
          position: relative;
          overflow: hidden;
          direction: rtl;
          font-family: 'Tajawal', sans-serif;
        }

        /* Animated ocean background */
        .bg-gradient {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at 20% 50%, rgba(0, 80, 160, 0.3) 0%, transparent 60%),
                      radial-gradient(ellipse at 80% 20%, rgba(0, 150, 180, 0.2) 0%, transparent 50%),
                      radial-gradient(ellipse at 50% 80%, rgba(5, 40, 80, 0.4) 0%, transparent 60%);
        }

        .bubbles {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }

        .bubble {
          position: absolute;
          bottom: -50px;
          border-radius: 50%;
          background: rgba(0, 160, 220, 0.08);
          border: 1px solid rgba(0, 160, 220, 0.15);
          animation: float-up linear infinite;
        }

        @keyframes float-up {
          0% { transform: translateY(0) scale(1); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 0.5; }
          100% { transform: translateY(-110vh) scale(0.8); opacity: 0; }
        }

        .bubble:nth-child(1)  { left: 10%; width: 30px; height: 30px; animation-duration: 12s; animation-delay: 0s; }
        .bubble:nth-child(2)  { left: 25%; width: 15px; height: 15px; animation-duration: 9s;  animation-delay: 2s; }
        .bubble:nth-child(3)  { left: 40%; width: 40px; height: 40px; animation-duration: 15s; animation-delay: 4s; }
        .bubble:nth-child(4)  { left: 60%; width: 20px; height: 20px; animation-duration: 11s; animation-delay: 1s; }
        .bubble:nth-child(5)  { left: 75%; width: 25px; height: 25px; animation-duration: 13s; animation-delay: 3s; }
        .bubble:nth-child(6)  { left: 88%; width: 18px; height: 18px; animation-duration: 10s; animation-delay: 6s; }
        .bubble:nth-child(7)  { left: 5%;  width: 35px; height: 35px; animation-duration: 14s; animation-delay: 5s; }
        .bubble:nth-child(8)  { left: 50%; width: 12px; height: 12px; animation-duration: 8s;  animation-delay: 7s; }

        /* Grid overlay */
        .grid-overlay {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(0, 160, 220, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 160, 220, 0.04) 1px, transparent 1px);
          background-size: 50px 50px;
        }

        /* Card */
        .login-card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 440px;
          margin: 1rem;
          background: rgba(10, 20, 40, 0.85);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(0, 160, 220, 0.2);
          border-radius: 24px;
          padding: 2.5rem;
          box-shadow:
            0 25px 80px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(255,255,255,0.03),
            inset 0 1px 0 rgba(255,255,255,0.05);
        }

        /* Logo area */
        .logo-area {
          text-align: center;
          margin-bottom: 2rem;
        }

        .logo-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 72px;
          height: 72px;
          border-radius: 20px;
          background: linear-gradient(135deg, #0070c0, #00b4d8);
          font-size: 2rem;
          margin-bottom: 1rem;
          box-shadow: 0 8px 32px rgba(0, 180, 216, 0.4);
          animation: pulse-glow 3s ease-in-out infinite;
        }

        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 8px 32px rgba(0, 180, 216, 0.4); }
          50% { box-shadow: 0 8px 48px rgba(0, 180, 216, 0.7); }
        }

        .logo-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.5px;
          margin-bottom: 0.25rem;
        }

        .logo-sub {
          font-size: 0.9rem;
          color: rgba(255,255,255,0.45);
          font-weight: 400;
        }

        /* Divider */
        .divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(0, 160, 220, 0.3), transparent);
          margin: 1.5rem 0;
        }

        /* Form */
        .form-group {
          margin-bottom: 1.25rem;
        }

        .form-label {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          color: rgba(255,255,255,0.6);
          margin-bottom: 0.5rem;
          letter-spacing: 0.3px;
        }

        .input-wrapper {
          position: relative;
        }

        .input-icon {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(0, 160, 220, 0.7);
          font-size: 1rem;
          pointer-events: none;
        }

        .form-input {
          width: 100%;
          padding: 0.875rem 2.75rem 0.875rem 1rem;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          color: #fff;
          font-size: 0.95rem;
          font-family: 'Tajawal', sans-serif;
          transition: all 0.25s ease;
          outline: none;
          direction: ltr;
          text-align: right;
        }

        .form-input::placeholder { color: rgba(255,255,255,0.2); }

        .form-input:focus {
          border-color: rgba(0, 160, 220, 0.6);
          background: rgba(0, 160, 220, 0.06);
          box-shadow: 0 0 0 3px rgba(0, 160, 220, 0.12);
        }

        .password-toggle {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: rgba(255,255,255,0.3);
          cursor: pointer;
          font-size: 0.9rem;
          transition: color 0.2s;
          padding: 4px;
        }

        .password-toggle:hover { color: rgba(255,255,255,0.7); }

        /* Error message */
        .error-box {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: rgba(220, 50, 50, 0.12);
          border: 1px solid rgba(220, 50, 50, 0.3);
          border-radius: 10px;
          color: #ff8080;
          font-size: 0.875rem;
          margin-bottom: 1.25rem;
          animation: shake 0.4s ease;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }

        /* Submit button */
        .submit-btn {
          width: 100%;
          padding: 0.9rem;
          border: none;
          border-radius: 12px;
          background: linear-gradient(135deg, #0070c0, #00b4d8);
          color: #fff;
          font-size: 1rem;
          font-weight: 700;
          font-family: 'Tajawal', sans-serif;
          cursor: pointer;
          transition: all 0.25s ease;
          position: relative;
          overflow: hidden;
          letter-spacing: 0.3px;
          margin-top: 0.5rem;
        }

        .submit-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, #00b4d8, #0070c0);
          opacity: 0;
          transition: opacity 0.25s;
        }

        .submit-btn:hover::before { opacity: 1; }
        .submit-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(0, 176, 216, 0.4); }
        .submit-btn:active { transform: translateY(0); }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        .submit-btn span { position: relative; z-index: 1; }

        /* Loading spinner */
        .spinner {
          display: inline-block;
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-left: 8px;
          vertical-align: middle;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        /* Demo credentials */
        .demo-box {
          margin-top: 1.5rem;
          padding: 1rem;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px;
        }

        .demo-title {
          font-size: 0.8rem;
          font-weight: 600;
          color: rgba(255,255,255,0.35);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 0.75rem;
          text-align: center;
        }

        .demo-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
        }

        .demo-item {
          padding: 0.5rem 0.75rem;
          background: rgba(0, 160, 220, 0.07);
          border: 1px solid rgba(0, 160, 220, 0.15);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
        }

        .demo-item:hover {
          background: rgba(0, 160, 220, 0.15);
          border-color: rgba(0, 160, 220, 0.35);
        }

        .demo-branch {
          font-size: 0.8rem;
          font-weight: 700;
          color: rgba(0, 200, 255, 0.9);
          display: block;
        }

        .demo-email {
          font-size: 0.7rem;
          color: rgba(255,255,255,0.3);
          display: block;
          margin-top: 2px;
          direction: ltr;
        }

        /* Footer */
        .card-footer {
          text-align: center;
          margin-top: 1.5rem;
          font-size: 0.8rem;
          color: rgba(255,255,255,0.2);
        }
      `}</style>

      <div className="login-page">
        <div className="bg-gradient" />
        <div className="grid-overlay" />
        <div className="bubbles">
          {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="bubble" />)}
        </div>

        <div className="login-card">
          {/* Logo */}
          <div className="logo-area flex flex-col items-center">
            <img src="/images/logo.png" alt="by Joka" className="mx-auto" style={{ height: '110px', width: 'auto', marginBottom: '10px' }} />
            <div className="logo-sub mt-2">لوحة تحكم الكاشير</div>
          </div>

          <div className="divider" />

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="error-box">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="admin-email">البريد الإلكتروني</label>
              <div className="input-wrapper">
                <span className="input-icon">✉️</span>
                <input
                  id="admin-email"
                  className="form-input"
                  type="email"
                  placeholder="example@admin.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="admin-password">كلمة المرور</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  id="admin-password"
                  className="form-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                  style={{ paddingLeft: '2.5rem' }}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              className="submit-btn"
              disabled={isLoading}
            >
              <span>
                {isLoading ? (
                  <>جاري التحقق...<span className="spinner" /></>
                ) : (
                  '🚀 تسجيل الدخول'
                )}
              </span>
            </button>
          </form>

          {/* Demo credentials */}
          {/* <div className="demo-box">
            <div className="demo-title">بيانات التجربة — كلمة المرور: password123</div>
            <div className="demo-grid">
              {[
                { branch: 'دسوق', email: 'desouk@admin.com' },
                { branch: 'الإسكندرية', email: 'alex@admin.com' },
                { branch: 'القاهرة', email: 'cairo@admin.com' },
                { branch: 'الجيزة', email: 'giza@admin.com' },
              ].map(item => (
                <div
                  key={item.email}
                  className="demo-item"
                  onClick={() => setFormData({ email: item.email, password: 'password123' })}
                >
                  <span className="demo-branch">{item.branch}</span>
                  <span className="demo-email">{item.email}</span>
                </div>
              ))}
            </div>
          </div> */}

          <div className="card-footer">
            by Joka © 2026 — نظام إدارة الطلبات
          </div>
        </div>
      </div>
    </>
  )
}
