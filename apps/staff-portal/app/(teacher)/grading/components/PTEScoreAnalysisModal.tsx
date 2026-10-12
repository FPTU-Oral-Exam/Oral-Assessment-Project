'use client';

import { useState } from 'react';
import { Info, X } from 'lucide-react';
import { PTEAudioPlayer } from './PTEAudioPlayer';

export interface PTESkillScore {
  score: number;
  max_score: number;
  comment: string;
}

export interface PTEToken {
  word: string;
  is_correct?: boolean;
  is_matched?: boolean;
  is_relevant?: boolean;
  status?: string;
}

export interface PTEScoreAnalysisData {
  part_type: string;
  transcript: string;
  reference_text?: string;
  sample_answer?: string;
  image_url?: string;
  keywords?: string[];
  matched_keywords?: string[];
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
  student_audio_url?: string;
  real_audio_url?: string;
  prompt_audio_url?: string;
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

interface PTEScoreAnalysisModalProps {
  data: PTEScoreAnalysisData;
  onClose?: () => void;
  isModal?: boolean;
}

export function PTEScoreAnalysisModal({
  data,
  onClose,
  isModal = false,
}: PTEScoreAnalysisModalProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const isRS = data.part_type.includes('REPEAT_SENTENCE') || data.part_type.includes('RS');
  const isDI = data.part_type.includes('DESCRIBE_IMAGE') || data.part_type.includes('DI');
  const isRL = data.part_type.includes('RETELL_LECTURE') || data.part_type.includes('RL');
  const isASQ = data.part_type.includes('ANSWER_SHORT_QUESTION') || data.part_type.includes('ASQ');
  const isSGD = data.part_type.includes('SUMMARIZE_GROUP_DISCUSSION') || data.part_type.includes('SGD');

  // Tooltip content for enabling skills
  const tooltips: Record<string, string> = {
    content: isSGD
      ? 'Content assesses how accurately you synthesize multiple speaker perspectives, central topic, and ethical/practical solutions from the group discussion (0-6 scale).'
      : isASQ
      ? 'Content assesses vocabulary accuracy. 1/1 for appropriate word choice, 0/1 for incorrect response.'
      : isRL
      ? 'Content assesses how accurately and thoroughly you convey the ideas, aspects, and developments of the lecture (0-6 scale).'
      : isDI
      ? 'Content assesses description of key features, relationships, and conclusion of the image (0-6 scale).'
      : isRS
      ? 'Content assesses word sequence accuracy. 3/3: >=85% words in sequence, 2/3: >=50% words in sequence, 1/3: <50% words.'
      : 'Content assesses accurate reading of all words in the passage.',
    oral_fluency:
      'Oral fluency assesses smooth rhythm, speech rate, and phrasing with no awkward hesitations, repetitions, or false starts.',
    pronunciation:
      'Pronunciation assesses whether speech sounds are intelligible to English speakers and vowels/consonants are clear.',
  };

  const cardContent = (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden max-w-2xl w-full text-slate-800 font-sans">
      {/* Modal / Card Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">AI Score analysis</h2>
        <div className="flex items-center gap-2">
          {data.overall && (
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
              PTE: {data.overall.score_90} / 90
            </span>
          )}
          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Enabling Skill Table */}
      {data.scores && (
        <div className="px-6 py-2">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-medium">
                <th className="py-2.5 pr-4 w-36">Enabling skill</th>
                <th className="py-2.5 px-3 w-16 text-center">Score</th>
                <th className="py-2.5 pl-4">Comment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Content Row */}
              <tr>
                <td className="py-3 pr-4 font-normal text-slate-800">
                  <span className="inline-flex items-center gap-1.5">
                    Content
                    <button
                      type="button"
                      onClick={() =>
                        setActiveTooltip(activeTooltip === 'content' ? null : 'content')
                      }
                      className="text-blue-500 hover:text-blue-700 transition-colors"
                      title={tooltips.content}
                    >
                      <Info className="w-3.5 h-3.5 fill-blue-500 text-white" />
                    </button>
                  </span>
                  {activeTooltip === 'content' && (
                    <div className="text-[11px] text-slate-500 mt-1 p-2 bg-slate-50 rounded border border-slate-200">
                      {tooltips.content}
                    </div>
                  )}
                </td>
                <td className="py-3 px-3 font-bold text-slate-900 text-sm text-center">
                  {data.scores.content?.score ?? '-'}/{data.scores.content?.max_score ?? (isASQ ? 1 : isDI || isRL || isSGD ? 6 : isRS ? 3 : 5)}
                </td>
                <td className="py-3 pl-4 text-slate-700 leading-relaxed text-[13px]">
                  {data.scores.content?.comment || 'All or almost all words in sequence.'}
                </td>
              </tr>

              {/* Oral Fluency Row */}
              <tr>
                <td className="py-3 pr-4 font-normal text-slate-800">
                  <span className="inline-flex items-center gap-1.5">
                    Oral fluency
                    <button
                      type="button"
                      onClick={() =>
                        setActiveTooltip(activeTooltip === 'oral_fluency' ? null : 'oral_fluency')
                      }
                      className="text-blue-500 hover:text-blue-700 transition-colors"
                      title={tooltips.oral_fluency}
                    >
                      <Info className="w-3.5 h-3.5 fill-blue-500 text-white" />
                    </button>
                  </span>
                  {activeTooltip === 'oral_fluency' && (
                    <div className="text-[11px] text-slate-500 mt-1 p-2 bg-slate-50 rounded border border-slate-200">
                      {tooltips.oral_fluency}
                    </div>
                  )}
                </td>
                <td className="py-3 px-3 font-bold text-slate-900 text-sm text-center">
                  {data.scores.oral_fluency?.score ?? '-'}/{data.scores.oral_fluency?.max_score ?? 5}
                </td>
                <td className="py-3 pl-4 text-slate-700 leading-relaxed text-[13px]">
                  {data.scores.oral_fluency?.comment || 'Great fluency!'}
                </td>
              </tr>

              {/* Pronunciation Row */}
              <tr>
                <td className="py-3 pr-4 font-normal text-slate-800">
                  <span className="inline-flex items-center gap-1.5">
                    Pronunciation
                    <button
                      type="button"
                      onClick={() =>
                        setActiveTooltip(activeTooltip === 'pronunciation' ? null : 'pronunciation')
                      }
                      className="text-blue-500 hover:text-blue-700 transition-colors"
                      title={tooltips.pronunciation}
                    >
                      <Info className="w-3.5 h-3.5 fill-blue-500 text-white" />
                    </button>
                  </span>
                  {activeTooltip === 'pronunciation' && (
                    <div className="text-[11px] text-slate-500 mt-1 p-2 bg-slate-50 rounded border border-slate-200">
                      {tooltips.pronunciation}
                    </div>
                  )}
                </td>
                <td className="py-3 px-3 font-bold text-slate-900 text-sm text-center">
                  {data.scores.pronunciation?.score ?? '-'}/{data.scores.pronunciation?.max_score ?? 5}
                </td>
                <td className="py-3 pl-4 text-slate-700 leading-relaxed text-[13px]">
                  {data.scores.pronunciation?.comment || 'Great pronunciation!'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Audio & Word Highlight Comparison Section */}
      <div className="p-6 space-y-6 border-t border-slate-100">
        {/* 1. YOUR ANSWER */}
        <div className="space-y-2.5">
          <h3 className="text-sm font-bold text-slate-900">Your answer:</h3>

          {/* Student Audio Player */}
          {data.student_audio_url ? (
            <PTEAudioPlayer src={data.student_audio_url} />
          ) : (
            <span className="text-xs text-slate-400 italic">Chưa có bản ghi âm thí sinh</span>
          )}

          {/* Legend */}
          {isDI || isRL || isSGD ? (
            <div className="flex items-center gap-5 text-xs font-semibold pt-1">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                Relevant keywords
              </span>
            </div>
          ) : isASQ ? (
            <div className="flex items-center gap-5 text-xs font-semibold pt-1">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                Target word match
              </span>
              <span className="flex items-center gap-1.5 text-red-600">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                Other / filler words
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-5 text-xs font-semibold pt-1">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                Correct words
              </span>
              <span className="flex items-center gap-1.5 text-red-600">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                Incorrect words
              </span>
            </div>
          )}

          {/* Tokenized Student Answer */}
          <div className="text-[15px] leading-relaxed pt-1">
            {data.student_tokens && data.student_tokens.length > 0 ? (
              data.student_tokens.map((token, idx) => (
                <span
                  key={idx}
                  className={
                    isDI || isRL || isSGD
                      ? token.is_relevant || token.status === 'relevant'
                        ? 'text-[#16a34a] font-normal'
                        : 'text-slate-800 font-normal'
                      : token.is_correct
                      ? 'text-[#16a34a] font-normal'
                      : 'text-[#dc2626] font-normal'
                  }
                >
                  {token.word}{' '}
                </span>
              ))
            ) : (
              <span className="text-slate-800">{data.transcript}</span>
            )}
          </div>
        </div>

        {/* 2. REAL AUDIO, PROMPT LECTURE, DISCUSSION, or SAMPLE ANSWER */}
        {isSGD ? (
          <div className="space-y-4 pt-2">
            <div className="space-y-2.5">
              <h3 className="text-sm font-bold text-slate-900">Group discussion audio:</h3>
              <PTEAudioPlayer
                src={data.prompt_audio_url || '/audio/pte_sgd_prompt.mp3'}
                hasStop={true}
                hasSpeed={true}
                defaultDuration={90}
              />
            </div>

            {/* Sample Notes Box */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-900">Sample summary notes:</h3>
              <div className="text-[14px] leading-relaxed text-slate-800 bg-slate-50/90 p-4 rounded-xl border border-slate-200/80 whitespace-pre-line select-text">
                {data.sample_answer || 'Sample summary not provided'}
              </div>
            </div>

            {/* Reference Multi-speaker Discussion Script */}
            {data.reference_text && (
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900">Discussion transcript (Multi-speaker):</h3>
                <div className="text-[13px] leading-relaxed text-slate-600 bg-slate-50/60 p-3 rounded-xl border border-slate-200/60 max-h-48 overflow-y-auto whitespace-pre-line select-text font-serif">
                  {data.reference_text}
                </div>
              </div>
            )}
          </div>
        ) : isRL ? (
          <div className="space-y-4 pt-2">
            <div className="space-y-2.5">
              <h3 className="text-sm font-bold text-slate-900">Lecture audio:</h3>
              <PTEAudioPlayer
                src={data.prompt_audio_url || data.real_audio_url || '/audio/pte_rl_prompt.mp3'}
                hasStop={true}
                hasSpeed={true}
                defaultDuration={60}
              />
            </div>

            {/* Sample Notes Box */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-900">Sample notes & key points:</h3>
              <div className="text-[14px] leading-relaxed text-slate-800 bg-slate-50/90 p-4 rounded-xl border border-slate-200/80 whitespace-pre-line select-text">
                {data.sample_answer || 'Sample notes not provided'}
              </div>
            </div>

            {/* Reference Lecture Transcript */}
            {data.reference_text && (
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900">Lecture transcript:</h3>
                <div className="text-[13px] leading-relaxed text-slate-600 bg-slate-50/60 p-3 rounded-xl border border-slate-200/60 max-h-40 overflow-y-auto select-text">
                  {data.reference_text}
                </div>
              </div>
            )}
          </div>
        ) : isDI ? (
          <div className="space-y-4 pt-2">
            {/* Sample Answer Box */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-900">Sample answer:</h3>
              <div className="text-[14px] leading-relaxed text-slate-800 bg-slate-50/90 p-4 rounded-xl border border-slate-200/80 select-text">
                {data.sample_answer || data.reference_text || 'Sample answer not provided'}
              </div>
            </div>

            {/* Prompt Diagram Image */}
            {data.image_url && (
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900">Prompt image:</h3>
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-white flex justify-center p-3 shadow-2xs">
                  <img
                    src={data.image_url}
                    alt="Prompt Diagram"
                    className="max-h-64 w-auto object-contain rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>
        ) : isASQ ? (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-900">Question prompt:</h3>
              <div className="text-[14px] leading-relaxed text-slate-800 bg-slate-50/90 p-4 rounded-xl border border-slate-200/80 select-text">
                {data.reference_text || 'Question prompt not provided'}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-900">Target answer(s):</h3>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium text-sm">
                <span>🎯</span>
                <span>{data.sample_answer || 'plumber, a plumber'}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5 pt-2">
            <h3 className="text-sm font-bold text-slate-900">Real audio:</h3>

            {/* Real Prompt Audio Player with Stop & Speed Control */}
            {data.real_audio_url ? (
              <PTEAudioPlayer
                src={data.real_audio_url}
                hasStop={true}
                hasSpeed={true}
                defaultDuration={3}
              />
            ) : (
              <span className="text-xs text-slate-400 italic">Chưa có audio đề bài gốc</span>
            )}

            {/* Tokenized Reference Prompt (Matched = Green, Unmatched = Red) */}
            <div className="text-[15px] leading-relaxed pt-1">
              {data.reference_tokens && data.reference_tokens.length > 0 ? (
                data.reference_tokens.map((token, idx) => (
                  <span
                    key={idx}
                    className={
                      token.is_matched
                        ? 'text-[#16a34a] font-normal'
                        : 'text-[#dc2626] font-normal'
                    }
                  >
                    {token.word}{' '}
                  </span>
                ))
              ) : (
                <span className="text-slate-800">{data.reference_text}</span>
              )}
            </div>
          </div>
        )}

        {/* Modal Action Footer */}
        <div className="flex justify-end pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-xs transition-colors"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-fade-in">
        {cardContent}
      </div>
    );
  }

  return cardContent;
}
