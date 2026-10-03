// apps/student-app/src/hooks/useExamSession.ts
import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import type { ExamSession, QuestionAttempt } from '@oralai/shared';

export interface UseExamSessionResult {
  session: ExamSession | null;
  currentAttempt: QuestionAttempt | null;
  isLoading: boolean;
  error: string | null;
  initSession: (sessionKey: string) => Promise<void>;
  refreshSession: (sessionKey: string) => Promise<void>;
  startAttempt: (attemptKey: string) => Promise<QuestionAttempt>;
  submitAttempt: (
    attemptKey: string,
    transcript: string,
    sttConfidence: number
  ) => Promise<void>;
  finishSession: (sessionKey: string) => Promise<void>;
}

export function useExamSession(): UseExamSessionResult {
  const [session, setSession] = useState<ExamSession | null>(null);
  const [currentAttempt, setCurrentAttempt] = useState<QuestionAttempt | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initSession = useCallback(async (sessionKey: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Try to start the session (transitions from DEVICE_CHECK to IN_PROGRESS)
      try {
        const startData = await api.startSession(sessionKey);
        setSession(startData);
        setCurrentAttempt(startData.current_attempt || null);
        return;
      } catch (startErr) {
        console.warn('startSession notice (might already be started):', startErr);
      }

      // 2. Fetch session data
      const data = await api.getSession(sessionKey);
      setSession(data);
      setCurrentAttempt(data.current_attempt || null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load session';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshSession = useCallback(async (sessionKey: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.getSession(sessionKey);
      setSession(data);
      // Set current attempt from session response
      setCurrentAttempt(data.current_attempt || null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load session';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startAttempt = useCallback(async (attemptKey: string): Promise<QuestionAttempt> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await api.startAttempt(attemptKey);
      setCurrentAttempt(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start attempt';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const submitAttempt = useCallback(
    async (
      attemptKey: string,
      transcript: string,
      sttConfidence: number
    ): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        // Generate idempotency key
        const idempotencyKey = `${attemptKey}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

        await api.submitAttempt(attemptKey, transcript, sttConfidence, idempotencyKey);

        // Clear current attempt after submit
        setCurrentAttempt(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to submit attempt';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const finishSession = useCallback(async (sessionKey: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await api.finishSession(sessionKey);
      // Refresh to get final status
      await refreshSession(sessionKey);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to finish session';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshSession]);

  return {
    session,
    currentAttempt,
    isLoading,
    error,
    initSession,
    refreshSession,
    startAttempt,
    submitAttempt,
    finishSession,
  };
}
