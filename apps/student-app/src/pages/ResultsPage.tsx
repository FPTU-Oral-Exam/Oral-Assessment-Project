import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface AttemptResult {
  sequence: number;
  question: string;
  transcript?: string;
  status: string;
  question_score: number | null;
  audio_url?: string;
}

interface ResultData {
  session_id: string;
  exam_name: string;
  status: string;
  score: number | null;
  completed_at: number | null;
  grading_message?: string;
  attempts: AttemptResult[];
}

interface ResultsPageProps {
  sessionId: string;
  token: string;
  onBack: () => void;
  onLogout: () => void;
}

export function ResultsPage({ sessionId, token, onBack, onLogout }: ResultsPageProps) {
  const [result, setResult] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.setToken(token);
    loadResult();
  }, [token, sessionId]);

  const loadResult = async () => {
    try {
      setLoading(true);
      const data = await api.getResult(sessionId);
      setResult(data);
    } catch (err) {
      setError('Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Đang tải kết quả...</div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>{error || 'Failed to load results'}</div>
        <button onClick={onBack} style={styles.button}>
          Quay lại
        </button>
      </div>
    );
  }

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return '-';
    return new Date(timestamp * 1000).toLocaleString('vi-VN');
  };

  const getScoreDisplay = () => {
    if (result.score === null) return 'Chưa chấm';
    return `${result.score}/10`;
  };

  const getStatusLabel = () => {
    const statusMap: Record<string, string> = {
      IN_PROGRESS: 'Đang thi',
      SUBMITTED: 'Đã nộp',
      GRADING: 'Đang chấm',
      COMPLETED: 'Hoàn thành',
    };
    return statusMap[result.status] || result.status;
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>Kết quả bài thi</h1>
          <button onClick={onLogout} style={styles.logoutBtn}>
            Đăng xuất
          </button>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.summary}>
          <h2 style={styles.examName}>{result.exam_name}</h2>

          <div style={styles.stats}>
            <div style={styles.stat}>
              <span style={styles.statLabel}>Trạng thái</span>
              <span style={styles.statValue}>{getStatusLabel()}</span>
            </div>
            <div style={styles.stat}>
              <span style={styles.statLabel}>Điểm số</span>
              <span style={styles.statValue}>{getScoreDisplay()}</span>
            </div>
            <div style={styles.stat}>
              <span style={styles.statLabel}>Hoàn thành lúc</span>
              <span style={styles.statValue}>{formatDate(result.completed_at)}</span>
            </div>
          </div>

          {result.grading_message && (
            <div style={styles.feedback}>
              <h3 style={styles.feedbackTitle}>Phản hồi</h3>
              <p>{result.grading_message}</p>
            </div>
          )}
        </div>

        <div style={styles.attempts}>
          <h3 style={styles.attemptsTitle}>Chi tiết câu hỏi</h3>
          {result.attempts.map((attempt) => (
            <div key={attempt.sequence} style={styles.attemptCard}>
              <div style={styles.attemptHeader}>
                <span style={styles.attemptNumber}>Câu {attempt.sequence}</span>
                {attempt.question_score !== null && (
                  <span style={styles.attemptScore}>{attempt.question_score}/10</span>
                )}
              </div>
              <p style={styles.attemptQuestion}>{attempt.question}</p>
              {attempt.transcript && (
                <div style={styles.transcript}>
                  <strong>Transcript:</strong>
                  <p>{attempt.transcript}</p>
                </div>
              )}
              <div style={styles.attemptStatus}>
                <span
                  style={{
                    ...styles.statusBadge,
                    background: attempt.status === 'GRADED' ? '#16a34a' : '#ca8a04',
                  }}
                >
                  {attempt.status === 'GRADED' ? 'Đã chấm' : 'Chờ chấm'}
                </span>
              </div>
            </div>
          ))}
        </div>

        <button onClick={onBack} style={styles.backButton}>
          Quay lại danh sách bài thi
        </button>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#f5f5f5',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    fontSize: '1.125rem',
    color: '#64748b',
  },
  error: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    color: '#dc2626',
  },
  header: {
    background: '#2563eb',
    color: 'white',
    padding: '1rem 2rem',
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '1.25rem',
    margin: 0,
  },
  logoutBtn: {
    padding: '0.5rem 1rem',
    background: 'rgba(255,255,255,0.2)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  main: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '2rem',
  },
  summary: {
    background: 'white',
    borderRadius: '8px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  examName: {
    fontSize: '1.5rem',
    marginBottom: '1rem',
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1rem',
    marginBottom: '1rem',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  statLabel: {
    fontSize: '0.875rem',
    color: '#64748b',
  },
  statValue: {
    fontSize: '1.125rem',
    fontWeight: 600,
  },
  feedback: {
    padding: '1rem',
    background: '#f0f9ff',
    borderRadius: '6px',
    border: '1px solid #bae6fd',
  },
  feedbackTitle: {
    fontSize: '1rem',
    marginBottom: '0.5rem',
  },
  attempts: {
    marginBottom: '1.5rem',
  },
  attemptsTitle: {
    fontSize: '1.125rem',
    marginBottom: '1rem',
  },
  attemptCard: {
    background: 'white',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  attemptHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  attemptNumber: {
    fontWeight: 600,
  },
  attemptScore: {
    fontWeight: 600,
    color: '#16a34a',
  },
  attemptQuestion: {
    marginBottom: '0.75rem',
    lineHeight: 1.5,
  },
  transcript: {
    padding: '0.75rem',
    background: '#f8fafc',
    borderRadius: '6px',
    marginBottom: '0.75rem',
    fontSize: '0.875rem',
  },
  attemptStatus: {
    display: 'flex',
  },
  statusBadge: {
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    color: 'white',
    fontSize: '0.75rem',
    fontWeight: 500,
  },
  button: {
    padding: '0.75rem 1.5rem',
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  backButton: {
    width: '100%',
    padding: '1rem',
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
};

export default ResultsPage;
