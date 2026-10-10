import React from 'react';
import type { StudentExam, SessionStatus } from '@oralai/shared';

interface ExamCardProps {
  exam: StudentExam;
  onSelectExam: (exam: StudentExam) => void;
  isLoading?: boolean;
}

export function ExamCard({ exam, onSelectExam, isLoading }: ExamCardProps) {
  const isFinished = ['SUBMITTED', 'REVIEW_REQUIRED', 'COMPLETED'].includes(exam.status);
  const isInProgress = ['DEVICE_CHECK', 'IN_PROGRESS'].includes(exam.status);

  let label = 'Sẵn sàng thi';
  let badgeColor = '#2563eb';
  let actionText = 'Bắt đầu làm bài';
  let buttonColor = '#2563eb';

  if (isInProgress) {
    label = 'Đang làm dở';
    badgeColor = '#d97706';
    actionText = '▶ Tiếp tục làm bài';
    buttonColor = '#d97706';
  } else if (exam.status === 'UPLOADING') {
    label = 'Đang nộp bài';
    badgeColor = '#6366f1';
    actionText = 'Đang nộp bài...';
    buttonColor = '#6366f1';
  } else if (isFinished) {
    label = `Đã nộp (Lần ${exam.attempt_count || 1})`;
    badgeColor = '#059669';
    actionText = '🔄 Làm lại bài thi';
    buttonColor = '#059669';
  }

  const handleClick = () => {
    if (isLoading) return;
    onSelectExam(exam);
  };

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h3 style={styles.name}>{exam.name}</h3>
        <span style={{ ...styles.badge, background: badgeColor }}>
          {label}
        </span>
      </div>

      <div style={styles.details}>
        <p>Số câu hỏi: {exam.question_count}</p>
        <p>Thời gian: {Math.floor(exam.time_limit / 60)} phút</p>
        {exam.attempt_count > 0 && <p>Số lần đã thi: <strong>{exam.attempt_count}</strong></p>}
        {exam.practice && <span style={styles.practice}>Luyện tập</span>}
      </div>

      <button
        onClick={handleClick}
        disabled={isLoading || exam.status === 'UPLOADING'}
        style={{
          ...styles.button,
          background: buttonColor,
          opacity: isLoading ? 0.6 : 1,
          cursor: isLoading ? 'not-allowed' : 'pointer',
        }}
      >
        {isLoading ? 'Đang khởi tạo lượt thi...' : actionText}
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
