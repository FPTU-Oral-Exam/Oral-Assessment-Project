import React, { useState, FormEvent } from 'react';
import { api } from '../lib/api';

interface LoginPageProps {
  onLogin: (token: string, user: import('@oralai/shared').User) => void;
}

interface DemoAccount {
  username: string;
  level: string;
  courseCode: string;
  badge: string;
  desc: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  { username: 'student_l1', level: 'Level 1', courseCode: 'ENT001', badge: 'A1', desc: 'Dự bị 1' },
  { username: 'student_l2', level: 'Level 2', courseCode: 'ENT104', badge: 'A2', desc: 'Cơ sở 2' },
  { username: 'student_l3', level: 'Level 3', courseCode: 'ENT203', badge: 'B1', desc: 'Giao tiếp 3' },
  { username: 'student_l4', level: 'Level 4', courseCode: 'ENT303', badge: 'B1+', desc: 'Học thuật 4' },
  { username: 'student_l5', level: 'Level 5', courseCode: 'ENT403', badge: 'B2', desc: 'Nâng cao 5' },
  { username: 'student_l6', level: 'Level 6', courseCode: 'ENT503', badge: 'B2+', desc: 'Biện luận 6' },
];

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [mssv, setMssv] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await api.login(mssv.trim(), password);
      if (response.user.role !== 'STUDENT') {
        setError(
          `Tài khoản "${response.user.username}" có vai trò là ${response.user.role} (Cán bộ/Giảng viên), không phải Sinh viên. Vui lòng mở cổng 3000 (Staff Portal) để sử dụng hoặc đăng nhập bằng tài khoản Sinh viên.`
        );
        return;
      }
      onLogin(response.token, response.user);
    } catch (err: any) {
      setError(err?.message || err?.error?.message || 'MSSV hoặc mật khẩu không chính xác');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDemo = (acc: DemoAccount) => {
    setMssv(acc.username);
    setPassword('Student@123456');
    setError('');
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f1f5f9',
      padding: '24px 16px',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      boxSizing: 'border-box',
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        padding: '36px 32px',
        borderRadius: '16px',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
        width: '100%',
        maxWidth: '460px',
        border: '1px solid #e2e8f0',
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            color: '#ffffff',
            fontSize: '28px',
            marginBottom: '16px',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
          }}>
            🎙️
          </div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#0f172a',
            margin: '0 0 6px 0',
          }}>
            OralAI Assessment
          </h1>
          <p style={{
            fontSize: '13px',
            color: '#64748b',
            margin: 0,
            fontWeight: 500,
          }}>
            Cổng Thi Đánh giá Nói Tiếng Anh ENTs (Level 1 - 6)
          </p>
        </div>

        {/* Demo Quick Select Pills */}
        <div style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '14px',
          marginBottom: '24px',
        }}>
          <div style={{
            fontSize: '12px',
            fontWeight: '600',
            color: '#475569',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span>⚡ Đăng nhập nhanh theo Level:</span>
            <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'none' }}>Click để điền</span>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
          }}>
            {DEMO_ACCOUNTS.map((acc) => {
              const isSelected = mssv === acc.username;
              return (
                <button
                  key={acc.username}
                  type="button"
                  onClick={() => handleSelectDemo(acc)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '8px 4px',
                    borderRadius: '8px',
                    border: isSelected ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                    backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: isSelected ? '#1d4ed8' : '#1e293b',
                  }}>
                    {acc.level}
                  </span>
                  <span style={{
                    fontSize: '11px',
                    color: isSelected ? '#2563eb' : '#64748b',
                    fontWeight: 500,
                  }}>
                    {acc.courseCode} ({acc.badge})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '18px' }}>
            <label htmlFor="mssv" style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '13px',
              fontWeight: '600',
              color: '#334155',
            }}>
              Mã số sinh viên (MSSV / Username)
            </label>
            <input
              id="mssv"
              type="text"
              value={mssv}
              onChange={(e) => setMssv(e.target.value)}
              required
              disabled={isLoading}
              placeholder="Nhập MSSV (VD: student_l1, student)"
              style={{
                width: '100%',
                padding: '11px 14px',
                border: '1.5px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
            />
          </div>

          <div style={{ marginBottom: '22px' }}>
            <label htmlFor="password" style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '13px',
              fontWeight: '600',
              color: '#334155',
            }}>
              Mật khẩu
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              placeholder="Nhập mật khẩu"
              style={{
                width: '100%',
                padding: '11px 14px',
                border: '1.5px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '12px 14px',
              marginBottom: '18px',
              backgroundColor: '#fef2f2',
              color: '#b91c1c',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              fontSize: '13px',
              lineHeight: 1.4,
            }}>
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !mssv.trim() || !password}
            style={{
              width: '100%',
              padding: '13px',
              backgroundColor: isLoading || !mssv.trim() || !password ? '#94a3b8' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: isLoading || !mssv.trim() || !password ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s ease, transform 0.1s ease',
              boxShadow: isLoading ? 'none' : '0 4px 10px rgba(37, 99, 235, 0.25)',
            }}
          >
            {isLoading ? 'Đang xác thực thông tin...' : 'Đăng nhập vào Hệ thống thi'}
          </button>
        </form>

        {/* Footer info */}
        <div style={{
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '1px solid #f1f5f9',
          textAlign: 'center',
          fontSize: '12px',
          color: '#94a3b8',
        }}>
          💡 Hệ thống tự động nhận diện Trình độ (Level), Ca thi và Phòng thi sau khi đăng nhập.
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
