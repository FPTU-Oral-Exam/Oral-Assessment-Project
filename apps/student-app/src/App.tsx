import React, { useState } from 'react';
import type { StudentExam } from '@oralai/shared';
import { useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';
import { ExamListPage } from './pages/ExamListPage';
import { DeviceCheckPage } from './pages/DeviceCheckPage';
import { ExamRoomPage } from './pages/ExamRoomPage';
import { ResultsPage } from './pages/ResultsPage';
import { api } from './lib/api';

import { stopGlobalMedia } from './hooks/useMediaDevices';

type Page = 'login' | 'exam-list' | 'device-check' | 'exam-room' | 'results';

const App: React.FC = () => {
  const { login, logout, isAuthenticated } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('login');
  const [sessionId, setSessionId] = useState<string>('');
  const [selectedExam, setSelectedExam] = useState<StudentExam | null>(null);

  const handleLogin = (authToken: string, authUser: import('@oralai/shared').User) => {
    api.setToken(authToken);
    login(authToken, authUser);
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
    setCurrentPage('exam-list');
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
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
