'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Mic,
  Square,
  Loader2,
  Volume2,
  Activity,
  BookOpen,
  Target,
  CheckCircle2,
  AlertTriangle,
  Star,
  MessageSquare,
  Mic2,
  RefreshCw
} from 'lucide-react';

// Demo questions
const PART1_QUESTION = "Tell me about your favorite hobby. Why do you enjoy it?";
const PART2_REFERENCE = "The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet and is commonly used for typing practice.";

interface GradingResult {
  part_type: string;
  transcript: string;
  stt_confidence: number;
  score: number;
  fluency_metrics: {
    speech_rate_wps: number;
    speech_rate_status: string;
    pause_count: number;
    filled_pause_count: number;
    fluency_score: number;
  };
  pronunciation_metrics?: {
    wer: number;
    score: number;
    grade: string;
  };
  lexical_metrics?: {
    total_words: number;
    unique_words: number;
    ttr: number;
    vocabulary_level: string;
  };
  feedback: string;
}

export default function LiveGradingPage() {
  const [currentPart, setCurrentPart] = useState<'part1' | 'part2'>('part1');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<GradingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [duration, setDuration] = useState(0);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);

    } catch (err) {
      setError('Không thể truy cập microphone');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const submitAudio = useCallback(async () => {
    if (!audioBlob) return;

    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const endpoint = currentPart === 'part1'
        ? 'http://localhost:8000/api/demo/grade/part1'
        : 'http://localhost:8000/api/demo/grade/part2';

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Lỗi khi chấm điểm');
      }

      const data = await response.json();
      setResult(data);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setIsProcessing(false);
    }
  }, [audioBlob, currentPart]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const reset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setResult(null);
    setDuration(0);
    setError(null);
  };

  // Results View
  if (result) {
    const scoreColor = result.score >= 8 ? 'text-emerald-600' : result.score >= 6 ? 'text-amber-600' : 'text-red-600';
    const fluencyBg = result.fluency_metrics.speech_rate_status === 'OPTIMAL' ? 'bg-emerald-100 text-emerald-700'
      : result.fluency_metrics.speech_rate_status === 'SLOW' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';

    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <button onClick={reset} className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
          <RefreshCw className="w-4 h-4" /> Làm bài khác
        </button>

        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <div className={`text-6xl font-black ${scoreColor} mb-2`}>{result.score.toFixed(1)}</div>
          <div className="text-slate-600">{result.part_type === 'FREE_RESPONSE' ? 'Part 1: Free Response' : 'Part 2: Read Aloud'}</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Volume2 className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold">Transcript</h3>
            <span className="ml-auto text-xs text-emerald-600">STT: {(result.stt_confidence * 100).toFixed(0)}%</span>
          </div>
          <p className="text-slate-700 italic">"{result.transcript}"</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-xl border border-blue-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold">Fluency</h3>
            </div>
            <div className="text-2xl font-black mb-2">{result.fluency_metrics.speech_rate_wps.toFixed(1)} wps</div>
            <span className={`px-2 py-1 rounded text-xs font-bold ${fluencyBg}`}>
              {result.fluency_metrics.speech_rate_status === 'OPTIMAL' ? 'Tối ưu' :
               result.fluency_metrics.speech_rate_status === 'SLOW' ? 'Hơi chậm' : 'Quá chậm'}
            </span>
          </div>

          {result.pronunciation_metrics ? (
            <div className="bg-purple-50 rounded-xl border border-purple-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold">WER</h3>
              </div>
              <div className="text-3xl font-black text-purple-600">
                {(result.pronunciation_metrics.wer * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-slate-500 mt-1">{result.pronunciation_metrics.grade}</div>
            </div>
          ) : result.lexical_metrics ? (
            <div className="bg-green-50 rounded-xl border border-green-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-5 h-5 text-green-600" />
                <h3 className="font-bold">Vocabulary</h3>
              </div>
              <div className="text-3xl font-black text-green-600">{result.lexical_metrics.ttr.toFixed(2)}</div>
              <div className="text-sm text-slate-500 mt-1">TTR - {result.lexical_metrics.vocabulary_level}</div>
            </div>
          ) : null}
        </div>

        <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-amber-900">AI Feedback</h3>
          </div>
          <p className="text-amber-900">{result.feedback}</p>
        </div>
      </div>
    );
  }

  // Recording View
  const isPart1 = currentPart === 'part1';
  const bgColor = isPart1 ? 'from-blue-500 to-blue-600' : 'from-purple-500 to-purple-600';

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className={`bg-gradient-to-r ${bgColor} rounded-2xl p-6 text-white`}>
        <div className="flex items-center gap-3 mb-2">
          {isPart1 ? <MessageSquare className="w-6 h-6" /> : <Mic2 className="w-6 h-6" />}
          <h1 className="text-xl font-bold">
            {isPart1 ? 'Part 1: Free Response' : 'Part 2: Read Aloud'}
          </h1>
        </div>
        <p className="text-blue-100 text-sm">
          {isPart1 ? 'Trả lời câu hỏi về chủ đề' : 'Đọc to câu văn theo mẫu'}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-bold text-slate-500 uppercase mb-3">Câu hỏi</h2>
        <p className="text-lg text-slate-900 leading-relaxed">
          {isPart1 ? PART1_QUESTION : PART2_REFERENCE}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {!audioUrl ? (
          <div className="text-center">
            {!isRecording ? (
              <>
                <button
                  onClick={startRecording}
                  className={`w-24 h-24 rounded-full ${isPart1 ? 'bg-blue-500' : 'bg-purple-500'} text-white flex items-center justify-center mx-auto mb-4 shadow-lg hover:scale-105 transition-transform`}
                >
                  <Mic className="w-10 h-10" />
                </button>
                <p className="text-slate-600 mb-2">Nhấn để bắt đầu ghi âm</p>
              </>
            ) : (
              <>
                <div className="relative w-24 h-24 mx-auto mb-4">
                  <div className="absolute inset-0 rounded-full bg-red-500 animate-pulse" />
                  <div className={`relative w-24 h-24 rounded-full ${isPart1 ? 'bg-blue-500' : 'bg-purple-500'} text-white flex items-center justify-center shadow-lg`}>
                    <span className="text-2xl font-bold">{formatTime(duration)}</span>
                  </div>
                </div>
                <p className="text-red-600 font-semibold mb-4">Đang ghi âm...</p>
                <button
                  onClick={stopRecording}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-semibold flex items-center gap-2 mx-auto"
                >
                  <Square className="w-5 h-5" /> Dừng ghi
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <audio src={audioUrl} controls className="w-full" />
              <div className="text-sm text-slate-500 mt-2">Thời lượng: {formatTime(duration)}</div>
            </div>
            <div className="flex gap-4">
              <button onClick={reset} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold">
                Ghi lại
              </button>
              <button
                onClick={submitAudio}
                disabled={isProcessing}
                className={`flex-1 py-3 text-white rounded-xl font-semibold flex items-center justify-center gap-2 ${
                  isPart1 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'
                } disabled:opacity-50`}
              >
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                {isProcessing ? 'Đang xử lý...' : 'Nộp bài & Chấm điểm'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-center gap-4">
        <button
          onClick={() => { reset(); setCurrentPart('part1'); }}
          className={`px-4 py-2 rounded-lg font-semibold ${
            isPart1 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Part 1
        </button>
        <button
          onClick={() => { reset(); setCurrentPart('part2'); }}
          className={`px-4 py-2 rounded-lg font-semibold ${
            !isPart1 ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Part 2
        </button>
      </div>
    </div>
  );
}
