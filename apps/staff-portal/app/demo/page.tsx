'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, Square, Loader2, CheckCircle, AlertTriangle, Volume2, ArrowLeft, BookOpen } from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';

interface Exam {
  id: string;
  name: string;
  course_name?: string;
  question_count?: number;
}

interface QuestionAttempt {
  id: string;
  sequence: number;
  text: string;
  part_type?: string;
  status: string;
  reference_text?: string;
}

interface ExamSession {
  id: string;
  exam_id: string;
  exam_name: string;
  status: string;
  current_attempt?: QuestionAttempt;
  question_count: number;
}

interface Assessment {
  score: number | null;
  status: string;
  review_required: boolean;
  reasoning_summary?: string;
  transcript?: string;
  stt_confidence?: number;
  criteria?: Array<{ name: string; score: number; max_score: number; weight: number; feedback?: string }>;
  enhanced_metrics?: {
    fluency?: { score: number; speech_rate_wps: number; speech_rate_status: string; pause_count: number };
    pronunciation?: { score: number; wer: number; grade: string };
    lexical?: { ttr: number; vocabulary_level: string };
  };
}

export default function StudentDemoPage() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [session, setSession] = useState<ExamSession | null>(null);
  const [currentAttempt, setCurrentAttempt] = useState<QuestionAttempt | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [grading, setGrading] = useState(false);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [username, setUsername] = useState('student_demo');
  const [password, setPassword] = useState('StudentDemo123');
  const [loginLoading, setLoginLoading] = useState(false);

  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // API helper
  const apiCall = async (path: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers, credentials: 'include' });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${res.status}: ${text || res.statusText}`);
    }
    return res.json();
  };

  // Login
  const handleLogin = async () => {
    setLoginLoading(true);
    setError(null);
    try {
      const data = await apiCall('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      setToken(data.token);
      setUser(data.user);
      // Fetch available exams
      const examList = await apiCall('/api/exams/available');
      setExams(Array.isArray(examList) ? examList : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  // Select exam & create session
  const handleSelectExam = async (exam: Exam) => {
    setError(null);
    setSelectedExam(exam);
    try {
      // Tạo session mới
      const sess = await apiCall('/api/exam-sessions', {
        method: 'POST',
        body: JSON.stringify({ exam_id: exam.id, new_attempt: true }),
      });
      setSession(sess);

      // Start session để chuyển sang IN_PROGRESS
      try {
        const started = await apiCall(`/api/exam-sessions/${sess.id}/start`, { method: 'POST' });
        setSession(started);
        setCurrentAttempt(started.current_attempt || null);

        // Start first attempt
        if (started.current_attempt) {
          try {
            await apiCall(`/api/question-attempts/${started.current_attempt.id}/start`, { method: 'POST' });
          } catch {}
        }
      } catch (startErr: any) {
        setError(`Lỗi start session: ${startErr.message}`);
      }
      setAssessment(null);
    } catch (err: any) {
      setError(err.message);
      setSelectedExam(null);
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const localChunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) localChunks.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(localChunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
        setRecordingTime(0);
      };
      setMediaRecorder(recorder);
      chunksRef.current = localChunks;
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      // Timer
      const start = Date.now();
      const interval = setInterval(() => {
        if (recorder.state === 'recording') {
          setRecordingTime(Math.floor((Date.now() - start) / 1000));
        } else {
          clearInterval(interval);
        }
      }, 1000);
    } catch (err: any) {
      setError(`Không thể truy cập micro: ${err.message}`);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  // Upload audio to MinIO
  const uploadAudio = async (blob: Blob, attemptId: string): Promise<string> => {
    // Compute SHA256 of blob
    const buf = await blob.arrayBuffer();
    const hashBuf = await crypto.subtle.digest('SHA-256', buf);
    const sha = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');

    const initPayload = {
      attempt_id: attemptId,
      kind: 'AUDIO',
      mime_type: 'audio/webm',
      size: blob.size,
      sha256: sha,
    };
    console.log('Init upload payload:', initPayload);

    // 1. Init upload
    const initData = await apiCall('/api/uploads/init', {
      method: 'POST',
      body: JSON.stringify(initPayload),
    });

    // 2. Upload chunk (PUT /uploads/{key}/chunks/{index} với X-Chunk-Sha256)
    // Server expects raw binary data, not multipart
    const uploadHeaders: Record<string, string> = {
      'X-Chunk-Sha256': sha,
      'Content-Type': 'application/octet-stream',
    };
    if (token) uploadHeaders['Authorization'] = `Bearer ${token}`;
    const chunkRes = await fetch(`${API_BASE_URL}/api/uploads/${initData.id}/chunks/0`, {
      method: 'PUT',
      headers: uploadHeaders,
      body: buf,
      credentials: 'include',
    });
    if (!chunkRes.ok) throw new Error(`Upload chunk failed: ${chunkRes.status}`);

    // 3. Complete upload
    const completeData = await apiCall(`/api/uploads/${initData.id}/complete`, {
      method: 'POST',
      body: JSON.stringify({ total_chunks: 1 }),
    });

    return initData.id;
  };

  // Submit audio for grading
  const handleSubmit = async () => {
    console.log('handleSubmit called', { audioBlob: !!audioBlob, currentAttempt, token: !!token });
    if (!audioBlob || !currentAttempt) {
      setError('Chưa có audio hoặc attempt');
      return;
    }
    if (!token) {
      setError('Chưa đăng nhập');
      return;
    }
    if (audioBlob.size === 0) {
      setError('File ghi âm rỗng - vui lòng ghi âm lại');
      return;
    }
    setUploading(true);
    setGrading(true);
    setError(null);
    try {
      // Upload to MinIO
      const uploadId = await uploadAudio(audioBlob, currentAttempt.id);

      // Submit audio (triggers Worker STT + Grading)
      await apiCall(`/api/question-attempts/${currentAttempt.id}/submit-audio`, {
        method: 'POST',
        body: JSON.stringify({ upload_id: uploadId, kind: 'AUDIO' }),
        headers: { 'Idempotency-Key': `${currentAttempt.id}-${Date.now()}` },
      });

      // Poll for grading result
      await pollGradingResult(currentAttempt.id);
    } catch (err: any) {
      console.error('Submit error:', err);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  // Poll for grading result
  const pollGradingResult = async (attemptId: string) => {
    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const data = await apiCall(`/api/student/results/${session?.id}`);
        const att = data.attempts?.find((a: any) => a.sequence === currentAttempt?.sequence);
        if (att && (att.status === 'GRADED' || att.question_score !== null)) {
          setAssessment({
            score: att.question_score,
            status: att.status,
            review_required: att.status === 'REVIEW_REQUIRED',
            transcript: att.transcript,
            stt_confidence: att.stt_confidence,
            criteria: att.criteria,
            reasoning_summary: att.grading_message || att.reasoning,
          });
          setGrading(false);
          return;
        }
      } catch {
        // continue polling
      }
    }
    setGrading(false);
    setError('Quá thời gian chờ chấm điểm. Vui lòng thử lại.');
  };

  // Move to next question
  const handleNext = async () => {
    setError(null);
    setAudioBlob(null);
    setAudioUrl(null);
    setAssessment(null);
    try {
      // Refresh current session to get next attempt
      const refreshed = await apiCall(`/api/exam-sessions/${session!.id}`);
      if (refreshed.current_attempt) {
        setCurrentAttempt(refreshed.current_attempt);
        // Start the attempt
        try {
          await apiCall(`/api/question-attempts/${refreshed.current_attempt.id}/start`, { method: 'POST' });
        } catch {}
      } else {
        setCurrentAttempt(null);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ============ RENDER ============

  // Login screen
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <BookOpen className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Demo Thi Speaking</h1>
            <p className="text-sm text-slate-500 mt-1">AI tự động chấm điểm</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleLogin}
              disabled={loginLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
            >
              {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Đăng nhập
            </button>
            {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}
          </div>

          <div className="mt-6 p-4 bg-slate-50 rounded-xl text-xs text-slate-600">
            <strong>Demo accounts:</strong>
            <div className="mt-2 font-mono">
              student_demo / StudentDemo123
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Exam list
  if (!selectedExam) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Chào {user?.name}!</h1>
            <p className="text-sm text-slate-500 mt-1">Chọn bài thi để bắt đầu</p>
          </div>
          <div className="space-y-3">
            {exams.length === 0 && (
              <div className="bg-white p-6 rounded-2xl text-center text-slate-500">
                Bạn chưa có bài thi nào được gán.
              </div>
            )}
            {exams.map((exam) => (
              <button
                key={exam.id}
                onClick={() => handleSelectExam(exam)}
                className="w-full bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition text-left flex items-center justify-between"
              >
                <div>
                  <h3 className="font-bold text-slate-900">{exam.name}</h3>
                  {exam.course_name && <p className="text-sm text-slate-500 mt-1">{exam.course_name}</p>}
                </div>
                <div className="text-blue-600 font-semibold text-sm">Bắt đầu →</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Result screen
  if (assessment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900">Đã chấm xong!</h1>
            <p className="text-sm text-slate-500 mt-1">Câu {currentAttempt?.sequence}</p>
            <div className="mt-6">
              <div className="text-6xl font-black text-blue-600">{assessment.score?.toFixed(1) || '0.0'}</div>
              <div className="text-sm text-slate-500 mt-1">/ 10 điểm</div>
            </div>
            {assessment.review_required && (
              <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-800">
                ⚠️ Cần giảng viên xem xét
              </div>
            )}
          </div>

          {assessment.transcript && (
            <div className="bg-white rounded-2xl shadow p-6">
              <h3 className="text-sm font-bold text-slate-600 uppercase mb-2">📝 Transcript</h3>
              <p className="text-slate-800 italic bg-slate-50 p-4 rounded-lg">"{assessment.transcript}"</p>
              {assessment.stt_confidence && (
                <p className="text-xs text-emerald-600 mt-2">
                  STT Confidence: {(assessment.stt_confidence * 100).toFixed(1)}%
                </p>
              )}
            </div>
          )}

          {assessment.criteria && assessment.criteria.length > 0 && (
            <div className="bg-white rounded-2xl shadow p-6">
              <h3 className="text-sm font-bold text-slate-600 uppercase mb-3">📊 Điểm theo tiêu chí</h3>
              <div className="space-y-2">
                {assessment.criteria.map((c, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm font-medium text-slate-700">{c.name}</span>
                    <span className="text-sm font-bold text-blue-600">{c.score.toFixed(1)}/{c.max_score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {assessment.reasoning_summary && (
            <div className="bg-white rounded-2xl shadow p-6">
              <h3 className="text-sm font-bold text-slate-600 uppercase mb-2">💬 AI Nhận xét</h3>
              <p className="text-slate-700 text-sm leading-relaxed">{assessment.reasoning_summary}</p>
            </div>
          )}

          <button
            onClick={handleNext}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl"
          >
            Câu tiếp theo →
          </button>
        </div>
      </div>
    );
  }

  // Exam room - recording
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={() => { setSelectedExam(null); setSession(null); setCurrentAttempt(null); }} className="p-2 hover:bg-slate-200 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h1 className="text-lg font-bold text-slate-900">{session?.exam_name}</h1>
          <div className="text-sm text-slate-500">Câu {currentAttempt?.sequence}/{session?.question_count}</div>
        </div>

        {/* Question card */}
        {currentAttempt ? (
          <div className="bg-white rounded-2xl shadow p-6">
            <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded mb-3">
              {currentAttempt.part_type === 'READ_ALOUD' ? '📖 Đọc to' : '💬 Tự luận'}
            </span>
            <h2 className="text-lg font-semibold text-slate-900 leading-relaxed">{currentAttempt.text}</h2>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow p-8 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-slate-900">Hoàn thành bài thi!</h2>
            <p className="text-sm text-slate-500 mt-2">Tất cả câu hỏi đã được nộp. Giảng viên sẽ xem xét kết quả.</p>
            <button
              onClick={async () => {
                try { await apiCall(`/api/exam-sessions/${session!.id}/finish`, { method: 'POST' }); } catch {}
                setSelectedExam(null); setSession(null);
              }}
              className="mt-6 px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl"
            >
              Về danh sách bài thi
            </button>
          </div>
        )}

        {/* Recording area */}
        {currentAttempt && (
          <div className="bg-white rounded-2xl shadow p-6 space-y-4">
            {/* Timer */}
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900">
                {Math.floor(recordingTime / 60).toString().padStart(2, '0')}:{(recordingTime % 60).toString().padStart(2, '0')}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {isRecording ? '🔴 Đang ghi âm...' : audioBlob ? '✅ Đã ghi xong' : 'Sẵn sàng'}
              </div>
            </div>

            {/* Audio preview */}
            {audioUrl && (
              <div className="bg-slate-50 p-3 rounded-xl">
                <audio src={audioUrl} controls className="w-full" />
              </div>
            )}

            {/* Controls */}
            <div className="flex gap-3">
              {!isRecording && !audioBlob && (
                <button
                  onClick={startRecording}
                  className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl flex items-center justify-center gap-2"
                >
                  <Mic className="w-5 h-5" />
                  Bắt đầu ghi âm
                </button>
              )}
              {isRecording && (
                <button
                  onClick={stopRecording}
                  className="flex-1 py-4 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-2"
                >
                  <Square className="w-5 h-5" />
                  Dừng ghi âm
                </button>
              )}
              {audioBlob && !uploading && !grading && (
                <>
                  <button
                    onClick={() => { setAudioBlob(null); setAudioUrl(null); }}
                    className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                  >
                    Ghi lại
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-2"
                  >
                    📤 Nộp bài
                  </button>
                </>
              )}
            </div>

            {/* Status */}
            {(uploading || grading) && (
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
                <p className="text-sm text-blue-700 mt-2 font-medium">
                  {uploading ? 'Đang upload audio lên MinIO...' : 'Đang chấm điểm bằng AI...'}
                </p>
                {grading && <p className="text-xs text-slate-500 mt-1">Whisper STT → Fluency + WER → LLM Grading</p>}
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 inline mr-1" /> {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
