import React, { useEffect, useState, useCallback } from 'react';
import { RecordingControls, UploadProgress, QuestionNav, CameraPreview } from '../components';
import { useRecording } from '../hooks/useRecording';
import { useChunkedUpload } from '../hooks/useChunkedUpload';
import { useExamSession } from '../hooks/useExamSession';
import { useMediaDevices } from '../hooks/useMediaDevices';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';

interface ExamRoomPageProps {
  sessionId: string;
  onFinish: () => void;
}

export const ExamRoomPage: React.FC<ExamRoomPageProps> = ({ sessionId, onFinish }) => {
  const [answeredQuestions, setAnsweredQuestions] = useState<number[]>([]);

  const {
    session,
    currentAttempt,
    isLoading,
    error,
    initSession,
    refreshSession,
    finishSession,
  } = useExamSession();

  // Media stream for live student proctoring camera
  const { stream, requestPermissions } = useMediaDevices();

  // Get token from auth for upload requests
  const { token } = useAuth();

  const {
    isRecording,
    duration,
    startRecording,
    stopRecording,
    clearBlobs,
  } = useRecording();

  const {
    isUploading,
    progress,
    error: uploadError,
    upload,
    reset: resetUpload,
  } = useChunkedUpload();

  // Initialize camera preview on mount
  useEffect(() => {
    requestPermissions().catch(console.error);
  }, [requestPermissions]);

  // Transition session to IN_PROGRESS and load current attempt on mount
  useEffect(() => {
    if (sessionId) {
      initSession(sessionId).catch(console.error);
    }
  }, [sessionId, initSession]);

  // Handle starting a new attempt recording
  const handleStartRecording = useCallback(async () => {
    if (!currentAttempt) {
      console.error('No current attempt available');
      return;
    }

    if (currentAttempt.status === 'READY') {
      try {
        await api.startAttempt(currentAttempt.id);
      } catch (err) {
        console.warn('startAttempt notice:', err);
      }
    }

    await startRecording();
  }, [currentAttempt, startRecording]);

  // Handle stopping recording and uploading audio
  const handleStopRecording = useCallback(async () => {
    if (!currentAttempt) {
      console.error('No current attempt to submit');
      return;
    }

    try {
      const blobs = await stopRecording();

      if (blobs.length === 0) {
        console.error('No audio recorded');
        return;
      }

      // Create a file from the blobs
      const audioBlob = new Blob(blobs, { type: 'audio/webm;codecs=opus' });
      const audioFile = new File([audioBlob], 'recording.webm', {
        type: 'audio/webm;codecs=opus',
      });

      const attemptKey = currentAttempt.id;

      if (attemptKey) {
        // Upload the file with token for authentication
        const uploadId = await upload(audioFile, attemptKey, 'AUDIO', 'audio/webm;codecs=opus', token || '');

        // Mark question as answered
        setAnsweredQuestions((prev) => {
          const seq = currentAttempt.sequence;
          return prev.includes(seq) ? prev : [...prev, seq];
        });

        // Submit audio for server-side STT processing (Whisper Large-v3)
        await api.submitAudio(attemptKey, uploadId, 'AUDIO');

        // Clear blobs and reset upload state
        clearBlobs();
        resetUpload();

        // Refresh session to transition to the next question
        await refreshSession(sessionId);
      }
    } catch (err) {
      console.error('Failed to process recording:', err);
    }
  }, [currentAttempt, stopRecording, upload, clearBlobs, resetUpload, refreshSession, sessionId, token]);

  // Handle question navigation
  const handleSelectQuestion = useCallback(
    async (sequence: number) => {
      console.log('Selected question sequence:', sequence);
    },
    []
  );

  // Handle finishing the session
  const handleFinish = useCallback(async () => {
    try {
      await finishSession(sessionId);
      onFinish();
    } catch (err) {
      console.error('Failed to finish session:', err);
    }
  }, [sessionId, finishSession, onFinish]);

  // Loading state
  if (isLoading && !session) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingText}>Đang tải câu hỏi bài thi...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorText}>Lỗi: {error}</div>
        <button style={styles.retryButton} onClick={() => initSession(sessionId)}>
          Thử lại
        </button>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorText}>Không tìm thấy phiên làm bài</div>
      </div>
    );
  }

  const currentSequence = currentAttempt?.sequence || session.current_attempt?.sequence || 1;
  const questionText = currentAttempt?.text || session.current_attempt?.text || 'Đang tải nội dung câu hỏi...';

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.examName}>{session.exam_name}</h1>
          {session.practice && <span style={styles.practiceTag}>Luyện tập</span>}
        </div>
        <div style={styles.headerRight}>
          <span style={styles.progress}>
            Câu {currentSequence} / {session.question_count}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Question Area */}
        <div style={styles.questionArea}>
          <div style={styles.questionCard}>
            <div style={styles.questionCardHeader}>
              <h2 style={styles.questionTitle}>
                Câu hỏi {currentSequence}
              </h2>
            </div>
            <p style={styles.questionText}>
              {questionText}
            </p>
          </div>

          {/* Recording Controls */}
          <div style={styles.recordingArea}>
            <RecordingControls
              isRecording={isRecording}
              duration={duration}
              disabled={isUploading}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
            />
          </div>

          {/* Upload Progress */}
          <UploadProgress
            progress={progress}
            error={uploadError}
            isUploading={isUploading}
          />
        </div>

        {/* Sidebar */}
        <aside style={styles.sidebar}>
          {/* Student Proctoring Camera Feed */}
          <div style={styles.cameraBox}>
            <div style={styles.cameraHeader}>
              <span style={styles.cameraLabel}>📹 Camera giám sát</span>
              <span style={isRecording ? styles.recActive : styles.recPreview}>
                {isRecording ? '● ĐANG GHI' : 'Xem trước'}
              </span>
            </div>
            <div style={styles.cameraFrame}>
              <CameraPreview stream={stream} />
            </div>
          </div>

          <QuestionNav
            totalQuestions={session.question_count}
            currentQuestion={currentSequence}
            answeredQuestions={answeredQuestions}
            onSelectQuestion={handleSelectQuestion}
          />

          <button style={styles.finishButton} onClick={handleFinish}>
            Hoàn thành bài thi
          </button>
        </aside>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
  },
  loadingText: {
    fontSize: '18px',
    color: '#64748b',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    gap: '16px',
  },
  errorText: {
    fontSize: '16px',
    color: '#dc2626',
  },
  retryButton: {
    padding: '8px 16px',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    backgroundColor: 'white',
    borderBottom: '1px solid #e2e8f0',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  examName: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#0f172a',
    margin: 0,
  },
  practiceTag: {
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
  },
  progress: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#475569',
  },
  mainContent: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  questionArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    padding: '24px',
    overflowY: 'auto',
  },
  questionCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    border: '1px solid #e2e8f0',
  },
  questionCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  questionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#0f172a',
    margin: 0,
  },
  questionText: {
    fontSize: '17px',
    color: '#1e293b',
    lineHeight: 1.7,
    margin: 0,
  },
  recordingArea: {
    display: 'flex',
    justifyContent: 'center',
    padding: '20px 0',
  },
  sidebar: {
    width: '300px',
    padding: '20px',
    backgroundColor: 'white',
    borderLeft: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    overflowY: 'auto',
  },
  cameraBox: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    overflow: 'hidden',
  },
  cameraHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#f1f5f9',
    borderBottom: '1px solid #e2e8f0',
  },
  cameraLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#334155',
  },
  recActive: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#ef4444',
    padding: '2px 6px',
    borderRadius: '4px',
    backgroundColor: '#fee2e2',
  },
  recPreview: {
    fontSize: '11px',
    fontWeight: 500,
    color: '#64748b',
    padding: '2px 6px',
    borderRadius: '4px',
    backgroundColor: '#e2e8f0',
  },
  cameraFrame: {
    width: '100%',
    height: '160px',
    backgroundColor: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  finishButton: {
    padding: '12px 20px',
    backgroundColor: '#059669',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: 'auto',
    transition: 'background-color 0.2s',
  },
};

export default ExamRoomPage;
