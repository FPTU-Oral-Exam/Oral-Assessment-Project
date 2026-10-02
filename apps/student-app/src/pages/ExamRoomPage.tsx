import React, { useState, useEffect, useCallback } from 'react';
import { useExamSession } from '../hooks/useExamSession';
import { useRecording } from '../hooks/useRecording';
import { useChunkedUpload } from '../hooks/useChunkedUpload';
import { RecordingControls } from '../components/RecordingControls';
import { UploadProgress } from '../components/UploadProgress';
import { QuestionNav } from '../components/QuestionNav';

interface ExamRoomPageProps {
  sessionId: string;
  token: string;
  onFinish: () => void;
}

export function ExamRoomPage({ sessionId, token, onFinish }: ExamRoomPageProps) {
  const { session, currentAttempt, startAttempt, submitAttempt, finishSession, refreshSession } =
    useExamSession();
  const { isRecording, duration, startRecording, stopRecording } = useRecording();
  const { isUploading, progress, error: uploadError, upload } = useChunkedUpload();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(1);
  const [answeredQuestions, setAnsweredQuestions] = useState<number[]>([]);
  const [recordingDuration, setRecordingDuration] = useState(0);

  useEffect(() => {
    if (sessionId && token) {
      refreshSession(sessionId);
    }
  }, [sessionId, token, refreshSession]);

  const handleStartRecording = useCallback(async () => {
    if (!currentAttempt) {
      return;
    }
    await startRecording();
    setRecordingDuration(0);
    const interval = setInterval(() => {
      setRecordingDuration((d) => d + 1);
    }, 1000);
    (window as any).__recordingInterval = interval;
  }, [currentAttempt, startRecording]);

  const handleStopRecording = useCallback(async () => {
    const interval = (window as any).__recordingInterval;
    if (interval) {
      clearInterval(interval);
      delete (window as any).__recordingInterval;
    }

    if (!currentAttempt) {
      return;
    }

    const blobs = await stopRecording();
    if (blobs.length === 0) {
      return;
    }

    const audioBlob = new Blob(blobs, { type: 'audio/webm;codecs=opus' });
    const file = new File([audioBlob], 'recording.webm', { type: 'audio/webm;codecs=opus' });

    await upload(file, currentAttempt.id, 'AUDIO', 'audio/webm');

    await submitAttempt(currentAttempt.id, recordingDuration);

    if (!answeredQuestions.includes(currentQuestionIndex)) {
      setAnsweredQuestions((prev) => [...prev, currentQuestionIndex]);
    }
  }, [currentAttempt, stopRecording, upload, submitAttempt, recordingDuration, currentQuestionIndex, answeredQuestions]);

  const handleNextQuestion = useCallback(async () => {
    if (!session) return;
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex <= session.questions.length) {
      const attempt = await startAttempt(
        session.questions[nextIndex - 1].attempt_id
      );
      setCurrentQuestionIndex(nextIndex);
      setRecordingDuration(0);
    }
  }, [session, currentQuestionIndex, startAttempt]);

  const handleSelectQuestion = useCallback(async (sequence: number) => {
    if (!session) return;
    const attempt = await startAttempt(session.questions[sequence - 1].attempt_id);
    setCurrentQuestionIndex(sequence);
    setRecordingDuration(0);
  }, [session, startAttempt]);

  const handleFinish = useCallback(async () => {
    await finishSession(sessionId);
    onFinish();
  }, [finishSession, sessionId, onFinish]);

  if (!session) {
    return (
      <div style={styles.loading}>
        <p>Đang tải...</p>
      </div>
    );
  }

  const currentQuestion = session.questions[currentQuestionIndex - 1];

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.examName}>{session.exam_name}</h1>
          <p style={styles.progress}>
            Câu {currentQuestionIndex}/{session.questions.length}
          </p>
        </div>
      </header>

      <div style={styles.main}>
        <div style={styles.content}>
          <div style={styles.questionCard}>
            <h2 style={styles.questionLabel}>Câu hỏi {currentQuestionIndex}</h2>
            <p style={styles.questionText}>{currentQuestion?.question_text}</p>
          </div>

          <RecordingControls
            isRecording={isRecording}
            duration={recordingDuration}
            onStart={handleStartRecording}
            onStop={handleStopRecording}
            disabled={isUploading}
          />

          {isUploading && <UploadProgress progress={progress} error={uploadError} />}

          <div style={styles.navigation}>
            <button
              onClick={handleNextQuestion}
              disabled={currentQuestionIndex >= session.questions.length || isRecording}
              style={styles.nextBtn}
            >
              Câu tiếp theo
            </button>
          </div>
        </div>

        <aside style={styles.sidebar}>
          <QuestionNav
            totalQuestions={session.questions.length}
            currentQuestion={currentQuestionIndex}
            answeredQuestions={answeredQuestions}
            onSelectQuestion={handleSelectQuestion}
            onFinish={handleFinish}
          />
        </aside>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
  },
  header: {
    padding: '1rem 2rem',
    background: '#2563eb',
    color: 'white',
  },
  examName: {
    fontSize: '1.25rem',
    marginBottom: '0.25rem',
  },
  progress: {
    opacity: 0.9,
  },
  main: {
    display: 'flex',
    flex: 1,
    gap: '1rem',
    padding: '1rem',
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  sidebar: {
    width: '280px',
  },
  questionCard: {
    background: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  questionLabel: {
    fontSize: '0.875rem',
    color: '#64748b',
    marginBottom: '0.5rem',
  },
  questionText: {
    fontSize: '1.125rem',
    lineHeight: 1.6,
  },
  navigation: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  nextBtn: {
    padding: '0.75rem 1.5rem',
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 600,
    cursor: 'pointer',
  },
};

export default ExamRoomPage;
