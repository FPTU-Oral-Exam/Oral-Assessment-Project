import React, { useEffect, useState, useCallback, useRef } from 'react';
import { UploadProgress, QuestionNav, CameraPreview, SpeakingQuestionCard, PTEQuestionCard } from '../components';
import type { SpeakingPhase, PTEPhase } from '../components';
import { playPTEBeep } from '../lib/pte-audio';
import { useRecording, createCleanAudioBlob } from '../hooks/useRecording';
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
  const [recordedAudio, setRecordedAudio] = useState<{ blob: Blob; url: string } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // ENTs Speaking State Machine
  const [ptePhase, setPtePhase] = useState<PTEPhase>('PREPARING');
  const [prepRemaining, setPrepRemaining] = useState<number>(0);
  const [speakRemaining, setSpeakRemaining] = useState<number>(40);

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
  const { stream, requestPermissions, stopAllMedia } = useMediaDevices();

  // Get token from auth for upload requests
  const { token } = useAuth();

  // Recording hook bound to active microphone stream
  const {
    isRecording,
    duration,
    startRecording,
    stopRecording,
    clearBlobs,
  } = useRecording(stream);

  const {
    isUploading,
    progress,
    error: uploadError,
    upload,
    reset: resetUpload,
  } = useChunkedUpload();

  // Ensure camera & mic permissions on mount
  useEffect(() => {
    requestPermissions().catch(console.error);
  }, [requestPermissions]);

  // Transition session to IN_PROGRESS and load current attempt on mount
  useEffect(() => {
    if (sessionId) {
      initSession(sessionId).catch(console.error);
    }
  }, [sessionId, initSession]);

  // Cleanup preview audio URL on unmount & reload preview audio element when changed
  useEffect(() => {
    if (recordedAudio && audioPreviewRef.current) {
      audioPreviewRef.current.load();
    }
    return () => {
      if (recordedAudio) {
        URL.revokeObjectURL(recordedAudio.url);
      }
    };
  }, [recordedAudio]);

  // Format timer MM:SS
  const formatTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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

    setRecordedAudio((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev.url);
      }
      return null;
    });

    await startRecording();
  }, [currentAttempt, startRecording]);

  // Handle stopping recording - creates local preview for student to review
  const handleStopRecordingClick = useCallback(async () => {
    try {
      const blobs = await stopRecording();
      if (blobs.length === 0) return;

      const audioBlob = await createCleanAudioBlob(blobs);
      const url = URL.createObjectURL(audioBlob);
      setRecordedAudio({ blob: audioBlob, url });
    } catch (err) {
      console.error('Failed to stop recording:', err);
    }
  }, [stopRecording]);

  // Submit audio file directly (used for both manual submit and ENTs auto-submit)
  const submitAudioBlob = useCallback(async (blob: Blob) => {
    if (!currentAttempt) return;
    setSubmitError(null);

    try {
      const cleanBlob = await createCleanAudioBlob([blob]);
      const audioFile = new File([cleanBlob], 'recording.webm', {
        type: 'audio/webm',
      });
      const attemptKey = currentAttempt.id;

      // 1. Upload chunks to MinIO storage through API
      const uploadId = await upload(audioFile, attemptKey, 'AUDIO', 'audio/webm', token || '');

      // 2. Submit audio for server-side Whisper Large-v3 STT processing
      await api.submitAudio(attemptKey, uploadId, 'AUDIO');

      // 3. Mark sequence as answered
      setAnsweredQuestions((prev) => {
        const seq = currentAttempt.sequence;
        return prev.includes(seq) ? prev : [...prev, seq];
      });

      // 4. Clean up recording preview
      if (recordedAudio) {
        URL.revokeObjectURL(recordedAudio.url);
        setRecordedAudio(null);
      }
      clearBlobs();
      resetUpload();

      // 5. Fetch next question from server
      await refreshSession(sessionId);
    } catch (err) {
      console.error('Failed to submit recording:', err);
      setSubmitError(err instanceof Error ? err.message : 'Có lỗi khi nộp bài; vui lòng thử lại');
    }
  }, [currentAttempt, recordedAudio, upload, token, clearBlobs, resetUpload, refreshSession, sessionId]);

  // Handle submitting recorded answer and advancing to the next question
  const handleSubmitAndNext = useCallback(async () => {
    if (!recordedAudio) return;
    await submitAudioBlob(recordedAudio.blob);
  }, [recordedAudio, submitAudioBlob]);

  // Handle re-recording
  const handleRerecord = useCallback(() => {
    setSubmitError(null);
    if (recordedAudio) {
      URL.revokeObjectURL(recordedAudio.url);
      setRecordedAudio(null);
    }
    clearBlobs();
    resetUpload();
  }, [recordedAudio, clearBlobs, resetUpload]);

  // Handle finishing the session
  const handleFinish = useCallback(async () => {
    try {
      await finishSession(sessionId);
      stopAllMedia();
      onFinish();
    } catch (err) {
      console.error('Failed to finish session:', err);
    }
  }, [sessionId, finishSession, stopAllMedia, onFinish]);

  // Auto finish when all questions answered
  useEffect(() => {
    if (session && !isLoading && !currentAttempt && !session.current_attempt && session.question_count > 0) {
      void handleFinish();
    }
  }, [session, isLoading, currentAttempt, handleFinish]);

  const isPTE = Boolean(
    currentAttempt?.type && currentAttempt.type !== 'OPEN_RESPONSE'
  );

  // Start recording with Beep sound for ENTs
  const triggerStartPTERecording = useCallback(async (speakTime: number) => {
    setPtePhase('RECORDING');
    setSpeakRemaining(speakTime);
    try {
      await playPTEBeep();
    } catch (e) {
      console.warn('Beep audio error:', e);
    }
    await handleStartRecording();
  }, [handleStartRecording]);

  // Track last question attempt ID that was initialized
  const lastInitializedAttemptIdRef = useRef<string | null>(null);

  // When question changes, reset timers and initiate ENTs phase
  useEffect(() => {
    if (!currentAttempt) return;
    const isPte = Boolean(
      currentAttempt.type && currentAttempt.type !== 'OPEN_RESPONSE'
    );
    if (!isPte) return;

    // Guard: Only initialize ONCE per question attempt!
    if (lastInitializedAttemptIdRef.current === currentAttempt.id) {
      return;
    }
    lastInitializedAttemptIdRef.current = currentAttempt.id;

    const prep = 10; // Cố định 10 giây đọc đề chuẩn bị theo yêu cầu
    const speak = currentAttempt.speak_time ?? 40;
    setPrepRemaining(prep);
    setSpeakRemaining(speak);

    if (currentAttempt.prompt_audio) {
      setPtePhase('AUDIO_PLAYING');
    } else {
      setPtePhase('PREPARING');
    }
  }, [currentAttempt?.id, isPTE, triggerStartPTERecording]);

  // Handle Prep countdown
  useEffect(() => {
    if (!isPTE || ptePhase !== 'PREPARING') return;

    if (prepRemaining <= 0) {
      const speak = currentAttempt?.speak_time ?? 40;
      void triggerStartPTERecording(speak);
      return;
    }

    const timer = setInterval(() => {
      setPrepRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          const speak = currentAttempt?.speak_time ?? 40;
          void triggerStartPTERecording(speak);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPTE, ptePhase, prepRemaining, currentAttempt?.speak_time, triggerStartPTERecording]);

  // Handle Speak countdown and auto-submission
  useEffect(() => {
    if (!isPTE || ptePhase !== 'RECORDING') return;

    const timer = setInterval(() => {
      setSpeakRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          void (async () => {
            try {
              const blobs = await stopRecording();
              if (blobs.length > 0) {
                const blob = await createCleanAudioBlob(blobs);
                await submitAudioBlob(blob);
              }
            } catch (err) {
              console.error('ENTS auto-submit on timeout failed:', err);
            }
          })();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPTE, ptePhase, stopRecording, submitAudioBlob]);

  // Audio prompt completed -> 10 giây đọc đề chuẩn bị
  const handleAudioEnded = useCallback(() => {
    setPtePhase('PREPARING');
    setPrepRemaining(10);
  }, []);

  // Skip preparation
  const handleSkipPrep = useCallback(() => {
    const speak = currentAttempt?.speak_time ?? 40;
    void triggerStartPTERecording(speak);
  }, [currentAttempt?.speak_time, triggerStartPTERecording]);

  // Immediate recording trigger for ENTs (skip listening audio or preparation)
  const handleImmediatePTERecording = useCallback(async () => {
    const speak = currentAttempt?.speak_time ?? 40;
    await triggerStartPTERecording(speak);
  }, [currentAttempt?.speak_time, triggerStartPTERecording]);

  // Early finish and submit for ENTs
  const handlePTEFinishAndSubmit = useCallback(async () => {
    try {
      const blobs = await stopRecording();
      if (blobs.length > 0) {
        const blob = await createCleanAudioBlob(blobs);
        await submitAudioBlob(blob);
      }
    } catch (err) {
      console.error('ENTS early submit failed:', err);
    }
  }, [stopRecording, submitAudioBlob]);

  // Early stop recording for ENTs (allows review before manual submit)
  const handlePTEStopRecording = useCallback(async () => {
    setPtePhase('RECORDED');
    await handleStopRecordingClick();
  }, [handleStopRecordingClick]);

  // Re-record for ENTs
  const handlePTERerecord = useCallback(() => {
    handleRerecord();
    const speak = currentAttempt?.speak_time ?? 40;
    void triggerStartPTERecording(speak);
  }, [handleRerecord, currentAttempt?.speak_time, triggerStartPTERecording]);

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
  const questionText = currentAttempt?.text || session.current_attempt?.text || '';
  const isAllAnswered = !currentAttempt && !session.current_attempt;
  const isLastQuestion = currentSequence >= session.question_count;

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
            {isAllAnswered ? (
              <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ Đã trả lời {session.question_count}/{session.question_count} câu</span>
            ) : (
              <span>Câu hỏi <strong>{currentSequence}</strong> / {session.question_count}</span>
            )}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Question & Answer Area */}
        <div style={styles.questionArea}>
          {isAllAnswered ? (
            <div style={{ ...styles.questionCard, textAlign: 'center', padding: '40px 24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
              <h2 style={{ ...styles.questionTitle, fontSize: '22px', marginBottom: '8px' }}>
                Bạn đã hoàn thành tất cả câu hỏi!
              </h2>
              <p style={{ color: '#64748b', fontSize: '15px', marginBottom: '24px' }}>
                Tất cả các bản ghi âm đã được tải lên máy chủ MinIO và đang được AI xử lý.
              </p>
              <button style={styles.finishExamBtn} onClick={handleFinish}>
                Hoàn thành &amp; Nộp bài
              </button>
            </div>
          ) : isPTE && currentAttempt ? (
            <PTEQuestionCard
              attempt={currentAttempt}
              phase={ptePhase}
              prepTimeRemaining={prepRemaining}
              speakTimeRemaining={speakRemaining}
              totalPrepTime={10}
              totalSpeakTime={currentAttempt.speak_time ?? 40}
              onAudioEnded={handleAudioEnded}
              onSkipPrep={handleSkipPrep}
              onSkipAudioToRecord={handleImmediatePTERecording}
            />
          ) : (
            <div style={styles.questionCard}>
              <div style={styles.questionCardHeader}>
                <h2 style={styles.questionTitle}>
                  Câu hỏi {currentSequence}
                </h2>
                <span style={styles.questionSeqBadge}>Câu {currentSequence}/{session.question_count}</span>
              </div>
              <p style={styles.questionText}>
                {questionText || 'Đang tải nội dung câu hỏi...'}
              </p>
            </div>
          )}

          {!isAllAnswered && (
            <div style={styles.recordingArea}>
              {/* Timer Display (Legacy fallback only) */}
              {!isPTE && (
                <div style={styles.timerDisplay}>
                  <span style={styles.timerLabel}>
                    {isRecording ? 'Thời gian ghi âm: ' : recordedAudio ? 'Thời lượng câu trả lời: ' : 'Thời gian: '}
                  </span>
                  <span style={{ ...styles.timerValue, color: isRecording ? '#dc2626' : '#1e293b' }}>
                    {formatTimer(duration)}
                  </span>
                </div>
              )}

              {/* State 1: Ready to record (Legacy fallback only) */}
              {!isPTE && !isRecording && !recordedAudio && !isUploading && (
                <div style={styles.actionCenter}>
                  <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 16px 0' }}>
                    Dành thời gian suy nghĩ câu hỏi, sau đó bấm <strong>&quot;Bắt đầu trả lời&quot;</strong> để ghi âm.
                  </p>
                  <button style={styles.startRecordBtn} onClick={handleStartRecording}>
                    <span>🎙️</span>
                    <span>Bắt đầu trả lời</span>
                  </button>
                </div>
              )}

              {/* Ready to record for ENTs questions (Before audio finishes or during preparation) */}
              {isPTE && !isRecording && !recordedAudio && !isUploading && (
                <div style={styles.actionCenter}>
                  <div style={styles.pteMicBanner}>
                    <span style={{ fontSize: '24px' }}>🎙️</span>
                    <div>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '15px' }}>
                        {ptePhase === 'AUDIO_PLAYING'
                          ? 'Microphone đã sẵn sàng — Bạn có thể thu âm bất cứ lúc nào'
                          : `Thời gian chuẩn bị: còn ${prepRemaining} giây`}
                      </div>
                      <div style={{ color: '#64748b', fontSize: '13px', marginTop: '2px' }}>
                        {ptePhase === 'AUDIO_PLAYING'
                          ? 'Nếu đã sẵn sàng trả lời, bạn có thể bấm nút bên dưới để ghi âm ngay mà không cần đợi nghe hết file âm thanh.'
                          : 'Bấm nút bên dưới để bỏ qua đếm ngược và bắt đầu thu âm ngay lập tức.'}
                      </div>
                    </div>
                  </div>
                  <button
                    style={styles.startRecordBtn}
                    onClick={handleImmediatePTERecording}
                  >
                    <span>🎙️</span>
                    <span>Bắt đầu thu âm ngay</span>
                  </button>
                </div>
              )}

              {/* State 2: Currently recording */}
              {isRecording && (
                <div style={styles.actionCenter}>
                  <p style={{ color: '#dc2626', fontWeight: 600, fontSize: '14px', margin: '0 0 16px 0' }}>
                    {isPTE
                      ? '● Đang ghi âm câu trả lời... Hết giờ đếm ngược sẽ tự động nộp bài.'
                      : '● Đang thu âm giọng nói của bạn... Hãy nói to rõ vào micro.'}
                  </p>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    {isPTE && (
                      <button
                        style={{ ...styles.stopRecordBtn, backgroundColor: '#0284c7' }}
                        onClick={handlePTEFinishAndSubmit}
                      >
                        <span>✓</span>
                        <span>Hoàn thành &amp; Nộp ngay ⏭</span>
                      </button>
                    )}
                    <button
                      style={{
                        ...styles.stopRecordBtn,
                        backgroundColor: isPTE ? '#475569' : '#dc2626',
                      }}
                      onClick={isPTE ? handlePTEStopRecording : handleStopRecordingClick}
                    >
                      <span>⏹️</span>
                      <span>{isPTE ? 'Dừng để nghe lại' : 'Kết thúc trả lời'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* State 3: Recorded, ready to submit or re-record */}
              {!isRecording && recordedAudio && !isUploading && (
                <div style={styles.reviewCard}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                    🎧 Nghe lại bản ghi âm giọng nói của bạn (vừa thu âm):
                  </div>
                  <audio ref={audioPreviewRef} controls src={recordedAudio.url} style={{ width: '100%', marginBottom: '16px' }} />

                  {submitError && (
                    <div style={{
                      padding: '10px 14px',
                      marginBottom: '14px',
                      backgroundColor: '#fee2e2',
                      color: '#dc2626',
                      borderRadius: '8px',
                      fontSize: '14px',
                      textAlign: 'center',
                    }}>
                      ⚠️ {submitError}
                    </div>
                  )}

                  <div style={styles.reviewActions}>
                    <button style={styles.submitNextBtn} onClick={handleSubmitAndNext}>
                      <span>{isLastQuestion ? 'Nộp câu trả lời & Nộp bài' : `Nộp câu ${currentSequence} & Sang câu tiếp theo →`}</span>
                    </button>

                    <button
                      style={styles.rerecordBtn}
                      onClick={isPTE ? handlePTERerecord : handleRerecord}
                    >
                      <span>🔄 Thu âm lại</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Upload Progress */}
              <UploadProgress
                progress={progress}
                error={uploadError}
                isUploading={isUploading}
              />
            </div>
          )}
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
            onSelectQuestion={() => {}}
          />

          <button style={styles.finishSidebarButton} onClick={handleFinish}>
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
  questionSeqBadge: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#64748b',
    background: '#f1f5f9',
    padding: '3px 8px',
    borderRadius: '4px',
  },
  questionText: {
    fontSize: '17px',
    color: '#1e293b',
    lineHeight: 1.7,
    margin: 0,
  },
  recordingArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  timerDisplay: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
    marginBottom: '16px',
  },
  timerLabel: {
    fontSize: '14px',
    color: '#64748b',
  },
  timerValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  actionCenter: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  pteMicBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '10px',
    padding: '12px 20px',
    marginBottom: '16px',
    textAlign: 'left' as const,
    maxWidth: '520px',
  },
  startRecordBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '14px 28px',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '50px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
    transition: 'all 0.2s',
  },
  stopRecordBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '14px 28px',
    backgroundColor: '#334155',
    color: 'white',
    border: 'none',
    borderRadius: '50px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(51, 65, 85, 0.3)',
    transition: 'all 0.2s',
  },
  reviewCard: {
    width: '100%',
    maxWidth: '500px',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  reviewActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  submitNextBtn: {
    flex: 1,
    padding: '12px 20px',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
  },
  rerecordBtn: {
    padding: '12px 18px',
    backgroundColor: '#ffffff',
    color: '#475569',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
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
  finishSidebarButton: {
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
  finishExamBtn: {
    padding: '14px 28px',
    backgroundColor: '#059669',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 6px rgba(5, 150, 105, 0.2)',
  },
};

export default ExamRoomPage;
