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
  // Chuẩn ENTs Speaking theo Đề cương FPTU
  GENERAL_INTERVIEW: 'Level 1 & 2 • Part 1: Phỏng vấn Tổng quát (General Interview)',
  PICTURE_DESCRIPTION: 'Level 1 & 2 • Part 2: Miêu tả Tranh (Picture Description)',
  TOPIC_MONOLOGUE: 'Level 5 & 6 • Part 1: Thuyết trình Độc thoại (Topic Monologue - Long Run)',
  DEEP_DISCUSSION: 'Level 5 & 6 • Part 2: Thảo luận Phản biện (Deep Discussion)',

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
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const [scratchpadNote, setScratchpadNote] = useState('');

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
          <span style={getTaskBadgeStyle(type)}>{title}</span>
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

      {/* ========================================================================= */}
      {/* CHUYÊN BIỆT CHO LEVEL 1 & 2: PICTURE DESCRIPTION                          */}
      {/* ========================================================================= */}
      {type === 'PICTURE_DESCRIPTION' && (
        <div style={styles.pictureDescContainer}>
          {promptImage && (
            <div style={styles.imageBox}>
              <div style={styles.imageBadgeBar}>
                <span style={styles.imageBadge}>🖼️ Bức tranh cần miêu tả (Picture to Describe)</span>
                <button
                  type="button"
                  style={styles.zoomBtn}
                  onClick={() => setIsImageZoomed(!isImageZoomed)}
                >
                  {isImageZoomed ? 'Thu nhỏ ảnh 🔍' : 'Phóng to ảnh 🔎'}
                </button>
              </div>
              <img
                src={promptImage}
                alt="Speaking Prompt Visual"
                style={{
                  ...styles.promptImage,
                  maxHeight: isImageZoomed ? '500px' : '320px',
                  cursor: 'pointer',
                }}
                onClick={() => setIsImageZoomed(!isImageZoomed)}
              />
            </div>
          )}

          <div style={styles.guidedQuestionsCard}>
            <div style={styles.guidedQuestionsTitle}>
              🎯 4 Câu hỏi định hướng cốt lõi (Guiding Questions):
            </div>
            <div style={styles.guidedList}>
              <div style={styles.guidedItem}>
                <span style={styles.guidedNum}>1.</span>
                <span><strong>People:</strong> How many people are there? Who do you think they are?</span>
              </div>
              <div style={styles.guidedItem}>
                <span style={styles.guidedNum}>2.</span>
                <span><strong>Setting:</strong> Where are they located? What objects/tools are around them?</span>
              </div>
              <div style={styles.guidedItem}>
                <span style={styles.guidedNum}>3.</span>
                <span><strong>Activity:</strong> What are they doing or discussing? What are their actions?</span>
              </div>
              <div style={styles.guidedItem}>
                <span style={styles.guidedNum}>4.</span>
                <span><strong>Atmosphere:</strong> How do they appear to feel? What is the overall mood?</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CHUYÊN BIỆT CHO LEVEL 1 & 2: GENERAL INTERVIEW                            */}
      {/* ========================================================================= */}
      {type === 'GENERAL_INTERVIEW' && (
        <div style={styles.interviewContainer}>
          <div style={styles.interviewHeader}>
            <span style={styles.interviewIcon}>🎙️</span>
            <div>
              <div style={styles.interviewTitle}>Phỏng Vấn Tổng Quát (Personal Interview)</div>
              <div style={styles.interviewSub}>Trả lời tự nhiên, to rõ các câu hỏi về thông tin bản thân, thói quen và đời sống hàng ngày.</div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CHUYÊN BIỆT CHO LEVEL 5 & 6: TOPIC MONOLOGUE (LONG RUN)                   */}
      {/* ========================================================================= */}
      {type === 'TOPIC_MONOLOGUE' && (
        <div style={styles.monologueContainer}>
          <div style={styles.monologueHeader}>
            <span style={styles.monologueIcon}>📢</span>
            <div>
              <div style={styles.monologueTitle}>Thuyết Trình Độc Thoại Chuyên Sâu (Long Run Monologue)</div>
              <div style={styles.monologueSub}>
                Bạn có <strong>1 phút chuẩn bị</strong> và <strong>2 - 3 phút thuyết trình liên tục</strong>. Hãy trình bày có cấu trúc rõ ràng (Mở bài - Thân bài - Kết bài).
              </div>
            </div>
          </div>

          {/* Interactive Scratchpad for Note-taking during Prep Time */}
          <div style={styles.notepadContainer}>
            <div style={styles.notepadHeader}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e40af' }}>
                📝 Bảng Nháp Dàn Ý Bài Nói (Quick Outline Scratchpad)
              </span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                Tự do gõ ý chính trong lúc chuẩn bị (Ghi chú này sẽ luôn hiển thị trong lúc nói)
              </span>
            </div>
            <textarea
              value={scratchpadNote}
              onChange={(e) => setScratchpadNote(e.target.value)}
              placeholder="Gõ nhanh dàn ý tại đây... Ví dụ:&#10;• Mở bài: Giới thiệu chủ đề, lý do chọn&#10;• Thân bài 1: Nét tính cách / Mục tiêu cụ thể&#10;• Thân bài 2: Thách thức đã vượt qua & bài học rút ra&#10;• Kết luận: Ý nghĩa đối với bản thân hiện tại"
              style={styles.notepadTextarea}
              rows={4}
            />
          </div>

          {/* Speech Milestone Guidance Bar during RECORDING */}
          {phase === 'RECORDING' && (
            <div style={styles.milestoneBar}>
              <div style={styles.milestoneItem}>
                <span style={{ fontWeight: 700, color: '#1e40af' }}>0:00 - 0:30:</span> Mở bài (Intro)
              </div>
              <div style={styles.milestoneDivider}>→</div>
              <div style={styles.milestoneItem}>
                <span style={{ fontWeight: 700, color: '#059669' }}>0:30 - 2:00:</span> Thân bài &amp; Ví dụ (Main Points)
              </div>
              <div style={styles.milestoneDivider}>→</div>
              <div style={styles.milestoneItem}>
                <span style={{ fontWeight: 700, color: '#d97706' }}>2:00 - 2:30:</span> Kết luận (Conclusion)
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* CHUYÊN BIỆT CHO LEVEL 5 & 6: DEEP DISCUSSION                              */}
      {/* ========================================================================= */}
      {type === 'DEEP_DISCUSSION' && (
        <div style={styles.discussionContainer}>
          <div style={styles.discussionHeader}>
            <span style={styles.discussionIcon}>💡</span>
            <div>
              <div style={styles.discussionTitle}>Thảo Luận Biện Luận Phản Biện (Critical Deep Discussion)</div>
              <div style={styles.discussionSub}>
                Đưa ra quan điểm cá nhân rõ ràng, lập luận đa chiều (pros &amp; cons) và sử dụng vốn từ vựng phong phú (B2 - C1).
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Question Text Container */}
      {text && (
        <div style={styles.questionTextContainer}>
          <div style={styles.questionTextHeader}>
            {type === 'TOPIC_MONOLOGUE'
              ? 'Chủ đề thuyết trình (Topic Prompt):'
              : type === 'PICTURE_DESCRIPTION'
              ? 'Yêu cầu miêu tả tranh (Picture Prompt):'
              : type === 'DEEP_DISCUSSION'
              ? 'Câu hỏi thảo luận phản biện (Discussion Question):'
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
            <span>✓ Đã hoàn tất ghi âm câu trả lời. Bạn có thể nghe lại bên dưới trước khi bấm Nộp.</span>
          </div>
        )}
      </div>
    </div>
  );
};

function getTaskBadgeStyle(type: string): React.CSSProperties {
  if (type === 'TOPIC_MONOLOGUE' || type === 'DEEP_DISCUSSION') {
    return {
      backgroundColor: '#4338ca',
      color: '#ffffff',
      fontSize: '13px',
      fontWeight: 700,
      padding: '5px 12px',
      borderRadius: '6px',
      marginRight: '8px',
      letterSpacing: '0.3px',
    };
  }
  return {
    backgroundColor: '#0284c7',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 700,
    padding: '5px 12px',
    borderRadius: '6px',
    marginRight: '8px',
    letterSpacing: '0.3px',
  };
}

// Aliases for backward compatibility
export const PTEQuestionCard = SpeakingQuestionCard;
export default SpeakingQuestionCard;

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '14px',
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
    flexWrap: 'wrap',
    gap: '8px',
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
    fontSize: '14px',
    color: '#1e293b',
    lineHeight: 1.5,
    fontWeight: 500,
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
  },
  audioErrorText: {
    color: '#dc2626',
    fontSize: '13px',
    marginTop: '6px',
    marginBottom: 0,
  },

  // Picture Description Styles
  pictureDescContainer: {
    marginBottom: '18px',
  },
  imageBox: {
    textAlign: 'center',
    marginBottom: '16px',
    padding: '14px',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
  },
  imageBadgeBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  imageBadge: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#334155',
  },
  zoomBtn: {
    padding: '4px 10px',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    color: '#0f172a',
  },
  promptImage: {
    maxWidth: '100%',
    height: 'auto',
    borderRadius: '8px',
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.08)',
    transition: 'max-height 0.25s ease',
  },
  guidedQuestionsCard: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '10px',
    padding: '14px 18px',
    marginBottom: '16px',
  },
  guidedQuestionsTitle: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#166534',
    marginBottom: '8px',
  },
  guidedList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  guidedItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    fontSize: '14px',
    color: '#1e293b',
    lineHeight: 1.4,
  },
  guidedNum: {
    color: '#16a34a',
    fontWeight: 700,
  },

  // Interview Styles
  interviewContainer: {
    marginBottom: '16px',
  },
  interviewHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: '#f0f9ff',
    border: '1px solid #bae6fd',
    borderRadius: '10px',
    padding: '12px 16px',
  },
  interviewIcon: {
    fontSize: '24px',
  },
  interviewTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#0369a1',
  },
  interviewSub: {
    fontSize: '12px',
    color: '#0284c7',
  },

  // Monologue Styles (Level 5 & 6)
  monologueContainer: {
    marginBottom: '18px',
  },
  monologueHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    backgroundColor: '#eef2ff',
    border: '1px solid #c7d2fe',
    borderRadius: '10px',
    padding: '12px 16px',
    marginBottom: '14px',
  },
  monologueIcon: {
    fontSize: '24px',
  },
  monologueTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#3730a3',
  },
  monologueSub: {
    fontSize: '13px',
    color: '#4338ca',
    marginTop: '2px',
    lineHeight: 1.4,
  },
  notepadContainer: {
    backgroundColor: '#ffffff',
    border: '1.5px solid #cbd5e1',
    borderRadius: '10px',
    padding: '12px 16px',
    marginBottom: '14px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
  },
  notepadHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    flexWrap: 'wrap',
    gap: '6px',
  },
  notepadTextarea: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    fontSize: '13px',
    lineHeight: 1.5,
    fontFamily: 'inherit',
    color: '#0f172a',
    backgroundColor: '#fafafa',
    boxSizing: 'border-box',
    resize: 'vertical',
    outline: 'none',
  },
  milestoneBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '12px',
    color: '#475569',
    marginBottom: '12px',
  },
  milestoneItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  milestoneDivider: {
    color: '#94a3b8',
    fontWeight: 700,
  },

  // Discussion Styles
  discussionContainer: {
    marginBottom: '16px',
  },
  discussionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: '#faf5ff',
    border: '1px solid #e9d5ff',
    borderRadius: '10px',
    padding: '12px 16px',
  },
  discussionIcon: {
    fontSize: '24px',
  },
  discussionTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#6b21a8',
  },
  discussionSub: {
    fontSize: '12px',
    color: '#7e22ce',
  },

  // Question Text
  questionTextContainer: {
    marginBottom: '16px',
    padding: '14px 18px',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
  },
  questionTextHeader: {
    fontSize: '12px',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#475569',
    letterSpacing: '0.5px',
    marginBottom: '6px',
  },
  questionText: {
    fontSize: '17px',
    lineHeight: 1.6,
    color: '#0f172a',
    margin: 0,
    fontWeight: 600,
  },

  // Countdown & Phase
  countdownSection: {
    marginTop: '16px',
  },
  phaseAlertPrep: {
    backgroundColor: '#fffbeb',
    border: '1px solid #fef3c7',
    borderRadius: '10px',
    padding: '14px 18px',
  },
  phaseAlertRecord: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fee2e2',
    borderRadius: '10px',
    padding: '14px 18px',
  },
  phaseAlertDone: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #dcfce7',
    color: '#166534',
    borderRadius: '10px',
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
    height: '8px',
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressBarFillPrep: {
    height: '100%',
    backgroundColor: '#d97706',
    borderRadius: '4px',
    transition: 'width 1s linear',
  },
  progressBarFillRecord: {
    height: '100%',
    backgroundColor: '#dc2626',
    borderRadius: '4px',
    transition: 'width 1s linear',
  },
};
