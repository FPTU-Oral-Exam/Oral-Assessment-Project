import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface AttemptResult {
  sequence: number;
  question: string | { text?: string; [key: string]: any };
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
  token?: string;
  onBack: () => void;
  onRetake?: () => void;
  onLogout: () => void;
}

export function ResultsPage({ sessionId, token, onBack, onRetake, onLogout }: ResultsPageProps) {
  const [result, setResult] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      api.setToken(token);
    }
    loadResult();
  }, [token, sessionId]);

  const loadResult = async () => {
    try {
      setLoading(true);
      const data = await api.getResult(sessionId);
      setResult(data as unknown as ResultData);
    } catch (err) {
      setError('Không thể tải kết quả bài thi');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Đang tải kết quả bài thi...</div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>{error || 'Không thể tải kết quả bài thi'}</div>
        <button onClick={onBack} style={styles.button}>
          Quay lại danh sách bài thi
        </button>
      </div>
    );
  }

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return '-';
    return new Date(timestamp * 1000).toLocaleString('vi-VN');
  };

  const getScoreDisplay = () => {
    if (result.score === null) return 'Chờ chấm';
    return `${result.score}/10`;
  };

  const getStatusLabel = () => {
    const statusMap: Record<string, string> = {
      IN_PROGRESS: 'Đang thi',
      SUBMITTED: 'Đã nộp bài',
      REVIEW_REQUIRED: 'Chờ chấm điểm',
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
              <h3 style={styles.feedbackTitle}>Ghi chú đánh giá</h3>
              <p>{result.grading_message}</p>
            </div>
          )}
        </div>

        <div style={styles.attempts}>
          <h3 style={styles.attemptsTitle}>Chi tiết câu hỏi</h3>
          {result.attempts.map((attempt) => {
            const questionText =
              typeof attempt.question === 'object' && attempt.question !== null
                ? (attempt.question as any).text || JSON.stringify(attempt.question)
                : String(attempt.question || '');

            const audioSrc = attempt.audio_url
              ? attempt.audio_url.startsWith('http')
                ? attempt.audio_url
                : `http://localhost:8000${attempt.audio_url}`
              : null;

            return (
              <div key={attempt.sequence} style={styles.attemptCard}>
                <div style={styles.attemptHeader}>
                  <span style={styles.attemptNumber}>Câu {attempt.sequence}</span>
                  {attempt.question_score !== null && (
                    <span style={styles.attemptScore}>{attempt.question_score}/10</span>
                  )}
                </div>
                <p style={styles.attemptQuestion}>{questionText}</p>

                {audioSrc && (
                  <div style={{ marginBottom: '12px', marginTop: '8px' }}>
                    <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px', fontWeight: 500 }}>
                      🎧 Nghe lại câu trả lời đã nộp:
                    </div>
                    <audio controls src={audioSrc} style={{ width: '100%', height: '40px' }} />
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
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          {onRetake && (
            <button
              onClick={onRetake}
              style={{
                flex: 1,
                padding: '1rem',
                background: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🔄 Làm lại bài thi mới
            </button>
          )}
          <button onClick={onBack} style={{ ...styles.backButton, flex: 1 }}>
            Quay lại danh sách bài thi
          </button>
        </div>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#f8fafc',
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
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    color: '#dc2626',
    gap: '16px',
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
    maxWidth: '800px',
    margin: '0 auto',
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
    padding: '2rem 1rem',
  },
  summary: {
    background: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  examName: {
    fontSize: '1.35rem',
    fontWeight: 700,
    marginBottom: '1rem',
    color: '#1e293b',
  },
  stats: {
    display: 'flex',
    gap: '2rem',
    marginBottom: '1rem',
    flexWrap: 'wrap',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
  },
  statLabel: {
    fontSize: '0.875rem',
    color: '#64748b',
    marginBottom: '0.25rem',
  },
  statValue: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#1e293b',
  },
  feedback: {
    background: '#f8fafc',
    padding: '1rem',
    borderRadius: '8px',
    marginTop: '1rem',
    borderLeft: '4px solid #2563eb',
  },
  feedbackTitle: {
    fontSize: '0.95rem',
    fontWeight: 600,
    marginBottom: '0.25rem',
    color: '#334155',
  },
  attempts: {
    marginBottom: '1.5rem',
  },
  attemptsTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    marginBottom: '1rem',
    color: '#1e293b',
  },
  attemptCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '1.25rem',
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
    color: '#2563eb',
  },
  attemptScore: {
    fontWeight: 600,
    color: '#16a34a',
  },
  attemptQuestion: {
    marginBottom: '0.75rem',
    lineHeight: 1.5,
    color: '#334155',
    fontWeight: 500,
  },
  attemptStatus: {
    display: 'flex',
    marginTop: '8px',
  },
  statusBadge: {
    padding: '0.25rem 0.6rem',
    borderRadius: '6px',
    color: 'white',
    fontSize: '0.75rem',
    fontWeight: 600,
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
    padding: '1rem',
    background: '#475569',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
};

export default ResultsPage;
