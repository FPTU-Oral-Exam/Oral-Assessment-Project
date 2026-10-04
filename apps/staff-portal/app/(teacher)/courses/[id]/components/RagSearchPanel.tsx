'use client';

import React, { useState } from 'react';
import {
  Search,
  Sparkles,
  BookOpen,
  FileText,
  AlertCircle,
  Copy,
  Check,
  Loader2,
  HelpCircle,
  Layers,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Topic } from './TopicsPanel';

export interface RagChunk {
  id: string;
  content: string;
  document_id: string;
  page: number;
  topic_id?: string | null;
  learning_outcome_id?: string | null;
  heading?: string | null;
}

interface RagSearchPanelProps {
  courseId: string;
  topics: Topic[];
}

export default function RagSearchPanel({ courseId, topics }: RagSearchPanelProps) {
  const [selectedTopicId, setSelectedTopicId] = useState<string>(
    topics[0]?.id || ''
  );
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<RagChunk[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTopicId) {
      setError('Vui lòng chọn một chủ đề trước khi tìm kiếm.');
      return;
    }
    if (!query.trim()) {
      setError('Vui lòng nhập nội dung cần tra cứu.');
      return;
    }

    setError(null);
    setIsSearching(true);
    try {
      const chunks = await api<RagChunk[]>(
        `/admin/courses/${courseId}/rag?topic_id=${selectedTopicId}&q=${encodeURIComponent(
          query.trim()
        )}`
      );
      setResults(chunks);
    } catch (err: unknown) {
      setError(
        (err as Error).message ||
          'Không thể tra cứu ngữ nghĩa RAG. Vui lòng kiểm tra lại tài liệu đã tải lên.'
      );
      setResults(null);
    } finally {
      setIsSearching(false);
    }
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              Tra cứu & Kiểm tra Ngữ nghĩa RAG
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Thử nghiệm truy xuất vector ngữ nghĩa từ các đoạn văn bản (chunks) giáo trình
              và tài liệu đã index cho từng chủ đề.
            </p>
          </div>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-500" />
                Chọn Chủ đề
              </label>
              {topics.length === 0 ? (
                <div className="px-3.5 py-2.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl">
                  Chưa có chủ đề nào. Tạo chủ đề ở tab &quot;Chủ đề&quot; trước.
                </div>
              ) : (
                <select
                  value={selectedTopicId}
                  onChange={(e) => setSelectedTopicId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-800 font-medium"
                >
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-cyan-500" />
                Nội dung / Câu hỏi cần tra cứu ngữ nghĩa
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ví dụ: Nguyên lý đóng gói (Encapsulation) trong OOP, Thuật toán Dijkstra..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-800"
                />
                <button
                  type="submit"
                  disabled={isSearching || topics.length === 0 || !query.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors whitespace-nowrap"
                >
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Truy xuất
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </form>
      </div>

      {/* Results Section */}
      {results !== null && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span>Kết quả truy xuất</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-800">
                {results.length} đoạn văn bản (chunks)
              </span>
            </h3>
            <span className="text-xs text-slate-400">
              Mô hình embedding: Qwen2.5 / Sentence-Transformers (Top {results.length})
            </span>
          </div>

          {results.length === 0 ? (
            <div className="text-center py-12 px-4 bg-white rounded-2xl border border-dashed border-slate-300">
              <Search className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-600">
                Không tìm thấy đoạn văn bản phù hợp
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Hãy thử đổi từ khóa tra cứu hoặc kiểm tra xem các chương liên kết với chủ đề này đã hoàn tất xử lý (trạng thái READY) chưa.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((chunk, index) => (
                <div
                  key={chunk.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-cyan-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-2.5 pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-900 text-white">
                        #{index + 1}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        <BookOpen className="w-3 h-3" />
                        Trang / Slide {chunk.page}
                      </span>
                      {chunk.heading && (
                        <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {chunk.heading}
                        </span>
                      )}
                      <span className="text-[11px] font-mono text-slate-400">
                        Chunk ID: {chunk.id.slice(0, 8)}
                      </span>
                    </div>

                    <button
                      onClick={() => copyToClipboard(chunk.id, chunk.content)}
                      className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 transition-colors"
                      title="Sao chép nội dung"
                    >
                      {copiedId === chunk.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600 font-medium">Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Sao chép</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-sm text-slate-700 leading-relaxed font-normal whitespace-pre-wrap font-sans bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                    {chunk.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Info Card */}
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2">
        <div className="flex items-center gap-2 font-bold text-slate-700">
          <HelpCircle className="w-4 h-4 text-cyan-600" />
          <span>Cơ chế RAG trong Hệ thống Vấn đáp AI:</span>
        </div>
        <p className="leading-relaxed">
          1. <strong>Tạo đề thi tự động</strong>: Khi giáo viên bấm sinh câu hỏi, hệ thống sẽ tự động dùng RAG để lấy các đoạn văn bản chính xác nhất từ giáo trình môn học làm ngữ cảnh (Ground Truth) để LLM sinh câu hỏi.
        </p>
        <p className="leading-relaxed">
          2. <strong>Gợi ý thuật ngữ tiếng Anh</strong>: AI phân tích các chunk tài liệu liên quan để trích xuất các từ vựng và thuật ngữ chuyên ngành tương ứng.
        </p>
        <p className="leading-relaxed">
          3. <strong>Hậu kiểm chấm thi</strong>: Thí sinh trả lời câu hỏi sẽ được AI đối chiếu câu trả lời với chính các đoạn kiến thức này để chấm điểm tính chính xác về mặt nội dung.
        </p>
      </div>
    </div>
  );
}
