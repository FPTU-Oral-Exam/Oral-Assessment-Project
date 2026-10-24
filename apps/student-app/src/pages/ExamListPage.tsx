import React, { useState, useEffect } from 'react';
import type { StudentExam } from '@oralai/shared';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';

interface ExamListPageProps {
  onStartExam: (sessionId: string, exam?: StudentExam) => void;
  onViewResults: (sessionId: string, exam: StudentExam) => void;
  onLogout: () => void;
}

export function ExamListPage({ onStartExam, onViewResults, onLogout }: ExamListPageProps) {
  const { user, token } = useAuth();
  const [exams, setExams] = useState<StudentExam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingExamId, setStartingExamId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchExams() {
      try {
        setIsLoading(true);
        const currentToken = token || api.getToken();
        if (!currentToken) {
          setError('Không tìm thấy phiên đăng nhập. Vui lòng đăng nhập lại.');
          return;
        }

        api.setToken(currentToken);
        const examList = await api.getAvailableExams();
        setExams(examList);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không thể tải danh sách ca thi');
      } finally {
        setIsLoading(false);
      }
    }

    fetchExams();
  }, [token]);

  const handleSelectExam = async (exam: StudentExam, restartFromStart = false) => {
    try {
      setStartingExamId(exam.id);
      let sessionId = exam.session_id;

      const isFinished = ['SUBMITTED', 'REVIEW_REQUIRED', 'COMPLETED'].includes(exam.status);

      // Nếu bài đã nộp hoặc người dùng bấm thi lại từ đầu: tạo session mới (new_attempt=true)
      if (isFinished || restartFromStart) {
        const session = await api.createSession(exam.id, true);
        if (session && session.id) {
          onStartExam(session.id, exam);
        }
        return;
      }

      // Nếu đang làm dở (DEVICE_CHECK hoặc IN_PROGRESS), tiếp tục bài thi
      if (sessionId && ['DEVICE_CHECK', 'IN_PROGRESS'].includes(exam.status)) {
        onStartExam(sessionId, exam);
        return;
      }

      // Nếu chưa có session (ASSIGNED), tạo session đầu tiên
      if (!sessionId || exam.status === 'ASSIGNED') {
        const session = await api.createSession(exam.id, false);
        sessionId = session.id;
      }

      if (sessionId) {
        onStartExam(sessionId, exam);
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể khởi tạo ca thi');
    } finally {
      setStartingExamId(null);
    }
  };

  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p style={{ marginTop: '16px', color: '#475569', fontWeight: 500 }}>
          Đang xác thực thông tin Thí sinh & Ca thi...
        </p>
      </div>
    );
  }

  // Lấy bài thi ưu tiên (đầu tiên) làm Thẻ dự thi chính
  const primaryExam = exams.length > 0 ? exams[0] : null;
  const otherExams = exams.length > 1 ? exams.slice(1) : [];

  return (
    <div style={styles.pageWrapper}>
      {/* Top Navigation Bar */}
      <header style={styles.navbar}>
        <div style={styles.navContainer}>
          <div style={styles.navBrand}>
            <div style={styles.brandIcon}>🎙️</div>
            <div>
              <div style={styles.brandTitle}>OralAI Assessment</div>
              <div style={styles.brandSubtitle}>Cổng Thi Nói Tiếng Anh ENTs Chuẩn FPT</div>
            </div>
          </div>

          <div style={styles.userProfile}>
            <div style={styles.userAvatar}>
              {(user?.name || user?.username || 'SV').charAt(0).toUpperCase()}
            </div>
            <div style={styles.userInfo}>
              <div style={styles.userName}>{user?.name || user?.username}</div>
              <div style={styles.userMeta}>
                <span>MSSV: <strong>{user?.username}</strong></span>
                {primaryExam?.class_code && (
                  <span style={styles.classBadge}>Lớp: {primaryExam.class_code}</span>
                )}
              </div>
            </div>
            <button onClick={onLogout} style={styles.logoutBtn} title="Đăng xuất khỏi hệ thống">
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={styles.mainContent}>
        {error && (
          <div style={styles.errorBanner}>
            <span>⚠️ {error}</span>
            <button onClick={() => window.location.reload()} style={styles.retryBtn}>
              Thử lại
            </button>
          </div>
        )}

        {!primaryExam ? (
          <div style={styles.emptyCard}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
            <h2 style={{ fontSize: '20px', color: '#1e293b', marginBottom: '8px' }}>
              Chưa có Ca thi nào được chỉ định
            </h2>
            <p style={{ color: '#64748b', maxWidth: '460px', margin: '0 auto 20px', lineHeight: 1.5 }}>
              Tài khoản MSSV <strong>{user?.username}</strong> hiện chưa được xếp vào ca thi nào trong đợt này.
              Vui lòng liên hệ Cán bộ Khảo thí hoặc Giảng viên bộ môn để kiểm tra danh sách import.
            </p>
            <button onClick={onLogout} style={styles.secondaryBtn}>
              Đăng xuất
            </button>
          </div>
        ) : (
          <div>
            {/* Title Section */}
            <div style={styles.sectionHeader}>
              <div>
                <h1 style={styles.pageTitle}>Thẻ Dự Thi Sinh Viên</h1>
                <p style={styles.pageDesc}>
                  Hệ thống tự động phát hiện thông tin Level, Ca thi và Phòng thi được phân bổ cho bạn.
                </p>
              </div>
              <div style={styles.currentDateBadge}>
                📅 Hôm nay: {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>

            {/* CANDIDATE EXAM PASS CARD */}
            <div style={styles.passCard}>
              {/* Card Banner Header */}
              <div style={styles.passHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={styles.levelTag}>
                    {primaryExam.level_number || 'Level'} {primaryExam.cefr_level ? `(${primaryExam.cefr_level})` : ''}
                  </span>
                  <span style={styles.courseTag}>
                    {primaryExam.course_code || 'ENT'}
                  </span>
                </div>
                <div style={getStatusBadgeStyle(primaryExam.status)}>
                  {getStatusText(primaryExam.status)}
                </div>
              </div>

              {/* Course Title */}
              <div style={styles.passCourseSection}>
                <h2 style={styles.passCourseTitle}>
                  {primaryExam.name || primaryExam.course_name}
                </h2>
                <div style={styles.passCourseSub}>
                  {primaryExam.level_title || primaryExam.course_name} • Mã môn: <strong>{primaryExam.course_code}</strong>
                </div>
              </div>

              {/* Key Exam Details Grid */}
              <div style={styles.detailsGrid}>
                {/* Phòng thi */}
                <div style={styles.gridBox}>
                  <div style={styles.gridBoxIcon}>🏫</div>
                  <div>
                    <div style={styles.gridBoxLabel}>Phòng thi</div>
                    <div style={styles.gridBoxValueHighlight}>
                      {primaryExam.slot_info?.room || 'AL-L401 (Online)'}
                    </div>
                  </div>
                </div>

                {/* Ca thi */}
                <div style={styles.gridBox}>
                  <div style={styles.gridBoxIcon}>⏰</div>
                  <div>
                    <div style={styles.gridBoxLabel}>Ca thi (Slot)</div>
                    <div style={styles.gridBoxValue}>
                      {primaryExam.slot_info ? (
                        <>
                          <strong>Ca {primaryExam.slot_info.slot_number}</strong> ({primaryExam.slot_info.start_time} - {primaryExam.slot_info.end_time})
                        </>
                      ) : (
                        'Ca 1 (07:30 - 08:30)'
                      )}
                    </div>
                  </div>
                </div>

                {/* Cán bộ coi thi */}
                <div style={styles.gridBox}>
                  <div style={styles.gridBoxIcon}>👨‍🏫</div>
                  <div>
                    <div style={styles.gridBoxLabel}>Cán bộ coi thi (Examiner)</div>
                    <div style={styles.gridBoxValue}>
                      {primaryExam.slot_info?.teacher_name || 'Cán bộ Khảo thí FPTU'}
                    </div>
                  </div>
                </div>

                {/* Lớp & Số câu hỏi */}
                <div style={styles.gridBox}>
                  <div style={styles.gridBoxIcon}>📋</div>
                  <div>
                    <div style={styles.gridBoxLabel}>Lớp & Thời lượng</div>
                    <div style={styles.gridBoxValue}>
                      Lớp: <strong>{primaryExam.class_code || 'SE1701'}</strong> • {primaryExam.question_count} câu ({Math.round(primaryExam.time_limit / 60)} phút)
                    </div>
                  </div>
                </div>
              </div>

              {/* Format & Instructions Callout */}
              <div style={styles.formatCallout}>
                <div style={styles.formatCalloutTitle}>
                  <span>🎯 Cấu trúc bài thi Speaking theo Level:</span>
                </div>
                <div style={styles.formatCalloutContent}>
                  <strong>{primaryExam.format_summary || 'Part 1: Phỏng vấn câu hỏi chung + Part 2: Miêu tả tranh độc thoại'}</strong>
                </div>
                <div style={styles.formatGuidelines}>
                  <div>✓ <strong>Microphone:</strong> Hãy đeo tai nghe có mic để hệ thống ghi âm giọng nói rõ ràng nhất.</div>
                  <div>✓ <strong>Camera:</strong> Bật camera khi được yêu cầu để ghi hình giám sát thi trung thực.</div>
                  <div>✓ <strong>Thời gian:</strong> Sau khi nghe câu hỏi, bạn có thời gian suy nghĩ và đếm ngược tự động để nói.</div>
                </div>
              </div>

              {/* Card Action Buttons */}
              <div style={styles.passActions}>
                {['SUBMITTED', 'REVIEW_REQUIRED', 'COMPLETED'].includes(primaryExam.status) ? (
                  <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                    <button
                      onClick={() => primaryExam.session_id && onViewResults(primaryExam.session_id, primaryExam)}
                      style={styles.primaryBtn}
                    >
                      📊 Xem Kết quả &amp; Bảng điểm Chi tiết
                    </button>
                    <button
                      onClick={() => handleSelectExam(primaryExam, true)}
                      disabled={startingExamId === primaryExam.id}
                      style={styles.secondaryOutlineBtn}
                    >
                      {startingExamId === primaryExam.id ? 'Đang khởi tạo...' : '🔄 Làm lại bài thi (Lượt mới)'}
                    </button>
                  </div>
                ) : ['DEVICE_CHECK', 'IN_PROGRESS'].includes(primaryExam.status) ? (
                  <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                    <button
                      onClick={() => handleSelectExam(primaryExam, false)}
                      disabled={startingExamId === primaryExam.id}
                      style={{ ...styles.primaryBtn, backgroundColor: '#ea580c' }}
                    >
                      {startingExamId === primaryExam.id ? 'Đang vào...' : '▶ Tiếp tục làm bài thi (Đang làm dở)'}
                    </button>
                    <button
                      onClick={() => handleSelectExam(primaryExam, true)}
                      disabled={startingExamId === primaryExam.id}
                      style={styles.secondaryOutlineBtn}
                    >
                      🔄 Bắt đầu lại từ Câu 1
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleSelectExam(primaryExam, false)}
                    disabled={startingExamId === primaryExam.id}
                    style={styles.primaryBtn}
                  >
                    {startingExamId === primaryExam.id ? (
                      'Đang chuẩn bị phòng thi...'
                    ) : (
                      '🚀 Vào Phòng Thi (Kiểm Tra Mic & Bắt Đầu Làm Bài)'
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Other Exams / Practice Exams Section (if any) */}
            {otherExams.length > 0 && (
              <div style={{ marginTop: '36px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', marginBottom: '16px' }}>
                  Các Ca thi &amp; Môn thi khác ({otherExams.length})
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                  {otherExams.map((ex) => (
                    <div key={ex.id} style={styles.miniCard}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={styles.levelTag}>{ex.level_number || 'Level'}</span>
                        <span style={getStatusBadgeStyle(ex.status)}>{getStatusText(ex.status)}</span>
                      </div>
                      <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#0f172a' }}>{ex.name}</h4>
                      <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
                        Phòng: <strong>{ex.slot_info?.room || 'AL-L101'}</strong> • Ca: {ex.slot_info?.slot_number || 1}
                      </div>
                      <button
                        onClick={() => handleSelectExam(ex, false)}
                        disabled={startingExamId === ex.id}
                        style={styles.miniBtn}
                      >
                        {startingExamId === ex.id ? 'Đang mở...' : 'Vào ca thi này →'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function getStatusText(status?: string): string {
  switch (status) {
    case 'IN_PROGRESS':
    case 'DEVICE_CHECK':
      return 'Đang làm dở';
    case 'SUBMITTED':
      return 'Đã nộp bài';
    case 'REVIEW_REQUIRED':
      return 'Chờ GV duyệt';
    case 'COMPLETED':
      return 'Đã hoàn thành';
    default:
      return 'Sẵn sàng vào thi';
  }
}

function getStatusBadgeStyle(status?: string): React.CSSProperties {
  switch (status) {
    case 'IN_PROGRESS':
    case 'DEVICE_CHECK':
      return {
        padding: '4px 10px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: 600,
        backgroundColor: '#fff7ed',
        color: '#c2410c',
        border: '1px solid #ffedd5',
      };
    case 'SUBMITTED':
    case 'REVIEW_REQUIRED':
    case 'COMPLETED':
      return {
        padding: '4px 10px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: 600,
        backgroundColor: '#f0fdf4',
        color: '#15803d',
        border: '1px solid #dcfce7',
      };
    default:
      return {
        padding: '4px 10px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: 600,
        backgroundColor: '#eff6ff',
        color: '#1d4ed8',
        border: '1px solid #dbeafe',
      };
  }
}

const styles: Record<string, React.CSSProperties> = {
  pageWrapper: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#0f172a',
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e2e8f0',
    borderTopColor: '#2563eb',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  navbar: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    padding: '12px 24px',
    position: 'sticky',
    top: 0,
    zIndex: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
  },
  navContainer: {
    maxWidth: '1000px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  brandIcon: {
    fontSize: '24px',
    width: '42px',
    height: '42px',
    backgroundColor: '#eff6ff',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #dbeafe',
  },
  brandTitle: {
    fontSize: '17px',
    fontWeight: 700,
    color: '#0f172a',
    letterSpacing: '-0.02em',
  },
  brandSubtitle: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: 500,
  },
  userProfile: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  userAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '14px',
  },
  userInfo: {
    textAlign: 'left',
  },
  userName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#0f172a',
  },
  userMeta: {
    fontSize: '12px',
    color: '#64748b',
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  classBadge: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
    padding: '1px 6px',
    borderRadius: '4px',
    fontWeight: 600,
  },
  logoutBtn: {
    padding: '6px 12px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  mainContent: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '32px 20px 60px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  pageTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 6px 0',
  },
  pageDesc: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
  currentDateBadge: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    padding: '8px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#475569',
    fontWeight: 500,
  },
  passCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '16px',
    padding: '28px',
    boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.05), 0 4px 6px -2px rgba(15, 23, 42, 0.02)',
  },
  passHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  levelTag: {
    backgroundColor: '#1e40af',
    color: '#ffffff',
    padding: '4px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 700,
    letterSpacing: '0.02em',
  },
  courseTag: {
    backgroundColor: '#f1f5f9',
    color: '#334155',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 600,
  },
  passCourseSection: {
    marginBottom: '24px',
    borderBottom: '1px solid #f1f5f9',
    paddingBottom: '16px',
  },
  passCourseTitle: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 6px 0',
  },
  passCourseSub: {
    fontSize: '14px',
    color: '#64748b',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  gridBox: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  gridBoxIcon: {
    fontSize: '24px',
  },
  gridBoxLabel: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: 500,
    marginBottom: '2px',
  },
  gridBoxValue: {
    fontSize: '14px',
    color: '#1e293b',
    fontWeight: 600,
  },
  gridBoxValueHighlight: {
    fontSize: '17px',
    color: '#2563eb',
    fontWeight: 700,
  },
  formatCallout: {
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '12px',
    padding: '16px 20px',
    marginBottom: '24px',
  },
  formatCalloutTitle: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#1e40af',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: '6px',
  },
  formatCalloutContent: {
    fontSize: '15px',
    color: '#1e3a8a',
    fontWeight: 600,
    marginBottom: '10px',
  },
  formatGuidelines: {
    fontSize: '13px',
    color: '#3b82f6',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    lineHeight: 1.4,
  },
  passActions: {
    display: 'flex',
    gap: '12px',
    paddingTop: '8px',
  },
  primaryBtn: {
    flex: 1,
    padding: '15px 24px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
    transition: 'all 0.15s ease',
    textAlign: 'center',
  },
  secondaryOutlineBtn: {
    padding: '15px 20px',
    backgroundColor: '#ffffff',
    color: '#334155',
    border: '1.5px solid #cbd5e1',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  secondaryBtn: {
    padding: '10px 20px',
    backgroundColor: '#f1f5f9',
    color: '#334155',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  miniCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '18px',
  },
  miniBtn: {
    width: '100%',
    padding: '8px 14px',
    backgroundColor: '#f8fafc',
    color: '#2563eb',
    border: '1px solid #bfdbfe',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '48px 24px',
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#b91c1c',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '14px',
  },
  retryBtn: {
    backgroundColor: '#ffffff',
    border: '1px solid #fca5a5',
    color: '#b91c1c',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
};

export default ExamListPage;
