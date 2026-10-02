import { useState, useCallback } from 'react';
import { ExamSession, QuestionAttempt, SessionStatus, AttemptStatus } from '@oralai/shared';

export interface UseExamSessionResult {
  session: ExamSession | null;
  isLoading: boolean;
  error: string | null;
  refreshSession: (sessionId: string) => Promise<void>;
  startAttempt: (questionSequence: number) => Promise<QuestionAttempt>;
  submitAttempt: (attemptId: string, uploadId: string) => Promise<void>;
  finishSession: (sessionId: string) => Promise<void>;
  goToQuestion: (sequence: number) => Promise<void>;
}

export function useExamSession(): UseExamSessionResult {
  const [session, setSession] = useState<ExamSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getBaseUrl = (): string => {
    return import.meta.env.VITE_API_URL || 'http://localhost:8000';
  };

  const refreshSession = useCallback(async (sessionId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${getBaseUrl()}/api/sessions/${sessionId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch session');
      }

      const data = await response.json();
      setSession(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load session';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startAttempt = useCallback(async (questionSequence: number): Promise<QuestionAttempt> => {
    if (!session) {
      throw new Error('No active session');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${getBaseUrl()}/api/sessions/${session.id}/questions/${questionSequence}/attempts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to start attempt');
      }

      const attempt: QuestionAttempt = await response.json();

      // Update session with new current attempt
      setSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          current_attempt: attempt,
          answered_count: prev.answered_count + 1,
        };
      });

      return attempt;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start attempt';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  const submitAttempt = useCallback(async (attemptId: string, uploadId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${getBaseUrl()}/api/attempts/${attemptId}/submit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ upload_id: uploadId }),
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to submit attempt');
      }

      // Refresh session to get updated attempt status
      if (session) {
        await refreshSession(session.id);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit attempt';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [session, refreshSession]);

  const finishSession = useCallback(async (sessionId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${getBaseUrl()}/api/sessions/${sessionId}/finish`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to finish session');
      }

      // Clear session
      setSession(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to finish session';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const goToQuestion = useCallback(async (sequence: number): Promise<void> => {
    if (!session) {
      throw new Error('No active session');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${getBaseUrl()}/api/sessions/${session.id}/questions/${sequence}`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load question');
      }

      const questionAttempt: QuestionAttempt = await response.json();

      setSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          current_attempt: questionAttempt,
        };
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to go to question';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  return {
    session,
    isLoading,
    error,
    refreshSession,
    startAttempt,
    submitAttempt,
    finishSession,
    goToQuestion,
  };
}
