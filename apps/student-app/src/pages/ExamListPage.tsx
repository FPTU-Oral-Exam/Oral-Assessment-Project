import React, { useState, useEffect } from 'react';
import type { StudentExam } from '@oralai/shared';
import { ExamCard } from '../components/ExamCard';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';

interface ExamListPageProps {
  onStartExam: (sessionId: string) => void;
  onLogout: () => void;
}

export function ExamListPage({ onStartExam, onLogout }: ExamListPageProps) {
  const { user, token } = useAuth();
  const [exams, setExams] = useState<StudentExam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchExams() {
      try {
        setIsLoading(true);
        const currentToken = token || api.getToken();
        if (!currentToken) {
          setError('No authentication token');
          return;
        }

        api.setToken(currentToken);
        const examList = await api.getAvailableExams();
        setExams(examList);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load exams');
      } finally {
        setIsLoading(false);
      }
    }

    fetchExams();
  }, [token]);

  const [startingExamId, setStartingExamId] = useState<string | null>(null);

  const handleSelectExam = async (exam: StudentExam) => {
    try {
      setStartingExamId(exam.id);
      let sessionId = exam.session_id;

      // If no session created yet, or newly assigned, create the exam session
      if (!sessionId || exam.status === 'ASSIGNED') {
        const session = await api.createSession(exam.id);
        sessionId = session.id;
      }

      if (sessionId) {
        onStartExam(sessionId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể khởi tạo bài thi');
    } finally {
      setStartingExamId(null);
    }
  };

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Đang tải danh sách kỳ thi...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>Lỗi: {error}</div>
        <button onClick={onLogout} style={styles.logoutButton}>
          Đăng xuất
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>Danh sách kỳ thi</h1>
          <div style={styles.userSection}>
            <span style={styles.userName}>
              {user?.name || user?.username || 'Người dùng'}
            </span>
            <button onClick={onLogout} style={styles.logoutButton}>
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        {exams.length === 0 ? (
          <div style={styles.emptyState}>
            <p>Hiện không có kỳ thi nào khả dụng.</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {exams.map((exam) => (
              <ExamCard
                key={exam.id}
                exam={exam}
                onSelectExam={handleSelectExam}
                isLoading={startingExamId === exam.id}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#f8fafc',
  },
  header: {
    background: 'white',
    borderBottom: '1px solid #e2e8f0',
    padding: '1rem 2rem',
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: '#1e293b',
    margin: 0,
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  userName: {
    color: '#64748b',
    fontSize: '0.875rem',
  },
  logoutButton: {
    padding: '0.5rem 1rem',
    background: '#f1f5f9',
    color: '#475569',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  main: {
    padding: '2rem',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '1.5rem',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    color: '#64748b',
  },
  error: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    color: '#dc2626',
    gap: '1rem',
  },
  emptyState: {
    textAlign: 'center',
    color: '#64748b',
    padding: '4rem 2rem',
  },
};

export default ExamListPage;
