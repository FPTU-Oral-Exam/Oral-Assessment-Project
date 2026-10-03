import React from 'react';
import type { StudentExam, SessionStatus } from '@oralai/shared';

interface ExamCardProps {
  exam: StudentExam;
  onSelectExam: (exam: StudentExam) => void;
  isLoading?: boolean;
}

export function ExamCard({ exam, onSelectExam, isLoading }: ExamCardProps) {
  const statusConfig: Record<SessionStatus, { label: string; color: string; action: string }> = {
    ASSIGNED: { label: 'Sẵn sàng thi', color: '#2563eb', action: 'Bắt đầu làm bài' },
    DEVICE_CHECK: { label: 'Kiểm tra thiết bị', color: '#ca8a04', action: 'Tiếp tục' },
    IN_PROGRESS: { label: 'Đang làm dở', color: '#eab308', action: 'Tiếp tục làm bài' },
    UPLOADING: { label: 'Đang nộp bài', color: '#6366f1', action: 'Đang nộp...' },
    SUBMITTED: { label: 'Đã nộp bài', color: '#059669', action: 'Xem lại' },
    REVIEW_REQUIRED: { label: 'Chờ chấm điểm', color: '#ea580c', action: 'Xem lại' },
    COMPLETED: { label: 'Hoàn thành', color: '#16a34a', action: 'Xem kết quả' },
  };

  const config = statusConfig[exam.status] || {
    label: exam.status || 'Chưa thi',
    color: '#2563eb',
    action: 'Bắt đầu làm bài',
  };

  const handleClick = () => {
    onSelectExam(exam);
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

      <button
        onClick={handleClick}
        disabled={isLoading}
        style={{
          ...styles.button,
          opacity: isLoading ? 0.6 : 1,
          cursor: isLoading ? 'not-allowed' : 'pointer',
        }}
      >
        {isLoading ? 'Đang khởi tạo...' : config.action}
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
