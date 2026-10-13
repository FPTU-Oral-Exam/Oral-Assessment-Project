import React, { useState } from 'react';
import type { StudentExam } from '@oralai/shared';
import { useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';
import { ExamListPage } from './pages/ExamListPage';
import { DeviceCheckPage } from './pages/DeviceCheckPage';
import { ExamRoomPage } from './pages/ExamRoomPage';
import { ResultsPage } from './pages/ResultsPage';
import { CongratulationsPage } from './pages/CongratulationsPage';
import { api } from './lib/api';

import { stopGlobalMedia } from './hooks/useMediaDevices';

type Page = 'login' | 'exam-list' | 'device-check' | 'exam-room' | 'results' | 'congratulations';

const App: React.FC = () => {
  const { login, logout, isAuthenticated } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('login');
  const [sessionId, setSessionId] = useState<string>('');
  const [selectedExam, setSelectedExam] = useState<StudentExam | null>(null);

  const handleLogin = async (authToken: string, authUser: import('@oralai/shared').User, examCode?: string) => {
    api.setToken(authToken);
    login(authToken, authUser);

    try {
      const availableExams = await api.getAvailableExams();
      // Tìm bài thi PTE Speaking Practice Test 1 (hoặc theo mã nếu có)
      const pteExam = availableExams.find((e) => {
        const examName = (e.name || (e as any).title || '').toLowerCase();
        const titleMatch = examName.includes('pte');
        const codeMatch = examCode ? e.id.toLowerCase().includes(examCode.toLowerCase()) || examName.includes(examCode.toLowerCase()) : false;
        return codeMatch || titleMatch;
      }) || availableExams[0];

      if (pteExam) {
        setSelectedExam(pteExam);
        // Tạo attempt mới để vào thi ngay
        const session = await api.createSession(pteExam.id, true);
        if (session && session.id) {
          setSessionId(session.id);
          setCurrentPage('exam-room');
          return;
        }
      }
    } catch (err) {
      console.warn('Auto-start exam failed, falling back to exam list:', err);
    }

    setCurrentPage('exam-list');
  };

  const handleLogout = () => {
    stopGlobalMedia();
    api.clearToken();
    logout();
    setCurrentPage('login');
  };

  const handleStartExam = (newSessionId: string) => {
    setSessionId(newSessionId);
    setCurrentPage('device-check');
  };

  const handleViewResults = (viewSessionId: string, exam: StudentExam) => {
    setSessionId(viewSessionId);
    setSelectedExam(exam);
    setCurrentPage('results');
  };

  const handleRetakeExam = async () => {
    if (!selectedExam) return;
    try {
      // Create a fresh attempt session for practice exam
      const newSession = await api.createSession(selectedExam.id, true);
      setSessionId(newSession.id);
      setCurrentPage('device-check');
    } catch (err) {
      console.error('Failed to create new session for retake:', err);
    }
  };

  const handleDeviceCheckPass = () => {
    console.log('Device check passed, starting exam for session:', sessionId);
    setCurrentPage('exam-room');
  };

  const handleDeviceCheckBack = () => {
    stopGlobalMedia();
    setCurrentPage('exam-list');
  };

  const handleExamFinish = () => {
    stopGlobalMedia();
    setSessionId('');
    setCurrentPage('congratulations');
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (currentPage === 'congratulations') {
    return <CongratulationsPage onExit={handleLogout} />;
  }

  if (currentPage === 'results') {
    return (
      <ResultsPage
        sessionId={sessionId}
        onBack={() => setCurrentPage('exam-list')}
        onRetake={selectedExam?.practice ? handleRetakeExam : undefined}
        onLogout={handleLogout}
      />
    );
  }

  if (currentPage === 'exam-room') {
    return (
      <ExamRoomPage
        sessionId={sessionId}
        onFinish={handleExamFinish}
      />
    );
  }

  if (currentPage === 'device-check') {
    return (
      <DeviceCheckPage
        sessionId={sessionId}
        onPass={handleDeviceCheckPass}
        onBack={handleDeviceCheckBack}
      />
    );
  }

  return (
    <ExamListPage
      onStartExam={handleStartExam}
      onViewResults={handleViewResults}
      onLogout={handleLogout}
    />
  );
};

export default App;
