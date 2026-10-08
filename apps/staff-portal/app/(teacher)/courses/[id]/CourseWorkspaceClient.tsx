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
  HelpCircle,
  GraduationCap,
} from 'lucide-react';
import { api } from '@/lib/api';
import OutcomesPanel, { Outcome } from './components/OutcomesPanel';
import TopicsPanel, { Topic } from './components/TopicsPanel';
import RubricsPanel from './components/RubricsPanel';
import ItemBankPanel, { QuestionItemData } from './components/ItemBankPanel';
import ExamsPanel from './components/ExamsPanel';
import CandidateRosterPanel from './components/CandidateRosterPanel';

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
  blueprint?: Array<{ topic_id: string; difficulty: string; count: number }>;
  time_limit?: number;
  question_count?: number;
  rubric_id?: string;
  max_attempts?: number;
  questions?: Array<{ text: string; english_terms?: Array<{ term: string; meaning: string }> }>;
  snapshot?: any;
}

export interface WorkspaceResponse {
  outcomes: Outcome[];
  topics: Topic[];
  rubrics: RubricItem[];
  exams: ExamItem[];
  items?: QuestionItemData[];
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
  const [mainTab, setMainTab] = useState<'knowledge' | 'rubric' | 'item_bank' | 'exams' | 'candidates'>('knowledge');
  const [knowledgeSubTab, setKnowledgeSubTab] = useState<'outcomes' | 'topics'>('outcomes');

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

  const itemsCount = (workspace.items || []).length;

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
                    : course?.status === 'DRAFT'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {course?.status === 'ACTIVE'
                  ? 'Đang hoạt động'
                  : course?.status === 'DRAFT'
                  ? 'Đang chuẩn bị'
                  : 'Lưu trữ'}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" /> Khung Master Blueprint Chuẩn
              </span>
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
          <div className="px-4 py-2.5 bg-blue-50/70 rounded-2xl border border-blue-100 text-center min-w-[80px]">
            <p className="text-lg font-black text-blue-700 leading-none">
              {itemsCount}
            </p>
            <p className="text-[11px] font-semibold text-blue-600 mt-1">Câu hỏi Bank</p>
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
          <Target className="w-4 h-4" />
          <span>01 · Chuẩn đầu ra & Chủ đề</span>
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
          onClick={() => setMainTab('item_bank')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            mainTab === 'item_bank'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>03 · Ngân hàng câu hỏi (Item Bank)</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">
            {itemsCount}
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
          <span>04 · Ma trận & Đề thi</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
            {workspace.exams.length}
          </span>
        </button>

        <button
          onClick={() => setMainTab('candidates')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            mainTab === 'candidates'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>05 · Thí sinh dự thi</span>
        </button>
      </div>

      {/* Main Tab 1: LO & Topics */}
      {mainTab === 'knowledge' && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl w-fit border border-slate-200/80 overflow-x-auto">
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
          </div>

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
              chapters={[]}
              documents={[]}
              editable={true}
              onReload={() => loadData(true)}
            />
          )}
        </div>
      )}

      {/* Main Tab 2: Tiêu chí Rubrics */}
      {mainTab === 'rubric' && (
        <RubricsPanel
          courseId={courseId}
          rubrics={workspace.rubrics as any}
          onRefresh={() => loadData(true)}
        />
      )}

      {/* Main Tab 3: Ngân hàng câu hỏi (Item Bank) */}
      {mainTab === 'item_bank' && (
        <ItemBankPanel
          courseId={courseId}
          items={workspace.items || []}
          topics={workspace.topics}
          outcomes={workspace.outcomes}
          editable={true}
          onReload={() => loadData(true)}
        />
      )}

      {/* Main Tab 4: Đề thi & Lắp ráp theo Ma trận */}
      {mainTab === 'exams' && (
        <ExamsPanel
          courseId={courseId}
          exams={workspace.exams as any}
          rubrics={workspace.rubrics as any}
          topics={workspace.topics.map((t) => ({ id: t.id, name: t.name }))}
          onRefresh={() => loadData(true)}
        />
      )}

      {/* Main Tab 5: Danh sách thí sinh dự thi */}
      {mainTab === 'candidates' && (
        <CandidateRosterPanel
          courseId={courseId}
        />
      )}
    </div>
  );
}
