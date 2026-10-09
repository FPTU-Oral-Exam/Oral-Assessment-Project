'use client';

import React, { useState, useMemo } from 'react';
import {
  HelpCircle,
  Plus,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  Clock,
  Layers,
  Target,
  Sparkles,
  FileSpreadsheet,
  Search,
  Filter,
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
  Tag,
  BookOpen,
  Download,
  UploadCloud,
  FileUp,
} from 'lucide-react';
import { teacherService } from '@/services';
import { Outcome } from './OutcomesPanel';
import { Topic } from './TopicsPanel';

export interface QuestionItemData {
  id: string;
  topic_id: string;
  learning_outcome_id?: string | null;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  prompt: string;
  expected_points: string[];
  key_terms: string[];
  status: 'DRAFT' | 'APPROVED';
  usage_count: number;
}

interface ItemBankPanelProps {
  courseId: string;
  items: QuestionItemData[];
  topics: Topic[];
  outcomes: Outcome[];
  editable?: boolean;
  onReload: () => Promise<void>;
}

export default function ItemBankPanel({
  courseId,
  items,
  topics,
  outcomes,
  editable = true,
  onReload,
}: ItemBankPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTopic, setFilterTopic] = useState<string>('ALL');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Modal Thêm câu hỏi
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Excel Import state
  const [importMode, setImportMode] = useState<'excel' | 'sample'>('excel');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{ imported_count: number; errors: string[] } | null>(null);

  // Form thêm câu hỏi
  const [formTopicId, setFormTopicId] = useState<string>(topics[0]?.id || '');
  const [formDifficulty, setFormDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [formPrompt, setFormPrompt] = useState('');
  const [formExpectedPoints, setFormExpectedPoints] = useState('');
  const [formKeyTerms, setFormKeyTerms] = useState('');

  // Map tra cứu
  const topicsMap = useMemo(() => {
    return topics.reduce((acc, t) => {
      acc[t.id] = t.name;
      return acc;
    }, {} as Record<string, string>);
  }, [topics]);

  const outcomesMap = useMemo(() => {
    return outcomes.reduce((acc, o) => {
      acc[o.code] = o.description;
      return acc;
    }, {} as Record<string, string>);
  }, [outcomes]);

  // Lọc danh sách
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchTopic = filterTopic === 'ALL' || item.topic_id === filterTopic;
      const matchDiff = filterDifficulty === 'ALL' || item.difficulty === filterDifficulty;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        item.prompt.toLowerCase().includes(q) ||
        item.key_terms.some((t) => t.toLowerCase().includes(q)) ||
        (topicsMap[item.topic_id] && topicsMap[item.topic_id].toLowerCase().includes(q));
      return matchTopic && matchDiff && matchQuery;
    });
  }, [items, filterTopic, filterDifficulty, searchQuery, topicsMap]);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPrompt.trim()) {
      setModalError('Vui lòng nhập nội dung câu hỏi.');
      return;
    }
    if (!formTopicId) {
      setModalError('Vui lòng chọn chủ đề kiến thức.');
      return;
    }

    try {
      setSubmitting(true);
      setModalError(null);

      const expectedList = formExpectedPoints
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const termsList = formKeyTerms
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await teacherService.createItem(courseId, {
        topic_id: formTopicId,
        difficulty: formDifficulty as 'EASY' | 'MEDIUM' | 'HARD',
        prompt: formPrompt.trim(),
        expected_points: expectedList,
        key_terms: termsList,
        status: 'APPROVED',
      });

      // Reset form
      setFormPrompt('');
      setFormExpectedPoints('');
      setFormKeyTerms('');
      setIsAddModalOpen(false);
      await onReload();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Lỗi khi lưu câu hỏi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (itemId: string, promptText: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa câu hỏi:\n"${promptText.slice(0, 80)}..."?`)) {
      return;
    }
    try {
      await teacherService.deleteItem(itemId);
      await onReload();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Không thể xóa câu hỏi');
    }
  };

  const handleSeedSampleQuestions = async () => {
    if (topics.length === 0) {
      alert('Vui lòng tạo ít nhất 1 Chủ đề (Topic) ở Tab 01 trước.');
      return;
    }
    const defaultTopicId = topics[0].id;
    const secondTopicId = topics[1]?.id || defaultTopicId;
    const thirdTopicId = topics[2]?.id || defaultTopicId;

    const sampleItems = [
      {
        topic_id: defaultTopicId,
        difficulty: 'EASY',
        prompt: 'Trình bày điều kiện cân bằng của cây AVL và giải thích ý nghĩa của chỉ số cân bằng (Balance Factor).',
        expected_points: [
          'Cây AVL là cây nhị phân tìm kiếm tự cân bằng theo chiều cao.',
          'Chỉ số cân bằng Balance Factor = chiều cao cây con trái trừ chiều cao cây con phải, phải thuộc {-1, 0, 1}.',
          'Nếu chênh lệch chiều cao vượt quá 1 thì cây bị mất cân bằng và cần thực hiện phép quay.',
        ],
        key_terms: ['AVL Tree', 'Balance Factor', 'Height-balanced', 'Rotation'],
        status: 'APPROVED',
      },
      {
        topic_id: defaultTopicId,
        difficulty: 'MEDIUM',
        prompt: 'Phân tích cơ chế quay đơn (Single Rotation) và quay kép (Double Rotation) khi cây AVL bị mất cân bằng.',
        expected_points: [
          'Quay đơn áp dụng cho trường hợp lệch Left-Left hoặc Right-Right.',
          'Quay kép áp dụng cho trường hợp lệch Left-Right hoặc Right-Left.',
          'Sau khi quay, tính chất cây nhị phân tìm kiếm vẫn được bảo toàn và chiều cao giảm xuống.',
        ],
        key_terms: ['Left Rotation', 'Right Rotation', 'Left-Right Rotation', 'Tree Balancing'],
        status: 'APPROVED',
      },
      {
        topic_id: secondTopicId,
        difficulty: 'MEDIUM',
        prompt: 'So sánh thuật toán BFS và DFS trên đồ thị về cấu trúc dữ liệu bổ trợ và ứng dụng tìm đường đi ngắn nhất.',
        expected_points: [
          'BFS sử dụng hàng đợi (Queue), duyệt theo từng tầng khoảng cách.',
          'DFS sử dụng ngăn xếp (Stack) hoặc đệ quy, duyệt sâu theo từng nhánh.',
          'BFS tìm được đường đi ngắn nhất trên đồ thị không có trọng số; DFS không đảm bảo tính chất này.',
        ],
        key_terms: ['Breadth-First Search', 'Depth-First Search', 'Queue', 'Stack', 'Shortest Path'],
        status: 'APPROVED',
      },
      {
        topic_id: thirdTopicId,
        difficulty: 'HARD',
        prompt: 'Hiện tượng va chạm (Collision) trong bảng băm là gì? So sánh 2 kỹ thuật Separate Chaining và Open Addressing.',
        expected_points: [
          'Va chạm xảy ra khi hai khóa khác nhau được hàm băm ánh xạ về cùng một chỉ số trong bảng.',
          'Separate Chaining dùng danh sách liên kết tại mỗi ô, chấp nhận hệ số tải lớn hơn 1.',
          'Open Addressing tìm ô trống kế tiếp (Linear/Quadratic probing), nhạy cảm với hiện tượng phân cụm (Clustering).',
        ],
        key_terms: ['Hash Table', 'Collision', 'Separate Chaining', 'Open Addressing', 'Load Factor'],
        status: 'APPROVED',
      },
    ];

    try {
      setSubmitting(true);
      await teacherService.importItems(courseId, { items: sampleItems });
      await onReload();
      setIsImportModalOpen(false);
      alert('Đã nạp thành công 4 câu hỏi mẫu chuẩn vào Ngân hàng!');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi khi nạp câu hỏi mẫu');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadTemplate = () => {
    window.open(`/api/admin/courses/${courseId}/items/export-template`, '_blank');
  };

  const handleUploadExcel = async () => {
    if (!selectedFile) {
      alert('Vui lòng chọn một file Excel (.xlsx) trước.');
      return;
    }
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      setSubmitting(true);
      setModalError(null);
      setImportResult(null);

      const res = await fetch(`/api/admin/courses/${courseId}/items/import-excel`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || data?.detail?.message || 'Lỗi khi import file Excel');
      }

      setImportResult(data);
      await onReload();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Lỗi khi import file Excel');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Ngân hàng câu hỏi (Item Bank)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Kho câu hỏi đã thẩm định do Ban Học thuật nạp vào. Hệ thống sẽ bốc câu hỏi từ đây theo Ma trận đề thi chuẩn (Blueprint).
              </p>
            </div>
          </div>
        </div>

        {editable && (
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition-colors shadow-sm"
              title="Tải template Excel chuẩn để soạn câu hỏi"
            >
              <Download className="w-4 h-4 text-blue-600" />
              Tải file mẫu Excel
            </button>
            <button
              onClick={() => {
                setImportMode('excel');
                setSelectedFile(null);
                setImportResult(null);
                setModalError(null);
                setIsImportModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl transition-colors shadow-sm shadow-emerald-100"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Import Excel (.xlsx)
            </button>
            <button
              onClick={() => {
                setFormTopicId(topics[0]?.id || '');
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl transition-colors shadow-sm shadow-indigo-100"
            >
              <Plus className="w-4 h-4" />
              Thêm câu hỏi mới
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo nội dung, thuật ngữ..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Topic Filter */}
          <select
            value={filterTopic}
            onChange={(e) => setFilterTopic(e.target.value)}
            className="text-xs py-2 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">Tất cả Chủ đề ({topics.length})</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Difficulty Filter */}
          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            className="text-xs py-2 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">Mức độ tư duy (Tất cả)</option>
            <option value="EASY">Nhận biết (EASY)</option>
            <option value="MEDIUM">Thông hiểu (MEDIUM)</option>
            <option value="HARD">Vận dụng / Phân tích (HARD)</option>
          </select>
        </div>
      </div>

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-300 text-center space-y-3">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto">
            <HelpCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Chưa có câu hỏi nào trong Ngân hàng</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Theo nguyên tắc khảo thí chuẩn mực, giảng viên nạp sẵn các câu hỏi đã thẩm định để hệ thống tự động bốc vào đề thi.
          </p>
          {editable && (
            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={handleSeedSampleQuestions}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 transition-colors"
              >
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Nạp nhanh câu hỏi mẫu CSD201
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item, index) => {
            const isExpanded = expandedId === item.id;
            return (
              <div
                key={item.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-slate-300 shadow-sm transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          {topicsMap[item.topic_id] || 'Chủ đề'}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                            item.difficulty === 'EASY'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : item.difficulty === 'MEDIUM'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {item.difficulty === 'EASY'
                            ? 'Nhận biết (EASY)'
                            : item.difficulty === 'MEDIUM'
                            ? 'Thông hiểu (MEDIUM)'
                            : 'Vận dụng (HARD)'}
                        </span>
                        {item.usage_count > 0 && (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-100 text-slate-600">
                            Đã bốc vào {item.usage_count} đề thi
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-slate-800 leading-relaxed">
                        {item.prompt}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-xs font-medium flex items-center gap-1"
                      title="Xem đáp án & thuật ngữ"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    {editable && (
                      <button
                        onClick={() => handleDeleteItem(item.id, item.prompt)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Xóa câu hỏi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Details: Expected Points & Key Terms */}
                {isExpanded && (
                  <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 bg-slate-50/80 rounded-xl space-y-1.5">
                      <p className="font-bold text-slate-700 flex items-center gap-1.5 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Ý trả lời cốt lõi (Expected Points):
                      </p>
                      {item.expected_points && item.expected_points.length > 0 ? (
                        <ul className="list-disc list-inside space-y-1 text-slate-600 leading-relaxed pl-1">
                          {item.expected_points.map((pt, pIdx) => (
                            <li key={pIdx}>{pt}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-slate-400 italic">Chưa cấu hình ý cốt lõi.</p>
                      )}
                    </div>

                    <div className="p-3.5 bg-slate-50/80 rounded-xl space-y-1.5">
                      <p className="font-bold text-slate-700 flex items-center gap-1.5 text-[11px]">
                        <Tag className="w-3.5 h-3.5 text-indigo-600" />
                        Thuật ngữ chuyên môn (Key Terms):
                      </p>
                      {item.key_terms && item.key_terms.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {item.key_terms.map((term, tIdx) => (
                            <span
                              key={tIdx}
                              className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-mono text-[11px] text-slate-700 shadow-2xs"
                            >
                              {term}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-400 italic">Chưa có thuật ngữ yêu cầu.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Thêm câu hỏi */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-800 text-base">Thêm câu hỏi vào Ngân hàng</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="p-6 overflow-y-auto space-y-4 text-xs">
              {modalError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Chủ đề kiến thức *</label>
                  <select
                    value={formTopicId}
                    onChange={(e) => setFormTopicId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  >
                    {topics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Mức độ tư duy *</label>
                  <select
                    value={formDifficulty}
                    onChange={(e) => setFormDifficulty(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="EASY">Nhận biết (EASY)</option>
                    <option value="MEDIUM">Thông hiểu (MEDIUM)</option>
                    <option value="HARD">Vận dụng / Phân tích (HARD)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Nội dung câu hỏi vấn đáp *</label>
                <textarea
                  rows={3}
                  value={formPrompt}
                  onChange={(e) => setFormPrompt(e.target.value)}
                  placeholder="Ví dụ: Trình bày cơ chế cân bằng của cây AVL khi thêm một nút mới..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">
                  Ý trả lời cốt lõi / Đáp án chuẩn (Mỗi ý một dòng)
                </label>
                <textarea
                  rows={3}
                  value={formExpectedPoints}
                  onChange={(e) => setFormExpectedPoints(e.target.value)}
                  placeholder="- Ý 1: Chỉ số cân bằng nằm trong {-1, 0, 1}&#10;- Ý 2: Quay trái khi lệch phải-phải"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono text-[11px]"
                />
                <p className="text-[11px] text-slate-400">
                  AI sẽ đối chiếu câu trả lời của sinh viên với các ý này kết hợp cùng Rubric môn học để chấm điểm.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">
                  Thuật ngữ chuyên môn yêu cầu (Phân cách bằng dấu phẩy)
                </label>
                <input
                  type="text"
                  value={formKeyTerms}
                  onChange={(e) => setFormKeyTerms(e.target.value)}
                  placeholder="AVL Tree, Balance Factor, Rotation"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Lưu vào Ngân hàng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nạp câu hỏi (Excel hoặc Mẫu) */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Import Ngân hàng câu hỏi</h3>
                  <p className="text-[11px] text-slate-500">Nạp danh sách câu hỏi thẩm định cho môn học</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportResult(null);
                  setSelectedFile(null);
                  setModalError(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Tabs */}
            <div className="px-6 pt-3 flex gap-2 border-b border-slate-100 bg-slate-50/40">
              <button
                type="button"
                onClick={() => {
                  setImportMode('excel');
                  setModalError(null);
                }}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
                  importMode === 'excel'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Tải lên File Excel (.xlsx)
              </button>
              <button
                type="button"
                onClick={() => {
                  setImportMode('sample');
                  setModalError(null);
                }}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
                  importMode === 'sample'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Bộ 4 câu hỏi mẫu CSD201
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {importResult && (
                <div className="space-y-2">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>
                      Đã nạp thành công <strong>{importResult.imported_count}</strong> câu hỏi vào Ngân hàng!
                    </span>
                  </div>
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 space-y-1">
                      <p className="font-bold">Một số dòng bị bỏ qua do lỗi:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                        {importResult.errors.map((e, idx) => (
                          <li key={idx}>{e}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {importMode === 'excel' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3.5 bg-blue-50/70 border border-blue-100 rounded-2xl">
                    <div className="space-y-0.5">
                      <p className="font-bold text-blue-900">Chưa có file mẫu Excel?</p>
                      <p className="text-blue-700 text-[11px]">
                        Tải file template chuẩn (có sẵn danh mục Topic & LO của môn để copy):
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Tải mẫu .xlsx
                    </button>
                  </div>

                  {/* Dropzone */}
                  <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-emerald-50/20 group">
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedFile(file);
                          setModalError(null);
                          setImportResult(null);
                        }
                      }}
                    />
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    {selectedFile ? (
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{selectedFile.name}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {(selectedFile.size / 1024).toFixed(1)} KB — Bấm vào đây để chọn lại file khác
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-bold text-slate-700">Bấm để chọn file Excel (.xlsx)</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Hỗ trợ định dạng Microsoft Excel chuẩn</p>
                      </div>
                    )}
                  </label>

                  <div className="flex justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsImportModalOpen(false)}
                      className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                    >
                      Đóng
                    </button>
                    <button
                      type="button"
                      onClick={handleUploadExcel}
                      disabled={!selectedFile || submitting}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold disabled:opacity-40 transition-colors flex items-center gap-1.5 shadow-sm shadow-emerald-200"
                    >
                      {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <FileUp className="w-4 h-4" />
                      Tiến hành Import
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-slate-600 leading-relaxed">
                    Hệ thống sẽ tự động nạp sẵn 4 câu hỏi chuẩn hóa môn CSD201 (Cây AVL, Thuật toán Đồ thị, Bảng băm) kèm đầy đủ ý trả lời cốt lõi và từ khóa chuyên môn.
                  </p>

                  <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-2xl space-y-2">
                    <p className="font-bold text-emerald-800">Bộ câu hỏi mẫu thẩm định:</p>
                    <ul className="list-disc list-inside text-emerald-700 space-y-1 text-[11px]">
                      <li>Điều kiện cân bằng cây AVL (Nhận biết)</li>
                      <li>Cơ chế quay đơn và quay kép cây AVL (Thông hiểu)</li>
                      <li>So sánh thuật toán BFS vs DFS trên đồ thị (Thông hiểu)</li>
                      <li>Va chạm Collision & Xử lý va chạm Bảng băm (Vận dụng)</li>
                    </ul>
                  </div>

                  <div className="flex justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsImportModalOpen(false)}
                      className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                    >
                      Đóng
                    </button>
                    <button
                      type="button"
                      onClick={handleSeedSampleQuestions}
                      disabled={submitting}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-sm shadow-emerald-100"
                    >
                      {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Nạp 4 câu hỏi này ngay
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
