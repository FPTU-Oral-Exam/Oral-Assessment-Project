import { useState, useRef, useCallback } from 'react';

export interface UseRecordingResult {
  isRecording: boolean;
  duration: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob[]>;
  audioBlobs: Blob[];
  clearBlobs: () => void;
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

  const startRecording = useCallback(async (): Promise<void> => {
    try {
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
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

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
    return new Promise((resolve, reject) => {
      if (!mediaRecorderRef.current) {
        reject(new Error('No recording in progress'));
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

      if (mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      } else {
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
