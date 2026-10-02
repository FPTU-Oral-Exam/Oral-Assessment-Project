import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';
import { ExamListPage } from './pages/ExamListPage';
import { DeviceCheckPage } from './pages/DeviceCheckPage';
import { ExamRoomPage } from './pages/ExamRoomPage';
import { api } from './lib/api';

type Page = 'login' | 'exam-list' | 'device-check' | 'exam-room';

const App: React.FC = () => {
  const { login, logout, isAuthenticated } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('login');
  const [sessionId, setSessionId] = useState<string>('');

  const handleLogin = (authToken: string, authUser: import('@oralai/shared').User) => {
    api.setToken(authToken);
    login(authToken, authUser);
  };

  const handleLogout = () => {
    api.clearToken();
    logout();
    setCurrentPage('login');
  };

  const handleStartExam = (newSessionId: string) => {
    setSessionId(newSessionId);
    setCurrentPage('device-check');
  };

  const handleDeviceCheckPass = () => {
    console.log('Device check passed, starting exam for session:', sessionId);
    setCurrentPage('exam-room');
  };

  const handleDeviceCheckBack = () => {
    setCurrentPage('exam-list');
  };

  const handleExamFinish = () => {
    setSessionId('');
    setCurrentPage('exam-list');
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
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
      onLogout={handleLogout}
    />
  );
};

export default App;
