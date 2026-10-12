import { useState, useRef, useCallback } from 'react';

export interface UseRecordingResult {
  isRecording: boolean;
  duration: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob[]>;
  audioBlobs: Blob[];
  clearBlobs: () => void;
}

export async function createCleanAudioBlob(blobs: Blob[]): Promise<Blob> {
  if (blobs.length === 0) {
    return new Blob([], { type: 'audio/webm' });
  }
  const combined = new Blob(blobs, { type: 'audio/webm' });
  try {
    const buffer = await combined.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // EBML magic bytes: 0x1A, 0x45, 0xDF, 0xA3
    if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
      return combined;
    }

    // Scan up to 128KB to find where the true EBML header begins
    const maxScan = Math.min(bytes.length - 4, 131072);
    for (let i = 0; i < maxScan; i++) {
      if (bytes[i] === 0x1a && bytes[i + 1] === 0x45 && bytes[i + 2] === 0xdf && bytes[i + 3] === 0xa3) {
        console.warn(`Stripped ${i} corrupted preamble bytes from WebM recording`);
        return combined.slice(i, combined.size, 'audio/webm');
      }
    }
  } catch (err) {
    console.error('Failed to parse WebM header, returning original blob:', err);
  }

  return combined;
}

export function useRecording(activeStream?: MediaStream | null): UseRecordingResult {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlobs, setAudioBlobs] = useState<Blob[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const internalStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const sessionCountRef = useRef<number>(0);

  const startRecording = useCallback(async (): Promise<void> => {
    try {
      const sessionId = ++sessionCountRef.current;

      // 1. If an existing recorder is running, stop it and clear events
      if (mediaRecorderRef.current) {
        const oldRecorder = mediaRecorderRef.current;
        oldRecorder.ondataavailable = null;
        oldRecorder.onstop = null;
        if (oldRecorder.state !== 'inactive') {
          try {
            oldRecorder.stop();
          } catch {
            // ignore
          }
        }
        mediaRecorderRef.current = null;
      }

      // 2. Clear chunks freshly
      chunksRef.current = [];

      let streamToUse: MediaStream;
      if (activeStream && activeStream.getAudioTracks().length > 0) {
        // Reuse live audio track from existing stream without interrupting camera
        streamToUse = new MediaStream(activeStream.getAudioTracks());
      } else {
        streamToUse = await navigator.mediaDevices.getUserMedia({ audio: true });
        internalStreamRef.current = streamToUse;
      }

      const mimeType = ['audio/webm;codecs=opus', 'audio/webm'].find((t) =>
        MediaRecorder.isTypeSupported(t),
      ) || 'audio/webm';

      const mediaRecorder = new MediaRecorder(streamToUse, { mimeType });

      mediaRecorder.ondataavailable = (event) => {
        if (
          sessionCountRef.current === sessionId &&
          mediaRecorderRef.current === mediaRecorder &&
          event.data &&
          event.data.size > 0
        ) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250);

      startTimeRef.current = Date.now();
      setIsRecording(true);
      setDuration(0);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 100);
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }, [activeStream]);

  const stopRecording = useCallback(async (): Promise<Blob[]> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        setIsRecording(false);
        resolve([...chunksRef.current]);
        return;
      }

      const mediaRecorder = mediaRecorderRef.current;

      mediaRecorder.onstop = () => {
        // Only stop internal fallback streams, never the student's active proctoring stream
        if (internalStreamRef.current) {
          internalStreamRef.current.getTracks().forEach((track) => track.stop());
          internalStreamRef.current = null;
        }

        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        const blobs = [...chunksRef.current];
        setAudioBlobs(blobs);
        setIsRecording(false);
        resolve(blobs);
      };

      try {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.requestData();
        }
        mediaRecorder.stop();
      } catch (e) {
        console.warn('Error stopping MediaRecorder:', e);
        setIsRecording(false);
        resolve([...chunksRef.current]);
      }
    });
  }, []);

  const clearBlobs = useCallback(() => {
    setAudioBlobs([]);
    chunksRef.current = [];
    setDuration(0);
  }, []);

  return {
    isRecording,
    duration,
    startRecording,
    stopRecording,
    audioBlobs,
    clearBlobs,
  };
}
