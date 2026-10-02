import React from 'react';
import type { StudentExam, SessionStatus } from '@oralai/shared';

interface ExamCardProps {
  exam: StudentExam;
  onStart: (sessionId: string) => void;
  onContinue: (sessionId: string) => void;
}

export function ExamCard({ exam, onStart, onContinue }: ExamCardProps) {
  const statusConfig: Record<SessionStatus, { label: string; color: string; action: string }> = {
    DEVICE_CHECK: { label: 'Kiểm tra thiết bị', color: '#ca8a04', action: 'Bắt đầu' },
    IN_PROGRESS: { label: 'Đang thi', color: '#ca8a04', action: 'Tiếp tục' },
    UPLOADING: { label: 'Đang tải lên', color: '#ca8a04', action: 'Chờ' },
    SUBMITTED: { label: 'Đã nộp', color: '#2563eb', action: 'Xem' },
    REVIEW_REQUIRED: { label: 'Cần xem lại', color: '#dc2626', action: 'Xem' },
    COMPLETED: { label: 'Hoàn thành', color: '#16a34a', action: 'Xem kết quả' },
  };

  const config = statusConfig[exam.status] || { label: 'Không xác định', color: '#64748b', action: 'Xem' };

  const handleClick = () => {
    if (exam.status === 'DEVICE_CHECK' || exam.status === 'COMPLETED') {
      onStart(exam.session_id || '');
    } else if (exam.session_id) {
      onContinue(exam.session_id);
    }
  };

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h3 style={styles.name}>{exam.name}</h3>
        <span style={{ ...styles.badge, background: config.color }}>
          {config.label}
        </span>
      </div>

      <div style={styles.details}>
        <p>Số câu hỏi: {exam.question_count}</p>
        <p>Thời gian: {Math.floor(exam.time_limit / 60)} phút</p>
        {exam.practice && <span style={styles.practice}>Luyện tập</span>}
      </div>

      <button onClick={handleClick} style={styles.button}>
        {config.action}
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '1rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  name: {
    fontSize: '1rem',
    fontWeight: 600,
  },
  badge: {
    color: 'white',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
  },
  details: {
    color: '#64748b',
    fontSize: '0.875rem',
    marginBottom: '1rem',
  },
  practice: {
    background: '#f0f9ff',
    color: '#0369a1',
    padding: '0.125rem 0.375rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    marginLeft: '0.5rem',
  },
  button: {
    width: '100%',
    padding: '0.5rem',
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontWeight: 500,
  },
};

export default ExamCard;
