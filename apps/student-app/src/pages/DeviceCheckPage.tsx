import React from 'react';

interface DeviceCheckPageProps {
  sessionId: string;
  onPass: () => void;
  onBack: () => void;
}

export const DeviceCheckPage: React.FC<DeviceCheckPageProps> = ({
  sessionId: _sessionId,
  onPass,
  onBack,
}) => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '500px',
      }}>
        <h1 style={{
          textAlign: 'center',
          marginBottom: '24px',
          color: '#1e293b',
          fontSize: '24px',
          fontWeight: 'bold',
        }}>
          Kiểm tra thiết bị
        </h1>
        <p style={{
          textAlign: 'center',
          color: '#64748b',
          marginBottom: '32px',
        }}>
          Session ID: {_sessionId}
        </p>
        <div style={{
          display: 'flex',
          gap: '16px',
          justifyContent: 'center',
        }}>
          <button
            onClick={onBack}
            style={{
              padding: '12px 24px',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500',
            }}
          >
            Quay lại
          </button>
          <button
            onClick={onPass}
            style={{
              padding: '12px 24px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500',
            }}
          >
            Bắt đầu thi
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeviceCheckPage;
