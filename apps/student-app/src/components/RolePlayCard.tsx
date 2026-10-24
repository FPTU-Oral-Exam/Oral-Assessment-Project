import React, { useState, useEffect, useRef } from 'react';
import type { QuestionAttempt } from '@oralai/shared';
import { api } from '../lib/api';

interface RolePlayCardProps {
  attempt: QuestionAttempt;
  sessionId: string;
  onFinishRolePlay?: () => void;
}

interface ChatMessage {
  role: 'assistant' | 'user';
  content: string;
}

interface MissionTask {
  id: string;
  label: string;
}

export const RolePlayCard: React.FC<RolePlayCardProps> = ({ attempt, sessionId, onFinishRolePlay }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [persona, setPersona] = useState<string>('Alex (Travel Coordinator)');
  const [userInput, setUserInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [turnIndex, setTurnIndex] = useState<number>(0);
  const [isFinalTurn, setIsFinalTurn] = useState<boolean>(false);
  const [tasks, setTasks] = useState<MissionTask[]>([
    { id: 'time', label: '1. Ngày đi & giờ xe xuất phát' },
    { id: 'price', label: '2. Giá vé & ưu đãi sinh viên' },
    { id: 'places', label: '3. Các địa điểm tham quan chính' },
    { id: 'items', label: '4. Đồ dùng cá nhân cần chuẩn bị & cảm ơn' },
  ]);
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);
  const [isSpeakingAI, setIsSpeakingAI] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Text-To-Speech using native browser SpeechSynthesis
  const speakAI = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.95;

      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Google') || v.name.includes('David')));
      if (englishVoice) {
        utterance.voice = englishVoice;
      }

      utterance.onstart = () => setIsSpeakingAI(true);
      utterance.onend = () => setIsSpeakingAI(false);
      utterance.onerror = () => setIsSpeakingAI(false);

      window.speechSynthesis.speak(utterance);
    }
  };

  // Scroll to bottom of chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Initial greeting on mount
  useEffect(() => {
    let isMounted = true;

    async function initRolePlay() {
      setIsLoading(true);
      try {
        const scenario = attempt.text?.includes('ENT303') || attempt.text?.includes('Workplace')
          ? 'ENT303_ROLE_01'
          : 'ENT203_ROLE_01';

        const data = await api.roleplayChat({
          session_id: sessionId,
          scenario_code: scenario,
          user_message: '',
          history: [],
          turn_index: 0,
        });

        if (isMounted) {
          setPersona(data.persona || 'Alex (Travel Coordinator)');
          setMessages([{ role: 'assistant', content: data.reply }]);
          if (data.tasks) setTasks(data.tasks);
          speakAI(data.reply);
        }
      } catch (err) {
        console.warn('Initial role-play greeting error, using local fallback:', err);
        const fallbackGreeting = "Good morning! Welcome to the Da Nang School Trip Info Desk. How can I assist you with your trip today?";
        if (isMounted) {
          setMessages([{ role: 'assistant', content: fallbackGreeting }]);
          speakAI(fallbackGreeting);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initRolePlay();

    return () => {
      isMounted = false;
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [sessionId, attempt.text]);

  const handleSendReply = async () => {
    if (!userInput.trim() || isLoading) return;

    const userText = userInput.trim();
    const updatedHistory: ChatMessage[] = [...messages, { role: 'user', content: userText }];
    setMessages(updatedHistory);
    setUserInput('');
    setIsLoading(true);

    try {
      const scenario = attempt.text?.includes('ENT303') || attempt.text?.includes('Workplace')
        ? 'ENT303_ROLE_01'
        : 'ENT203_ROLE_01';

      const data = await api.roleplayChat({
        session_id: sessionId,
        scenario_code: scenario,
        user_message: userText,
        history: updatedHistory,
        turn_index: turnIndex,
      });

      setTurnIndex(data.turn_index);
      setIsFinalTurn(data.is_final_turn);
      if (data.tasks) setTasks(data.tasks);
      if (data.completed_task_ids) setCompletedTaskIds(data.completed_task_ids);

      const aiReply = data.reply;
      setMessages((prev) => [...prev, { role: 'assistant', content: aiReply }]);
      speakAI(aiReply);
    } catch (err) {
      console.warn('Role-play response error, fallback:', err);
      const fallbackReply = "The bus leaves at 6:00 AM this Saturday from the main gate. The ticket is 250,000 VND. Don't forget your student ID!";
      setMessages((prev) => [...prev, { role: 'assistant', content: fallbackReply }]);
      speakAI(fallbackReply);
      setTurnIndex((prev) => prev + 1);
    } finally {
      setIsLoading(false);
    }
  };

  const isENT303 = attempt.text?.includes('ENT303') || attempt.text?.includes('Workplace');

  return (
    <div style={styles.container}>
      {/* Top Banner */}
      <div style={styles.topBanner}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={styles.typeBadge}>Level {isENT303 ? '4 (B1+)' : '3 (B1)'} • Part 1: Role-Play</span>
          <span style={styles.localAIBadge}>⚡ Local AI (Ollama Qwen2.5)</span>
        </div>
        <div style={styles.turnTracker}>
          Lượt hội thoại: <strong>{Math.min(turnIndex + 1, 4)} / 4</strong>
        </div>
      </div>

      {/* Main Grid: Left Role Card (40%) + Right Chat Area (60%) */}
      <div style={styles.grid}>
        {/* Left Column: Your Role Card */}
        <div style={styles.roleCard}>
          <div style={styles.roleHeader}>
            <span style={{ fontSize: '20px' }}>📋</span>
            <div>
              <div style={styles.roleTitle}>THẺ VAI TRÒ CỦA BẠN</div>
              <div style={styles.roleSubtitle}>
                {isENT303 ? 'Sinh viên thực tập trao đổi (Exchange Intern)' : 'Thí sinh A (Student A - Du khách)'}
              </div>
            </div>
          </div>

          <div style={styles.scenarioContext}>
            <div style={styles.contextHeader}>📖 Bối cảnh tình huống:</div>
            <p style={styles.contextText}>
              {isENT303
                ? 'Bạn là thực tập sinh mới tại một công ty đa quốc gia. Bạn đang trao đổi với Cố vấn văn phòng Sarah để tìm hiểu quy tắc ứng xử chuẩn quốc tế.'
                : 'Bạn đang muốn đăng ký tham gia chuyến đi Đà Nẵng cuối tuần cùng trường. Hãy trao đổi với Điều phối viên Alex để hỏi các thông tin cần thiết.'}
            </p>
          </div>

          {/* Mission Checklist */}
          <div style={styles.missionCard}>
            <div style={styles.missionTitle}>🎯 4 Mục tiêu bạn cần hỏi:</div>
            <div style={styles.missionList}>
              {tasks.map((task) => {
                const isDone = completedTaskIds.includes(task.id);
                return (
                  <div
                    key={task.id}
                    style={{
                      ...styles.missionItem,
                      backgroundColor: isDone ? '#f0fdf4' : '#f8fafc',
                      borderColor: isDone ? '#86efac' : '#e2e8f0',
                    }}
                  >
                    <span style={{ fontSize: '15px' }}>{isDone ? '✅' : '⚪'}</span>
                    <span style={{ color: isDone ? '#166534' : '#334155', fontWeight: isDone ? 700 : 500 }}>
                      {task.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Useful Expressions Hints */}
          <div style={styles.hintCard}>
            <div style={styles.hintTitle}>💡 Gợi ý mẫu câu hỏi lịch sự B1:</div>
            <div style={styles.hintList}>
              <div>• <em>"Could you please tell me what time..."</em></div>
              <div>• <em>"I would like to know if there is..."</em></div>
              <div>• <em>"What should I prepare for..."</em></div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Speech & Chat Stream */}
        <div style={styles.chatSection}>
          {/* Partner Info Bar */}
          <div style={styles.partnerBar}>
            <div style={styles.partnerInfo}>
              <div style={styles.partnerAvatar}>🤖</div>
              <div>
                <div style={styles.partnerName}>{persona}</div>
                <div style={styles.partnerStatus}>
                  {isSpeakingAI ? '🔊 Đang phát âm thanh...' : '🟢 Đang lắng nghe câu hỏi của bạn'}
                </div>
              </div>
            </div>
            {isSpeakingAI && (
              <button
                type="button"
                onClick={() => {
                  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                  setIsSpeakingAI(false);
                }}
                style={styles.stopAudioBtn}
              >
                ⏹️ Tắt tiếng AI
              </button>
            )}
          </div>

          {/* Chat Stream Timeline */}
          <div style={styles.chatStream}>
            {messages.map((msg, index) => {
              const isAI = msg.role === 'assistant';
              return (
                <div
                  key={index}
                  style={{
                    ...styles.chatRow,
                    justifyContent: isAI ? 'flex-start' : 'flex-end',
                  }}
                >
                  {isAI && <div style={styles.bubbleAvatar}>🤖</div>}
                  <div
                    style={{
                      ...styles.chatBubble,
                      backgroundColor: isAI ? '#f1f5f9' : '#2563eb',
                      color: isAI ? '#0f172a' : '#ffffff',
                      borderBottomLeftRadius: isAI ? '4px' : '14px',
                      borderBottomRightRadius: isAI ? '14px' : '4px',
                    }}
                  >
                    <div style={{ fontSize: '11px', opacity: 0.8, marginBottom: '4px', fontWeight: 600 }}>
                      {isAI ? persona : 'Bạn (Candidate A)'}
                    </div>
                    <div style={{ fontSize: '14px', lineHeight: 1.5 }}>
                      {msg.content}
                    </div>
                    {isAI && (
                      <button
                        type="button"
                        onClick={() => speakAI(msg.content)}
                        style={styles.replayAudioBtn}
                        title="Nghe lại câu này"
                      >
                        🔊 Nghe lại
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div style={styles.chatRow}>
                <div style={styles.bubbleAvatar}>🤖</div>
                <div style={{ ...styles.chatBubble, backgroundColor: '#f1f5f9', color: '#64748b' }}>
                  <span style={styles.typingIndicator}>Local AI đang suy nghĩ phản hồi...</span>
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Input & Action Bar */}
          <div style={styles.actionBar}>
            {isFinalTurn ? (
              <div style={styles.finalBox}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#166534', marginBottom: '8px' }}>
                  🎉 Bạn đã hoàn tất phần thi Role-Play tương tác với Local AI!
                </div>
                <p style={{ fontSize: '12px', color: '#475569', margin: '0 0 12px 0' }}>
                  Toàn bộ lượt đối thoại đã được lưu trữ an toàn để AI chấm điểm 5 tiêu chí.
                </p>
                {onFinishRolePlay && (
                  <button onClick={onFinishRolePlay} style={styles.nextPartBtn}>
                    Chuyển sang Part 2: Thảo Luận Sâu (Discussion) ⏭
                  </button>
                )}
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                    disabled={isLoading}
                    placeholder="Gõ hoặc nói câu hỏi của bạn (VD: What time does the bus depart?)..."
                    style={styles.chatInput}
                  />
                  <button
                    onClick={handleSendReply}
                    disabled={isLoading || !userInput.trim()}
                    style={styles.sendBtn}
                  >
                    {isLoading ? 'Đang gửi...' : 'Gửi lượt này ⏭'}
                  </button>
                </div>
                <div style={styles.quickSpeechHint}>
                  💡 <em>Mẹo:</em> Bạn có thể gõ câu hỏi hoặc sử dụng mic nói câu hỏi rồi nhấn Gửi.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RolePlayCard;

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    marginBottom: '20px',
  },
  topBanner: {
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    padding: '12px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeBadge: {
    backgroundColor: '#0284c7',
    color: '#ffffff',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 700,
  },
  localAIBadge: {
    backgroundColor: '#ecfdf5',
    color: '#059669',
    border: '1px solid #a7f3d0',
    padding: '3px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 600,
  },
  turnTracker: {
    fontSize: '13px',
    color: '#475569',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '40% 60%',
    minHeight: '480px',
  },
  roleCard: {
    backgroundColor: '#ffffff',
    borderRight: '1px solid #e2e8f0',
    padding: '20px',
    overflowY: 'auto',
  },
  roleHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '16px',
  },
  roleTitle: {
    fontSize: '13px',
    fontWeight: 800,
    color: '#0f172a',
    letterSpacing: '0.04em',
  },
  roleSubtitle: {
    fontSize: '12px',
    color: '#2563eb',
    fontWeight: 600,
  },
  scenarioContext: {
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '8px',
    padding: '12px 14px',
    marginBottom: '16px',
  },
  contextHeader: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#1e40af',
    marginBottom: '4px',
  },
  contextText: {
    fontSize: '13px',
    color: '#1e3a8a',
    margin: 0,
    lineHeight: 1.4,
  },
  missionCard: {
    marginBottom: '16px',
  },
  missionTitle: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#334155',
    marginBottom: '8px',
  },
  missionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  missionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid',
    fontSize: '12px',
    transition: 'all 0.2s ease',
  },
  hintCard: {
    backgroundColor: '#fffbeb',
    border: '1px solid #fef3c7',
    borderRadius: '8px',
    padding: '10px 12px',
  },
  hintTitle: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#b45309',
    marginBottom: '4px',
  },
  hintList: {
    fontSize: '11px',
    color: '#92400e',
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  chatSection: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#fafafa',
  },
  partnerBar: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    padding: '12px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  partnerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  partnerAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    backgroundColor: '#eff6ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
  },
  partnerName: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#0f172a',
  },
  partnerStatus: {
    fontSize: '11px',
    color: '#16a34a',
    fontWeight: 500,
  },
  stopAudioBtn: {
    padding: '4px 10px',
    backgroundColor: '#f1f5f9',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '11px',
    cursor: 'pointer',
    color: '#334155',
  },
  chatStream: {
    flex: 1,
    padding: '20px',
    overflowY: 'auto',
    maxHeight: '380px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  chatRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
  },
  bubbleAvatar: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    backgroundColor: '#e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
  },
  chatBubble: {
    maxWidth: '75%',
    padding: '10px 14px',
    borderRadius: '14px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  replayAudioBtn: {
    marginTop: '6px',
    backgroundColor: 'transparent',
    border: '1px solid #cbd5e1',
    borderRadius: '4px',
    padding: '2px 8px',
    fontSize: '11px',
    cursor: 'pointer',
    color: '#475569',
  },
  typingIndicator: {
    fontStyle: 'italic',
    fontSize: '13px',
  },
  actionBar: {
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e2e8f0',
    padding: '16px 20px',
  },
  chatInput: {
    flex: 1,
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1.5px solid #cbd5e1',
    fontSize: '13px',
    outline: 'none',
  },
  sendBtn: {
    padding: '10px 18px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  quickSpeechHint: {
    fontSize: '11px',
    color: '#94a3b8',
    marginTop: '6px',
  },
  finalBox: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '10px',
    padding: '14px 18px',
    textAlign: 'center',
  },
  nextPartBtn: {
    padding: '10px 20px',
    backgroundColor: '#16a34a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)',
  },
};
