import React, { useRef, useEffect, useState } from 'react';
import type { QuestionAttempt } from '@oralai/shared';

export type SpeakingPhase = 'AUDIO_PLAYING' | 'PREPARING' | 'RECORDING' | 'RECORDED';
export type PTEPhase = SpeakingPhase;

interface SpeakingQuestionCardProps {
  attempt: QuestionAttempt;
  phase: SpeakingPhase;
  prepTimeRemaining: number;
  speakTimeRemaining: number;
  totalPrepTime: number;
  totalSpeakTime: number;
  onAudioEnded?: () => void;
  onSkipPrep?: () => void;
  onSkipAudioToRecord?: () => void;
}

const TYPE_TITLES: Record<string, string> = {
  // 4 Chuẩn ENTs Speaking theo Đề cương FPTU
  GENERAL_INTERVIEW: 'Part 1: Phỏng vấn Tổng quát (General Interview)',
  PICTURE_DESCRIPTION: 'Part 2: Miêu tả Tranh (Picture Description)',
  TOPIC_MONOLOGUE: 'Part 3: Thuyết trình theo Chủ đề (Topic Monologue)',
  DEEP_DISCUSSION: 'Part 4: Thảo luận Chuyên sâu (Deep Discussion)',

  // Legacy mappings for backward compatibility
  READ_ALOUD: 'Part 1: Read Aloud (RA)',
  REPEAT_SENTENCE: 'Part 2: Repeat Sentence (RS)',
  DESCRIBE_IMAGE: 'Part 3: Describe Image (DI)',
  RETELL_LECTURE: 'Part 4: Re-tell Lecture (RL)',
  SUMMARIZE_GROUP_DISCUSSION: 'Part 5: Summarize Group Discussion (SGD)',
  RESPOND_TO_SITUATION: 'Part 6: Respond to a Situation (RTS)',
};

const resolveMediaUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  return url.replace(/^\/+/, './');
};

export const SpeakingQuestionCard: React.FC<SpeakingQuestionCardProps> = ({
  attempt,
  phase,
  prepTimeRemaining,
  speakTimeRemaining,
  totalPrepTime,
  totalSpeakTime,
  onAudioEnded,
  onSkipPrep,
  onSkipAudioToRecord,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const type = attempt.type || 'GENERAL_INTERVIEW';
  const title = TYPE_TITLES[type] || `Speaking Task: ${type}`;
  const instruction = attempt.instruction || '';
  const promptAudio = resolveMediaUrl(attempt.prompt_audio);
  const promptImage = resolveMediaUrl(attempt.prompt_image);
  const text = attempt.text || '';

  // Auto-play prompt audio when entering AUDIO_PLAYING phase
  useEffect(() => {
    if (phase === 'AUDIO_PLAYING' && promptAudio && audioRef.current) {
      setIsPlayingAudio(true);
      setAudioError(null);
      audioRef.current.currentTime = 0;
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Autoplay blocked by browser policy:', err);
          setIsPlayingAudio(false);
          setAudioError('Nhấp vào nút để phát âm thanh câu hỏi.');
        });
      }
    }
  }, [phase, promptAudio]);

  // Pause prompt audio when phase leaves AUDIO_PLAYING
  useEffect(() => {
    if (phase !== 'AUDIO_PLAYING' && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlayingAudio(false);
    }
  }, [phase]);

  const handleManualPlay = () => {
    if (audioRef.current) {
      setAudioError(null);
      setIsPlayingAudio(true);
      audioRef.current.play().catch((err) => {
        console.error('Play failed:', err);
        setAudioError('Không thể phát âm thanh đề bài.');
      });
    }
  };

  const handleAudioEnd = () => {
    setIsPlayingAudio(false);
    if (onAudioEnded) {
      onAudioEnded();
    }
  };

  // Calculate countdown percentages
  const prepPercent =
    totalPrepTime > 0 ? Math.max(0, Math.min(100, (prepTimeRemaining / totalPrepTime) * 100)) : 0;
  const speakPercent =
    totalSpeakTime > 0 ? Math.max(0, Math.min(100, (speakTimeRemaining / totalSpeakTime) * 100)) : 0;

  return (
    <div style={styles.card}>
      {/* Header with Type Badge */}
      <div style={styles.header}>
        <div>
          <span style={styles.taskBadge}>{title}</span>
          <span style={styles.seqBadge}>Câu {attempt.sequence}</span>
        </div>
        {phase === 'AUDIO_PLAYING' && onSkipAudioToRecord && (
          <button style={styles.skipToRecordBtn} onClick={onSkipAudioToRecord}>
            Bỏ qua nghe đề &amp; Ghi âm ngay ⏭
          </button>
        )}
      </div>

      {/* Instruction Box */}
      {instruction && (
        <div style={styles.instructionBox}>
          <div style={styles.instructionIcon}>💡</div>
          <div style={styles.instructionText}>{instruction}</div>
        </div>
      )}

      {/* Audio Element for prompt_audio */}
      {promptAudio && (
        <div style={styles.mediaContainer}>
          <audio
            ref={audioRef}
            src={promptAudio}
            onEnded={handleAudioEnd}
            onError={() => {
              setAudioError('Không tải được tệp âm thanh đề bài.');
              setIsPlayingAudio(false);
            }}
          />
          <div style={styles.audioPromptBanner}>
            <div style={styles.audioStatusRow}>
              <span style={styles.audioWaveIcon}>
                {isPlayingAudio ? '🔊 Đang phát câu hỏi...' : '🔈 Đoạn nghe đề bài'}
              </span>
              {(audioError || (!isPlayingAudio && phase === 'AUDIO_PLAYING')) && (
                <button style={styles.playAudioBtn} onClick={handleManualPlay}>
                  ▶ Phát âm thanh đề bài
                </button>
              )}
            </div>
            {audioError && <p style={styles.audioErrorText}>{audioError}</p>}
          </div>
        </div>
      )}

      {/* Visual Chart / Image for Picture Description or Describe Image */}
      {promptImage && (
        <div style={styles.imageContainer}>
          <img
            src={promptImage}
            alt="Speaking Prompt Visual"
            style={styles.promptImage}
          />
        </div>
      )}

      {/* Main Question Text / Passage */}
      {text && type === 'READ_ALOUD' && (
        <div style={styles.readAloudContainer}>
          <div style={styles.readAloudHeader}>Đoạn văn cần đọc (Passage):</div>
          <p style={styles.readAloudText}>{text}</p>
        </div>
      )}

      {text && type === 'REPEAT_SENTENCE' && phase === 'RECORDED' && (
        <div style={styles.questionTextContainer}>
          <div style={styles.questionTextHeader}>Bản ghi âm câu gốc (Original Sentence):</div>
          <p style={styles.questionText}>{text}</p>
        </div>
      )}

      {text && type !== 'READ_ALOUD' && type !== 'REPEAT_SENTENCE' && (
        <div style={styles.questionTextContainer}>
          <div style={styles.questionTextHeader}>
            {type === 'TOPIC_MONOLOGUE'
              ? 'Chủ đề thuyết trình (Topic Presentation):'
              : type === 'PICTURE_DESCRIPTION'
              ? 'Yêu cầu miêu tả tranh (Picture Prompt):'
              : type === 'DEEP_DISCUSSION'
              ? 'Câu hỏi thảo luận (Discussion Question):'
              : type === 'GENERAL_INTERVIEW'
              ? 'Câu hỏi phỏng vấn (Interview Question):'
              : 'Nội dung câu hỏi (Question):'}
          </div>
          <p style={styles.questionText}>{text}</p>
        </div>
      )}

      {/* Dual-Phase Countdown Bar */}
      <div style={styles.countdownSection}>
        {phase === 'PREPARING' && (
          <div style={styles.phaseAlertPrep}>
            <div style={styles.phaseHeaderRow}>
              <div style={styles.phaseTitle}>
                <span style={styles.prepBadge}>CHUẨN BỊ (PREPARATION)</span>
                <span style={styles.timerCount}>
                  Bắt đầu ghi âm sau: <strong>{prepTimeRemaining}s</strong>
                </span>
              </div>
              {onSkipPrep && (
                <button style={styles.skipPrepBtn} onClick={onSkipPrep}>
                  Bắt đầu nói ngay ⏭
                </button>
              )}
            </div>
            <div style={styles.progressBarTrack}>
              <div
                style={{
                  ...styles.progressBarFillPrep,
                  width: `${prepPercent}%`,
                }}
              />
            </div>
          </div>
        )}

        {phase === 'RECORDING' && (
          <div style={styles.phaseAlertRecord}>
            <div style={styles.phaseHeaderRow}>
              <div style={styles.phaseTitle}>
                <span style={styles.recordBadge}>● ĐANG GHI ÂM (RECORDING)</span>
                <span style={styles.timerCountRecord}>
                  Còn lại: <strong>{speakTimeRemaining}s</strong>
                </span>
              </div>
            </div>
            <div style={styles.progressBarTrack}>
              <div
                style={{
                  ...styles.progressBarFillRecord,
                  width: `${speakPercent}%`,
                }}
              />
            </div>
          </div>
        )}

        {phase === 'RECORDED' && (
          <div style={styles.phaseAlertDone}>
            <span>✓ Đã hoàn tất ghi âm. Bạn có thể nghe lại câu trả lời bên dưới trước khi nộp.</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Aliases for backward compatibility
export const PTEQuestionCard = SpeakingQuestionCard;
export default SpeakingQuestionCard;

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
    border: '1px solid #e2e8f0',
    padding: '24px',
    marginBottom: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    borderBottom: '1px solid #f1f5f9',
    paddingBottom: '12px',
  },
  taskBadge: {
    backgroundColor: '#0284c7',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 700,
    padding: '4px 10px',
    borderRadius: '6px',
    marginRight: '8px',
    letterSpacing: '0.3px',
  },
  seqBadge: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
    fontSize: '13px',
    fontWeight: 600,
    padding: '4px 8px',
    borderRadius: '6px',
  },
  instructionBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    backgroundColor: '#f8fafc',
    borderLeft: '4px solid #0284c7',
    borderRadius: '0 8px 8px 0',
    padding: '12px 16px',
    marginBottom: '16px',
  },
  instructionIcon: {
    fontSize: '18px',
    lineHeight: '22px',
  },
  instructionText: {
    fontSize: '15px',
    color: '#1e293b',
    lineHeight: 1.5,
    fontWeight: 600,
  },
  mediaContainer: {
    marginBottom: '16px',
  },
  audioPromptBanner: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    padding: '12px 16px',
  },
  audioStatusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  audioWaveIcon: {
    color: '#15803d',
    fontWeight: 600,
    fontSize: '14px',
  },
  playAudioBtn: {
    backgroundColor: '#16a34a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 14px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  skipToRecordBtn: {
    backgroundColor: '#0284c7',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 14px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
    transition: 'background-color 0.2s',
  },
  audioErrorText: {
    color: '#dc2626',
    fontSize: '13px',
    marginTop: '6px',
    marginBottom: 0,
  },
  imageContainer: {
    textAlign: 'center',
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  promptImage: {
    maxWidth: '100%',
    maxHeight: '340px',
    height: 'auto',
    borderRadius: '6px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
  },
  readAloudContainer: {
    backgroundColor: '#fdfcfe',
    border: '1px solid #e9d5ff',
    borderRadius: '8px',
    padding: '18px 20px',
    marginBottom: '18px',
  },
  readAloudHeader: {
    fontSize: '12px',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#7e22ce',
    letterSpacing: '0.5px',
    marginBottom: '8px',
  },
  readAloudText: {
    fontSize: '17px',
    lineHeight: 1.65,
    color: '#1e293b',
    fontWeight: 500,
    margin: 0,
  },
  questionTextContainer: {
    marginBottom: '16px',
    padding: '10px 0',
  },
  questionTextHeader: {
    fontSize: '12px',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#7e22ce',
    letterSpacing: '0.5px',
    marginBottom: '8px',
  },
  questionText: {
    fontSize: '18px',
    lineHeight: 1.6,
    color: '#0f172a',
    margin: 0,
    fontWeight: 500,
  },
  countdownSection: {
    marginTop: '16px',
  },
  phaseAlertPrep: {
    backgroundColor: '#fffbeb',
    border: '1px solid #fef3c7',
    borderRadius: '8px',
    padding: '14px 18px',
  },
  phaseAlertRecord: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fee2e2',
    borderRadius: '8px',
    padding: '14px 18px',
  },
  phaseAlertDone: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #dcfce7',
    color: '#166534',
    borderRadius: '8px',
    padding: '14px 18px',
    fontWeight: 600,
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  phaseHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  phaseTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  prepBadge: {
    backgroundColor: '#d97706',
    color: '#ffffff',
    fontSize: '11px',
    fontWeight: 800,
    padding: '3px 8px',
    borderRadius: '4px',
    letterSpacing: '0.5px',
  },
  recordBadge: {
    backgroundColor: '#dc2626',
    color: '#ffffff',
    fontSize: '11px',
    fontWeight: 800,
    padding: '3px 8px',
    borderRadius: '4px',
    letterSpacing: '0.5px',
    animation: 'pulse 1.5s infinite',
  },
  timerCount: {
    fontSize: '14px',
    color: '#92400e',
  },
  timerCountRecord: {
    fontSize: '14px',
    color: '#991b1b',
  },
  skipPrepBtn: {
    backgroundColor: '#f59e0b',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '5px 12px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  progressBarTrack: {
    width: '100%',
    height: '6px',
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressBarFillPrep: {
    height: '100%',
    backgroundColor: '#d97706',
    borderRadius: '3px',
    transition: 'width 1s linear',
  },
  progressBarFillRecord: {
    height: '100%',
    backgroundColor: '#dc2626',
    borderRadius: '3px',
    transition: 'width 1s linear',
  },
};
