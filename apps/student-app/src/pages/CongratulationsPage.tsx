import React, { useEffect, useState } from 'react';

declare global {
  interface Window {
    electronAPI?: {
      getVersion: () => Promise<string>;
      closeApp: () => Promise<void>;
      platform: string;
    };
  }
}

interface CongratulationsPageProps {
  onExit?: () => void;
}

export const CongratulationsPage: React.FC<CongratulationsPageProps> = ({ onExit }) => {
  const [countdown, setCountdown] = useState<number>(5);

  const handleExitApp = () => {
    if (onExit) {
      onExit();
      return;
    }
    if (window.electronAPI?.closeApp) {
      window.electronAPI.closeApp();
    } else {
      window.close();
    }
  };

  useEffect(() => {
    if (countdown <= 0) {
      handleExitApp();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.icon}>🎉</div>
        <h1 style={styles.title}>Chúc mừng bạn đã hoàn thành bài thi!</h1>
        <p style={styles.message}>
          Toàn bộ các câu trả lời của <strong>kỳ thi Vấn đáp Tiếng Anh ENTs</strong> đã được nộp thành công vào hệ thống OralAI và đang được AI chấm điểm.
        </p>

        <div style={styles.countdownBadge}>
          Ứng dụng sẽ tự động đóng sau{' '}
          <span style={styles.countdownNumber}>{countdown}</span> giây...
        </div>

        <button style={styles.exitButton} onClick={handleExitApp}>
          Thoát ngay
        </button>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f1f5f9',
    padding: '24px',
    boxSizing: 'border-box',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '48px 40px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    maxWidth: '520px',
    width: '100%',
    textAlign: 'center',
    boxSizing: 'border-box',
  },
  icon: {
    fontSize: '64px',
    marginBottom: '20px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 12px 0',
  },
  message: {
    fontSize: '15px',
    color: '#475569',
    lineHeight: '1.6',
    margin: '0 0 28px 0',
  },
  countdownBadge: {
    display: 'inline-block',
    backgroundColor: '#eff6ff',
    color: '#1e40af',
    border: '1px solid #bfdbfe',
    borderRadius: '9999px',
    padding: '8px 20px',
    fontSize: '15px',
    fontWeight: '500',
    marginBottom: '24px',
  },
  countdownNumber: {
    fontWeight: '700',
    color: '#2563eb',
    fontSize: '18px',
  },
  exitButton: {
    display: 'block',
    width: '100%',
    padding: '14px',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
};

export default CongratulationsPage;
