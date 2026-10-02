import React, { useEffect, useState, useCallback } from 'react';
import { RecordingControls, UploadProgress, QuestionNav } from '../components';
import { useRecording } from '../hooks/useRecording';
import { useChunkedUpload } from '../hooks/useChunkedUpload';
import { useExamSession } from '../hooks/useExamSession';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { QuestionAttempt, AttemptStatus } from '@oralai/shared';

interface ExamRoomPageProps {
  sessionId: string;
  onFinish: () => void;
}

export const ExamRoomPage: React.FC<ExamRoomPageProps> = ({ sessionId, onFinish }) => {
  const [currentQuestionText, setCurrentQuestionText] = useState<string>('');
  const [answeredQuestions, setAnsweredQuestions] = useState<number[]>([]);

  const {
    session,
    currentAttempt,
    isLoading,
    error,
    refreshSession,
    startAttempt,
    finishSession,
  } = useExamSession();

  // Get token from auth for upload requests
  const { token } = useAuth();

  const {
    isRecording,
    duration,
    startRecording,
    stopRecording,
    audioBlobs,
    clearBlobs,
  } = useRecording();

  const {
    isUploading,
    progress,
    error: uploadError,
    upload,
    reset: resetUpload,
  } = useChunkedUpload();

  // Load session on mount
  useEffect(() => {
    if (sessionId) {
      refreshSession(sessionId).catch(console.error);
    }
  }, [sessionId, refreshSession]);

  // Update answered questions when session changes
  useEffect(() => {
    if (session) {
      // In a real implementation, we'd track which questions have been answered
      // For now, we'll track locally when submissions happen
    }
  }, [session]);

  // Handle starting a new attempt
  const handleStartRecording = useCallback(async () => {
    if (!currentAttempt) {
      // Need to start an attempt first - we need an attempt key
      // In practice, the session should have current_attempt populated by refreshSession
      console.error('No current attempt available');
      return;
    }
    await startRecording();
  }, [currentAttempt, startRecording]);

  // Handle stopping and uploading
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

      // Get attempt key from current attempt
      const attemptKey = currentAttempt.id;

      if (attemptKey) {
        // Upload the file with token for authentication
        const uploadId = await upload(audioFile, attemptKey, 'AUDIO', 'audio/webm;codecs=opus', token || '');

        // Mark question as answered
        setAnsweredQuestions((prev) => {
          const seq = currentAttempt.sequence;
          return prev.includes(seq) ? prev : [...prev, seq];
        });

        // Submit audio for server-side STT processing
        await api.submitAudio(attemptKey, uploadId, 'AUDIO');

        // Clear blobs and reset upload state
        clearBlobs();
        resetUpload();
      }
    } catch (err) {
      console.error('Failed to process recording:', err);
    }
  }, [currentAttempt, stopRecording, upload, clearBlobs, resetUpload]);

  // Handle question navigation
  const handleSelectQuestion = useCallback(
    async (sequence: number) => {
      // TODO: Implement question navigation - need backend endpoint for this
      console.log('Question navigation not implemented, selected:', sequence);
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
        <div style={styles.loadingText}>Loading exam...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorText}>Error: {error}</div>
        <button style={styles.retryButton} onClick={() => refreshSession(sessionId)}>
          Retry
        </button>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorText}>No session found</div>
      </div>
    );
  }

  const currentSequence = session.current_attempt?.sequence || 1;

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.examName}>{session.exam_name}</h1>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.progress}>
            Question {session.answered_count + 1} of {session.question_count}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Question Area */}
        <div style={styles.questionArea}>
          <div style={styles.questionCard}>
            <h2 style={styles.questionTitle}>
              Question {currentSequence}
            </h2>
            <p style={styles.questionText}>
              {session.current_attempt?.text || 'Question text would be displayed here...'}
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
          <QuestionNav
            totalQuestions={session.question_count}
            currentQuestion={currentSequence}
            answeredQuestions={answeredQuestions}
            onSelectQuestion={handleSelectQuestion}
          />

          <button style={styles.finishButton} onClick={handleFinish}>
            Finish Exam
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
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
  },
  loadingText: {
    fontSize: '18px',
    color: '#6b7280',
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
    borderBottom: '1px solid #e5e7eb',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
  },
  examName: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#111827',
    margin: 0,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
  },
  progress: {
    fontSize: '14px',
    color: '#6b7280',
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
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  questionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 12px 0',
  },
  questionText: {
    fontSize: '16px',
    color: '#374151',
    lineHeight: 1.6,
    margin: 0,
  },
  recordingArea: {
    display: 'flex',
    justifyContent: 'center',
    padding: '20px 0',
  },
  sidebar: {
    width: '280px',
    padding: '24px',
    backgroundColor: 'white',
    borderLeft: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  finishButton: {
    padding: '14px 24px',
    backgroundColor: '#059669',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: 'auto',
    transition: 'background-color 0.2s',
  },
};

export default ExamRoomPage;
