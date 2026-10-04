'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Target,
  Layers,
  Sparkles,
  ClipboardList,
  Users,
  RefreshCw,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { api } from '@/lib/api';
import TextbookPanel, { Chapter, Doc } from './components/TextbookPanel';
import OutcomesPanel, { Outcome } from './components/OutcomesPanel';
import TopicsPanel, { Topic } from './components/TopicsPanel';
import RagSearchPanel from './components/RagSearchPanel';

export interface RubricCriterion {
  code: string;
  name: string;
  description: string;
  max_score: number;
  weight: number;
}

export interface RubricItem {
  id: string;
  name: string;
  version: number;
  criteria: RubricCriterion[];
}

export interface ExamItem {
  id: string;
  name: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  blueprint?: Array<{ topic_id: string; easy: number; medium: number; hard: number }>;
  time_limit?: number;
  rubric_id?: string;
  max_attempts?: number;
  questions?: Array<{ text: string; english_terms?: Array<{ term: string; meaning: string }> }>;
}

export interface WorkspaceResponse {
  outcomes: Outcome[];
  topics: Topic[];
  documents: Doc[];
  chapters: Chapter[];
  rubrics: RubricItem[];
  exams: ExamItem[];
}

interface CourseItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: string;
  owner_id?: string;
}

export default function CourseWorkspaceClient({ courseId }: { courseId: string }) {
  const [course, setCourse] = useState<CourseItem | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tab state
  const [mainTab, setMainTab] = useState<'knowledge' | 'rubric' | 'exams' | 'students'>('knowledge');
  const [knowledgeSubTab, setKnowledgeSubTab] = useState<'textbook' | 'outcomes' | 'topics' | 'rag'>('textbook');

  // Load Course and Workspace Data
  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [allCourses, wsData] = await Promise.all([
        api<CourseItem[]>('/admin/courses'),
        api<WorkspaceResponse>(`/admin/courses/${courseId}/workspace`),
      ]);

      const foundCourse = allCourses.find((c) => c.id === courseId);
      if (foundCourse) {
        setCourse(foundCourse);
      } else {
        // Fallback placeholder if not directly found in course list
        setCourse({
          id: courseId,
          code: 'COURSE',
          name: 'Không gian môn học',
          status: 'ACTIVE',
        });
      }

      setWorkspace(wsData);
    } catch (err: unknown) {
      console.error('Error loading course workspace:', err);
      setError((err as Error).message || 'Không thể tải dữ liệu không gian môn học.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-3">
        <Loader2 className="w-9 h-9 animate-spin text-indigo-600" />
        <p className="text-sm font-medium text-slate-500">Đang tải không gian làm việc môn học...</p>
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Không thể truy cập môn học</h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          {error || 'Bạn không có quyền giảng viên phụ trách môn học này hoặc môn học không tồn tại.'}
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
          </Link>
          <button
            onClick={() => loadData()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-xl text-sm font-medium text-white hover:bg-indigo-700 shadow-sm"
          >
            <RefreshCw className="w-4 h-4" /> Thử lại
          </button>
        </div>
      </div>
    );
  }

  const textbook = workspace.documents.find((d) => d.kind === 'TEXTBOOK');
  const isTextbookReady = textbook?.status === 'READY';

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link
            href="/courses"
            className="inline-flex items-center gap-1.5 font-medium hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Môn học phụ trách
          </Link>
          <span>/</span>
          <span className="font-semibold text-slate-800 font-mono">
            {course?.code}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Đang đồng bộ...' : 'Đồng bộ dữ liệu'}
          </button>
        </div>
      </div>

      {/* Course Banner Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-100">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {course?.code}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                  course?.status === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {course?.status === 'ACTIVE' ? 'Đang hoạt động' : 'Lưu trữ'}
              </span>
              {isTextbookReady ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Giáo trình Ready
                </span>
              ) : textbook ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                  <Clock className="w-3.5 h-3.5" /> Giáo trình {textbook.status}
                </span>
              ) : null}
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight mt-1.5">
              {course?.name}
            </h1>
            {course?.description && (
              <p className="text-sm text-slate-500 mt-1 max-w-3xl line-clamp-2">
                {course.description}
              </p>
            )}
          </div>
        </div>

        {/* Quick Counters */}
        <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto pb-1 lg:pb-0">
          <div className="px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-center min-w-[80px]">
            <p className="text-lg font-black text-slate-800 leading-none">
              {workspace.chapters.length}
            </p>
            <p className="text-[11px] font-semibold text-slate-400 mt-1">Chương</p>
          </div>
          <div className="px-4 py-2.5 bg-indigo-50/70 rounded-2xl border border-indigo-100 text-center min-w-[80px]">
            <p className="text-lg font-black text-indigo-700 leading-none">
              {workspace.outcomes.length}
            </p>
            <p className="text-[11px] font-semibold text-indigo-500 mt-1">Chuẩn LO</p>
          </div>
          <div className="px-4 py-2.5 bg-purple-50/70 rounded-2xl border border-purple-100 text-center min-w-[80px]">
            <p className="text-lg font-black text-purple-700 leading-none">
              {workspace.topics.length}
            </p>
            <p className="text-[11px] font-semibold text-purple-500 mt-1">Chủ đề</p>
          </div>
          <div className="px-4 py-2.5 bg-emerald-50/70 rounded-2xl border border-emerald-100 text-center min-w-[80px]">
            <p className="text-lg font-black text-emerald-700 leading-none">
              {workspace.rubrics.length}
            </p>
            <p className="text-[11px] font-semibold text-emerald-500 mt-1">Rubric</p>
          </div>
          <div className="px-4 py-2.5 bg-amber-50/70 rounded-2xl border border-amber-100 text-center min-w-[80px]">
            <p className="text-lg font-black text-amber-700 leading-none">
              {workspace.exams.length}
            </p>
            <p className="text-[11px] font-semibold text-amber-600 mt-1">Đề thi</p>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-1 sm:gap-4 overflow-x-auto select-none">
        <button
          onClick={() => setMainTab('knowledge')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            mainTab === 'knowledge'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>01 · Quản trị Kiến thức</span>
        </button>

        <button
          onClick={() => setMainTab('rubric')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            mainTab === 'rubric'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>02 · Tiêu chí Rubric</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
            {workspace.rubrics.length}
          </span>
        </button>

        <button
          onClick={() => setMainTab('exams')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            mainTab === 'exams'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>03 · Bài thi & Giao bài</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
            {workspace.exams.length}
          </span>
        </button>

        <button
          onClick={() => setMainTab('students')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            mainTab === 'students'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>04 · Lớp học phần</span>
        </button>
      </div>

      {/* Main Tab 1: Kiến thức & Tri thức môn học */}
      {mainTab === 'knowledge' && (
        <div className="space-y-6">
          {/* Subtabs for Knowledge */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl w-fit border border-slate-200/80 overflow-x-auto">
            <button
              onClick={() => setKnowledgeSubTab('textbook')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                knowledgeSubTab === 'textbook'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-blue-500" />
              <span>Giáo trình & Mục lục</span>
              {isTextbookReady && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setKnowledgeSubTab('outcomes')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                knowledgeSubTab === 'outcomes'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Target className="w-3.5 h-3.5 text-indigo-500" />
              <span>Chuẩn đầu ra (LO)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-indigo-100 text-indigo-700">
                {workspace.outcomes.length}
              </span>
            </button>

            <button
              onClick={() => setKnowledgeSubTab('topics')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                knowledgeSubTab === 'topics'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-purple-500" />
              <span>Chủ đề kiến thức</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-purple-100 text-purple-700">
                {workspace.topics.length}
              </span>
            </button>

            <button
              onClick={() => setKnowledgeSubTab('rag')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                knowledgeSubTab === 'rag'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
              <span>Tra cứu RAG</span>
            </button>
          </div>

          {/* Render Subtab Panel */}
          {knowledgeSubTab === 'textbook' && (
            <TextbookPanel
              courseId={courseId}
              documents={workspace.documents}
              chapters={workspace.chapters}
              editable={true}
              onReload={() => loadData(true)}
            />
          )}

          {knowledgeSubTab === 'outcomes' && (
            <OutcomesPanel
              courseId={courseId}
              outcomes={workspace.outcomes}
              editable={true}
              onReload={() => loadData(true)}
            />
          )}

          {knowledgeSubTab === 'topics' && (
            <TopicsPanel
              courseId={courseId}
              topics={workspace.topics}
              outcomes={workspace.outcomes}
              chapters={workspace.chapters}
              documents={workspace.documents}
              editable={true}
              onReload={() => loadData(true)}
            />
          )}

          {knowledgeSubTab === 'rag' && (
            <RagSearchPanel
              courseId={courseId}
              topics={workspace.topics}
            />
          )}
        </div>
      )}

      {/* Main Tab 2: Rubric (Giai đoạn 2 Preview) */}
      {mainTab === 'rubric' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">
                  Tiêu chí Rubric môn học ({workspace.rubrics.length})
                </h2>
              </div>
              <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                Các bộ tiêu chí đánh giá vấn đáp (Thang điểm quy đổi chuẩn 10). Mỗi bài thi được gắn với một Rubric để AI và Giảng viên chấm điểm độc lập.
              </p>
            </div>

            <Link
              href="/rubrics"
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium shadow-sm transition-colors whitespace-nowrap"
            >
              <ExternalLink className="w-4 h-4" />
              Mở trang quản trị Rubric
            </Link>
          </div>

          {workspace.rubrics.length === 0 ? (
            <div className="text-center py-12 px-4 bg-white rounded-2xl border border-dashed border-slate-300">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-700">Chưa có Rubric nào cho môn học</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-4">
                Rubric xác định các tiêu chí (ví dụ: Độ trôi chảy, Vốn từ vựng, Độ chính xác nội dung) và trọng số tương ứng.
              </p>
              <Link
                href="/rubrics"
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" /> Tạo Rubric mới
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workspace.rubrics.map((r) => (
                <div
                  key={r.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-300 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-slate-800 text-base">{r.name}</h3>
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Phiên bản v{r.version}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    {r.criteria?.map((c, i) => (
                      <div
                        key={i}
                        className="text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-slate-700 mr-2">{c.name}</span>
                          <span className="text-slate-500">{c.description}</span>
                        </div>
                        <span className="font-mono text-emerald-700 font-semibold flex-shrink-0 ml-2">
                          {c.weight}%
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="text-xs text-slate-400 font-mono">
                    ID: {r.id.slice(0, 8)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Tab 3: Bài thi & Giao bài (Giai đoạn 2 Preview) */}
      {mainTab === 'exams' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">
                  Bài thi vấn đáp ({workspace.exams.length})
                </h2>
              </div>
              <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                Quản lý các đề thi nháp, sinh câu hỏi bằng AI theo RAG, duyệt bảng gợi ý thuật ngữ tiếng Anh và giao bài cho lớp học phần.
              </p>
            </div>
          </div>

          {workspace.exams.length === 0 ? (
            <div className="text-center py-12 px-4 bg-white rounded-2xl border border-dashed border-slate-300">
              <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-700">Chưa có bài thi nào</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-4">
                Sau khi hoàn tất kho kiến thức (Giáo trình & Chủ đề) và Rubric, bạn có thể tạo đề thi vấn đáp được AI hỗ trợ sinh câu hỏi.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workspace.exams.map((exam) => (
                <div
                  key={exam.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 text-base">{exam.name}</h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${
                        exam.status === 'PUBLISHED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {exam.status === 'PUBLISHED' ? 'ĐÃ CÔNG BỐ' : 'BẢN NHÁP'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1">
                    <p>
                      <strong>Thời lượng:</strong> {exam.time_limit ? `${exam.time_limit} giây` : 'Không giới hạn'}
                    </p>
                    <p>
                      <strong>Số câu hỏi đã sinh:</strong> {exam.questions?.length || 0} câu
                    </p>
                  </div>

                  {exam.questions && exam.questions.length > 0 && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-2">
                      <p className="font-semibold text-slate-700">Xem trước câu hỏi:</p>
                      {exam.questions.slice(0, 2).map((q, idx) => (
                        <div key={idx} className="text-slate-600">
                          <span className="font-bold text-indigo-600 mr-1.5">Câu {idx + 1}:</span>
                          <span>{q.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Tab 4: Lớp học phần & Sinh viên */}
      {mainTab === 'students' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">
                Danh sách Sinh viên & Lớp học phần
              </h2>
            </div>
            <p className="text-sm text-slate-500">
              Sinh viên ghi danh vào môn học này sẽ nhận được thông báo làm bài khi giảng viên giao bài thi vấn đáp.
            </p>
          </div>

          <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center text-slate-500 text-sm">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">Quản lý lớp học phần & Giao bài</p>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Chức năng giao bài cho từng lớp học phần (ví dụ: SE1801, SE1802) và đồng bộ danh sách thí sinh dự thi sẽ được kích hoạt ở Giai đoạn 2.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
