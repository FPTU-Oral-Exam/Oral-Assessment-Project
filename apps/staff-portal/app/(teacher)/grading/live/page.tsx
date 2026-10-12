'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Mic,
  Square,
  Loader2,
  Volume2,
  Activity,
  Target,
  CheckCircle2,
  AlertTriangle,
  Star,
  Mic2,
  RefreshCw,
  Info,
  BookOpen,
  Headphones,
  HelpCircle
} from 'lucide-react';
import { PTEScoreAnalysisModal, PTEScoreAnalysisData } from '../components/PTEScoreAnalysisModal';
import { PTEAudioPlayer } from '../components/PTEAudioPlayer';

// PTE Academic Official Demo Read Aloud Reference Text
const PTE_PART1_RA_TEXT = "Before the discovery of Australia, people in the old world were convinced that all swans were white, an unassailable belief as it seemed completely confirmed by empirical evidence. The sighting of the first black swan might have been an interesting surprise for a few scientists, but that is not where the significance of the story lies.";

// PTE Academic Official Demo Repeat Sentence Reference Text (From Image)
const PTE_PART2_RS_TEXT = "At that time, people moved from towns to villages.";

// PTE Academic Official Demo Describe Image Sample & Image
const PTE_PART3_DI_IMAGE = "/images/air_composition_pie_chart.svg";
const PTE_PART3_DI_SAMPLE = (
  "The pie chart represents the approximate composition of the air. " +
  "As we can see from the chart there are oxygen, other gases, and nitrogen in the atmosphere. " +
  "In addition, Nitrogen is the first most abundant gas in the atmosphere which occupies 79%, " +
  "followed by Oxygen which is 20%. In terms of other gases, it includes carbon dioxide, argon, " +
  "and water vapor have a proportion of 1%. In conclusion, the chart is very useful since it " +
  "clearly shows the composition of the air."
);

// PTE Academic Official Demo Re-tell Lecture Constants
const PTE_PART4_RL_AUDIO = "/audio/pte_rl_prompt.mp3";
const PTE_PART4_RL_TEXT = (
  "I want to talk about young people and structure. This was last Wednesday afternoon at a school in Brooklyn, New York. " +
  "The trick I play in all of my school appearances is that when I get through with my little homily to the kids, " +
  "I then invite them to ask questions, and when they raise their hands, I say, 'Come up,' and I make them come up and stand in front of me. " +
  "I make them stand at attention like a soldier. Put your arms straight down at your side, look up, open your eyes, stare straight ahead, " +
  "and speak out your question loudly so everybody can hear. In the army, we put them in an environment of structure, put them in ranks, " +
  "make them all wear the same clothes, cut all their hair off. We teach them how to go right face, left face, so they can obey instructions " +
  "and know the consequences of not obeying instructions. It gives them structure and maturity. We need more of this kind of structure and respect."
);
const PTE_PART4_RL_SAMPLE = (
  "The speaker discussed young people and the importance of structure in schools and education. " +
  "Drawing from his military background, he explained that in the army, soldiers wear uniform clothes and stand in ranks, " +
  "which instills discipline, obedience, and maturity. In conclusion, having more structure and respect is essential for young people."
);

// PTE Academic Official Demo Answer Short Question Constants
const PTE_PART5_ASQ_QUESTION = "A specialist who repairs leaking water pipes is called as?";
const PTE_PART5_ASQ_TARGETS = "plumber, a plumber";

interface PTESkillScore {
  score: number;
  max_score: number;
  comment: string;
}

interface PTEToken {
  word: string;
  is_correct?: boolean;
  is_matched?: boolean;
  is_relevant?: boolean;
  status?: string;
}

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
    grade_description?: string;
    feedback?: string;
  };
  lexical_metrics?: {
    total_words: number;
    unique_words: number;
    ttr: number;
    vocabulary_level: string;
  };
  feedback: string;
  // PTE Academic Enhancements
  scores?: {
    content?: PTESkillScore;
    oral_fluency?: PTESkillScore;
    pronunciation?: PTESkillScore;
  };
  overall?: {
    total_points: number;
    max_points: number;
    score_10: number;
    score_90: number;
    score_100: number;
  };
  student_tokens?: PTEToken[];
  reference_tokens?: PTEToken[];
  reference_text?: string;
  sample_answer?: string;
  image_url?: string;
  prompt_audio_url?: string;
  real_audio_url?: string;
  alignment_stats?: {
    matched_words?: number;
    total_reference_words?: number;
    total_student_words?: number;
    recall_percentage?: number;
    wer?: number;
    matched_keywords_count?: number;
    total_keywords?: number;
  };
}

export default function LiveGradingPage() {
  const [currentPart, setCurrentPart] = useState<'part1' | 'part2' | 'part3' | 'part4' | 'part5'>('part1');
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

  const isPart1 = currentPart === 'part1';
  const isPart2 = currentPart === 'part2';
  const isPart3 = currentPart === 'part3';
  const isPart4 = currentPart === 'part4';
  const isPart5 = currentPart === 'part5';

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

      let endpoint = 'http://localhost:8000/api/demo/grade/part1';
      if (currentPart === 'part2') {
        endpoint = 'http://localhost:8000/api/demo/grade/part2';
        formData.append('reference_text', PTE_PART2_RS_TEXT);
      } else if (currentPart === 'part3') {
        endpoint = 'http://localhost:8000/api/demo/grade/part3';
        formData.append('sample_answer', PTE_PART3_DI_SAMPLE);
        formData.append('image_url', PTE_PART3_DI_IMAGE);
      } else if (currentPart === 'part4') {
        endpoint = 'http://localhost:8000/api/demo/grade/part4';
        formData.append('lecture_transcript', PTE_PART4_RL_TEXT);
        formData.append('sample_notes', PTE_PART4_RL_SAMPLE);
      } else if (currentPart === 'part5') {
        endpoint = 'http://localhost:8000/api/demo/grade/part5';
        formData.append('question_text', PTE_PART5_ASQ_QUESTION);
        formData.append('target_answers', PTE_PART5_ASQ_TARGETS);
      } else {
        formData.append('reference_text', PTE_PART1_RA_TEXT);
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Lỗi khi chấm điểm');
      }

      const data: GradingResult = await response.json();
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

  // ==========================================
  // RESULTS VIEW: PTE AI SCORE ANALYSIS MODAL
  // ==========================================
  if (result) {
    const pteData: PTEScoreAnalysisData = {
      part_type: result.part_type,
      transcript: result.transcript,
      reference_text: result.reference_text || (isPart1 ? PTE_PART1_RA_TEXT : isPart2 ? PTE_PART2_RS_TEXT : isPart4 ? PTE_PART4_RL_TEXT : isPart5 ? PTE_PART5_ASQ_QUESTION : undefined),
      sample_answer: result.sample_answer || (isPart3 ? PTE_PART3_DI_SAMPLE : isPart4 ? PTE_PART4_RL_SAMPLE : isPart5 ? PTE_PART5_ASQ_TARGETS : undefined),
      image_url: result.image_url || (isPart3 ? PTE_PART3_DI_IMAGE : undefined),
      prompt_audio_url: result.prompt_audio_url || (isPart4 ? PTE_PART4_RL_AUDIO : undefined),
      scores: result.scores,
      overall: result.overall,
      student_tokens: result.student_tokens,
      reference_tokens: result.reference_tokens,
      student_audio_url: audioUrl || undefined,
      real_audio_url: result.real_audio_url || (isPart1 ? '/audio/pte_ra_prompt.wav' : isPart2 ? '/audio/pte_rs_prompt.wav' : isPart4 ? PTE_PART4_RL_AUDIO : undefined),
      alignment_stats: result.alignment_stats,
    };

    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
        {/* Top Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg shadow-2xs hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Làm lại bài thi
          </button>
          <span className="text-xs text-slate-500 font-medium">
            Mô phỏng 100% giao diện chấm thi PTE Success
          </span>
        </div>

        {/* PTE Score Analysis Card */}
        <div className="flex justify-center">
          <PTEScoreAnalysisModal data={pteData} onClose={reset} />
        </div>
      </div>
    );
  }

  // ==========================================
  // RECORDING VIEW: PTE SPEAKING QUESTION
  // ==========================================
  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Tab Switcher */}
      <div className="flex p-1 bg-slate-100 rounded-xl max-w-lg mx-auto">
        <button
          onClick={() => { reset(); setCurrentPart('part1'); }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            isPart1 ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Part 1: RA
        </button>
        <button
          onClick={() => { reset(); setCurrentPart('part2'); }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            isPart2 ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Part 2: RS
        </button>
        <button
          onClick={() => { reset(); setCurrentPart('part3'); }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            isPart3 ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Part 3: DI
        </button>
        <button
          onClick={() => { reset(); setCurrentPart('part4'); }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            isPart4 ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Part 4: RL
        </button>
        <button
          onClick={() => { reset(); setCurrentPart('part5'); }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            isPart5 ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Part 5: ASQ
        </button>
      </div>

      {/* Header Banner */}
      <div className={`bg-gradient-to-r ${
        isPart1
          ? 'from-blue-600 to-indigo-600'
          : isPart2
          ? 'from-indigo-600 to-purple-600'
          : isPart3
          ? 'from-emerald-600 to-teal-700'
          : isPart4
          ? 'from-purple-600 to-violet-700'
          : 'from-amber-600 to-orange-600'
      } rounded-2xl p-6 text-white shadow-sm`}>
        <div className="flex items-center gap-3 mb-1.5">
          {isPart1 ? (
            <Mic2 className="w-6 h-6 text-blue-200" />
          ) : isPart2 ? (
            <Headphones className="w-6 h-6 text-purple-200" />
          ) : isPart3 ? (
            <Activity className="w-6 h-6 text-emerald-200" />
          ) : isPart4 ? (
            <BookOpen className="w-6 h-6 text-purple-200" />
          ) : (
            <HelpCircle className="w-6 h-6 text-amber-200" />
          )}
          <h1 className="text-lg font-bold">
            {isPart1
              ? 'PTE Academic - Part 1: Read Aloud (RA)'
              : isPart2
              ? 'PTE Academic - Part 2: Repeat Sentence (RS)'
              : isPart3
              ? 'PTE Academic - Part 3: Describe Image (DI)'
              : isPart4
              ? 'PTE Academic - Part 4: Re-tell Lecture (RL)'
              : 'PTE Academic - Part 5: Answer Short Question (ASQ)'}
          </h1>
        </div>
        <p className="text-white/90 text-xs">
          {isPart1
            ? 'Đọc to đoạn văn học thuật. AI chấm 3 tiêu chí: Content (0-5), Oral Fluency (0-5), Pronunciation (0-5).'
            : isPart2
            ? 'Lặp lại chính xác câu nghe được. AI chấm 3 tiêu chí: Content (0-3), Oral Fluency (0-5), Pronunciation (0-5).'
            : isPart3
            ? 'Mô tả chi tiết biểu đồ/hình ảnh trong 40 giây. AI chấm 3 tiêu chí: Content (0-6), Oral Fluency (0-5), Pronunciation (0-5).'
            : isPart4
            ? 'Nghe bài giảng và thuật lại nội dung chính trong 40 giây. AI chấm 3 tiêu chí: Content (0-6), Oral Fluency (0-5), Pronunciation (0-5).'
            : 'Nghe câu hỏi và trả lời ngắn gọn trong 1-2 từ. AI chấm 3 tiêu chí: Content/Vocabulary (0-1), Oral Fluency (0-5), Pronunciation (0-5).'}
        </p>
      </div>

      {/* Official PTE Instruction Box */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
        {/* Chrome advisory banner matching PTE screenshot */}
        <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-lg text-xs text-amber-900 flex items-start justify-between gap-2">
          <span>
            <strong>Note from PTE Success:</strong> We recommend using <strong>Chrome</strong> browser for the best compatibility with the microphone and audio.
          </span>
        </div>

        <p className="text-xs font-semibold text-slate-700 italic">
          {isPart1
            ? 'Look at the text below. In 40 seconds, you must read this text aloud as naturally and clearly as possible. You have 40 seconds to read.'
            : isPart2
            ? 'sentence. Please repeat the sentence exactly as you hear it. The microphone will stop after 3 seconds of silence!'
            : isPart3
            ? 'image is showing. You will have 40 seconds to give your response. The microphone will stop after 3 seconds of silence!'
            : isPart4
            ? 'You will hear a lecture. After listening to the lecture, in 10 seconds, please retell what you have heard in your own words. You have 40 seconds to speak.'
            : 'You will hear a question. Please give a simple and short answer. Often just one or a few words is enough.'}
        </p>

        {/* For Part 2 RS: Prompt audio player */}
        {isPart2 && (
          <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-2">
            <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
              <Headphones className="w-4 h-4 text-indigo-600" />
              Real audio (Audio gốc đề bài - Nghe trước khi lặp lại):
            </span>
            <PTEAudioPlayer
              src="/audio/pte_rs_prompt.wav"
              hasStop={true}
              hasSpeed={true}
              defaultDuration={3}
            />
          </div>
        )}

        {/* For Part 4 RL: Lecture audio player */}
        {isPart4 && (
          <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-100 space-y-3">
            <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
              <Headphones className="w-4 h-4 text-purple-600" />
              Lecture Audio (Nghe bài giảng trước khi thuật lại):
            </span>
            <PTEAudioPlayer
              src={PTE_PART4_RL_AUDIO}
              hasStop={true}
              hasSpeed={true}
              defaultDuration={60}
            />
            <details className="text-xs text-slate-500 pt-1">
              <summary className="cursor-pointer font-semibold text-purple-700 hover:text-purple-900">
                Xem gợi ý Transcript bài giảng
              </summary>
              <p className="mt-2 p-3 bg-white rounded-lg border border-purple-100 text-slate-700 leading-relaxed font-serif text-[13px]">
                {PTE_PART4_RL_TEXT}
              </p>
            </details>
          </div>
        )}

        {/* For Part 5 ASQ: Question card & hint */}
        {isPart5 && (
          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-3">
            <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-amber-600" />
              Question Prompt (Câu hỏi đề bài):
            </span>
            <p className="text-base text-slate-800 font-serif font-medium">
              "{PTE_PART5_ASQ_QUESTION}"
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-lg border border-amber-200 text-xs text-amber-800 font-medium">
              <span>💡 Target Answer:</span>
              <span className="font-bold">{PTE_PART5_ASQ_TARGETS}</span>
            </div>
          </div>
        )}

        {/* For Part 3 DI: Image Display */}
        {isPart3 ? (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-white border border-slate-200 flex justify-center shadow-2xs">
              <img
                src={PTE_PART3_DI_IMAGE}
                alt="Composition of the Air Pie Chart"
                className="max-h-72 w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        ) : isPart4 || isPart5 ? null : (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-base text-slate-800 leading-relaxed font-serif">
              {isPart1 ? PTE_PART1_RA_TEXT : PTE_PART2_RS_TEXT}
            </p>
          </div>
        )}
      </div>

      {/* Recording Area */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-xs flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!audioUrl ? (
          <div className="text-center py-2">
            {!isRecording ? (
              <>
                <button
                  onClick={startRecording}
                  className={`w-20 h-20 rounded-full ${
                    isPart1
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : isPart2
                      ? 'bg-indigo-600 hover:bg-indigo-700'
                      : isPart3
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : isPart4
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  } text-white flex items-center justify-center mx-auto mb-3 shadow-md hover:scale-105 transition-transform`}
                >
                  <Mic className="w-8 h-8" />
                </button>
                <p className="text-xs font-medium text-slate-600">
                  {isPart4
                    ? 'Bấm nút Micro để bắt đầu thuật lại bài giảng'
                    : isPart5
                    ? 'Bấm nút Micro để bắt đầu trả lời câu hỏi'
                    : 'Bấm nút Micro để bắt đầu thu âm'}
                </p>
              </>
            ) : (
              <>
                <div className="relative w-20 h-20 mx-auto mb-3">
                  <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-30" />
                  <div className="relative w-20 h-20 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md">
                    <span className="text-xl font-bold font-mono">{formatTime(duration)}</span>
                  </div>
                </div>
                <p className="text-xs font-bold text-red-600 mb-3 animate-pulse">Đang ghi âm...</p>
                <button
                  onClick={stopRecording}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-2 mx-auto"
                >
                  <Square className="w-4 h-4" /> Dừng ghi âm
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between">
              <audio src={audioUrl} controls className="h-8 max-w-sm" />
              <div className="text-xs font-semibold text-slate-500">
                Thời lượng: {formatTime(duration)}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={reset}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                Ghi lại
              </button>
              <button
                onClick={submitAudio}
                disabled={isProcessing}
                className={`flex-1 py-2.5 ${
                  isPart1
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : isPart2
                    ? 'bg-indigo-600 hover:bg-indigo-700'
                    : isPart3
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : isPart4
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : 'bg-amber-600 hover:bg-orange-700'
                } text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors shadow-2xs`}
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {isProcessing ? 'AI đang chấm điểm...' : 'Nộp bài & Chấm điểm'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
